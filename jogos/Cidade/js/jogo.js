/* ==========================================================================
   jogo.js — a partida do ALUNO
   --------------------------------------------------------------------------
   Responsável por: montar a cidade, colocar as soluções, calcular os
   indicadores e a pontuação, salvar no navegador e mandar para o Firebase.

   Se a internet cair, NADA para: o aluno continua jogando e a pontuação é
   enviada assim que a conexão voltar.
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  /* Nomes curtos das zonas, do jeito que a criança entende */
  var NOME_ZONA = {
    rua: 'Ruas', residencial: 'Casas', comercial: 'Lojas',
    industrial: 'Fábricas', verde: 'Parques'
  };

  /* ------------------------------------------------------------------
     ESTADO DA PARTIDA DO ALUNO
     ------------------------------------------------------------------ */
  var e = {
    sala: null, idJogador: null, nome: null,
    mapa: null,
    indicadores: null,
    orcamento: 0,
    colocacoes: [],       // [{x, y, id, icone, custo, deltas:{}}]
    contagem: {},         // quantas vezes cada solução foi usada
    pontos: 0,
    selecionada: null,
    encerrada: false,
    explicadas: {},       // soluções que já mostraram a caixa de explicação
    rodando: false,
    precisaEnviar: false,
    tempo: 0
  };

  var canvas, ctx;
  var timerEnvio = null, timerStatus = null;
  var ultimoQuadro = 0, acumulado = 0;

  /* ==================================================================
     INÍCIO DA PARTIDA
     ================================================================== */
  function iniciar(sala, nome, idJogador) {
    e.sala = sala;
    e.nome = nome;
    e.idJogador = idJogador;
    e.encerrada = false;

    canvas = document.getElementById('mapa');
    ctx = canvas.getContext('2d');

    var salvo = carregarLocal(sala, nome);
    if (salvo) {
      // O aluno atualizou a página sem querer: devolvemos a cidade dele
      e.mapa = CI.mapa.criar(salvo.semente);
      e.indicadores = salvo.indicadores;
      e.orcamento = salvo.orcamento;
      e.colocacoes = salvo.colocacoes || [];
      e.contagem = salvo.contagem || {};
      e.explicadas = salvo.explicadas || {};
      CI.ui.aviso('Sua cidade foi recuperada!', 'ok');
    } else {
      e.mapa = CI.mapa.criar();
      e.indicadores = CI.INDICADORES_INICIAIS();
      e.orcamento = CI.ORCAMENTO_INICIAL;
      e.colocacoes = [];
      e.contagem = {};
      e.explicadas = {};
    }

    document.getElementById('chip-nome').textContent = nome;
    document.getElementById('chip-sala').textContent = sala;

    montarIndicadores(document.getElementById('lista-indicadores'));
    montarSolucoes();
    recalcular();
    atualizarTopo();

    e.selecionada = null;
    atualizarDica();

    // liga o envio periódico ao Firebase e a checagem do status da sala
    if (timerEnvio)  clearInterval(timerEnvio);
    if (timerStatus) clearInterval(timerStatus);
    timerEnvio  = setInterval(enviarSePreciso, 3000);
    timerStatus = setInterval(conferirStatus, 5000);

    // Salva já na entrada: assim, se o aluno atualizar a página, ele volta com o
    // MESMO id de jogador e não aparece duplicado no ranking do professor.
    salvarLocal();

    e.precisaEnviar = true;
    enviarSePreciso();

    comecarAnimacao();
  }

  /* ==================================================================
     PAINEL DE SOLUÇÕES (lista da direita)
     ================================================================== */
  function montarSolucoes() {
    var caixa = document.getElementById('lista-solucoes');
    caixa.innerHTML = '';

    CI.SOLUCOES.forEach(function (sol) {
      var botao = document.createElement('button');
      botao.className = 'solucao';
      botao.type = 'button';
      botao.setAttribute('data-id', sol.id);

      var zonas = sol.zonas.map(function (z) { return NOME_ZONA[z]; }).join(', ');

      var chips = '';
      CI.INDICADORES.forEach(function (ind) {
        var v = sol.efeitos[ind.id];
        if (!v) return;
        var ehBom = ind.melhorAlto ? (v > 0) : (v < 0);
        var seta = v > 0 ? '↑' : '↓';
        chips += '<span class="efeito ' + (ehBom ? 'bom' : 'ruim') + '">' +
                 ind.icone + ' ' + ind.nome.split(' ')[0] + ' ' + seta + '</span>';
      });

      botao.innerHTML =
        '<div class="ic">' + sol.icone + '</div>' +
        '<div>' +
          '<div class="titulo">' + sol.nome + '</div>' +
          '<div class="custo"><span class="preco">' + sol.custo + '</span> de verba &middot; ' + zonas + '</div>' +
          '<div class="efeitos">' + chips + '</div>' +
          '<div class="qtd"></div>' +
        '</div>';

      botao.addEventListener('click', function () { selecionar(sol.id); });
      caixa.appendChild(botao);
    });

    atualizarSolucoes();
  }

  /* Atualiza preços (que sobem quando repete), quantidades e o que está caro demais */
  function atualizarSolucoes() {
    CI.SOLUCOES.forEach(function (sol) {
      var botao = document.querySelector('.solucao[data-id="' + sol.id + '"]');
      if (!botao) return;

      var qtd = e.contagem[sol.id] || 0;
      var custo = CI.custoDaSolucao(sol, qtd);
      var caro = custo > e.orcamento;

      botao.querySelector('.preco').textContent = custo;
      botao.querySelector('.qtd').textContent = qtd > 0
        ? ('já construído ' + qtd + 'x — o benefício de repetir vai diminuindo')
        : '';

      botao.classList.toggle('cara', caro || e.encerrada);
      botao.classList.toggle('selecionada', e.selecionada === sol.id);
    });
  }

  function selecionar(id) {
    if (e.encerrada) { CI.ui.aviso('A partida foi encerrada pelo professor.', 'mau'); return; }

    var sol = acharSolucao(id);
    var custo = CI.custoDaSolucao(sol, e.contagem[id] || 0);
    if (custo > e.orcamento) {
      CI.ui.aviso('Verba insuficiente para ' + sol.nome + '.', 'mau');
      return;
    }

    e.selecionada = (e.selecionada === id) ? null : id;
    atualizarSolucoes();
    atualizarDica();
  }

  function acharSolucao(id) {
    for (var i = 0; i < CI.SOLUCOES.length; i++) {
      if (CI.SOLUCOES[i].id === id) return CI.SOLUCOES[i];
    }
    return null;
  }

  function atualizarDica() {
    var dica = document.getElementById('dica-mapa');
    if (e.encerrada) { dica.textContent = 'Partida encerrada. Veja o relatório da sua cidade!'; return; }
    if (!e.selecionada) { dica.textContent = 'Escolha uma solução na lista e toque no mapa.'; return; }
    var sol = acharSolucao(e.selecionada);
    var zonas = sol.zonas.map(function (z) { return NOME_ZONA[z]; }).join(' ou ');
    dica.textContent = sol.icone + ' ' + sol.nome + ' → toque em: ' + zonas + ' (os lugares que estão brilhando)';
  }

  /* ==================================================================
     COLOCAR UMA SOLUÇÃO NO MAPA
     ================================================================== */
  function cliqueNoMapa(evento) {
    if (e.encerrada) { CI.ui.aviso('A partida foi encerrada pelo professor.', 'mau'); return; }
    if (!e.selecionada) { CI.ui.aviso('Escolha primeiro uma solução na lista.'); return; }

    var alvo = CI.mapa.tileDoEvento(canvas, evento);
    if (!alvo) return;

    var sol = acharSolucao(e.selecionada);
    var zona = e.mapa.grid[alvo.y][alvo.x];

    if (ocupado(alvo.x, alvo.y)) { CI.ui.aviso('Aqui já tem uma solução.', 'mau'); return; }
    if (sol.zonas.indexOf(zona) === -1) {
      CI.ui.aviso(sol.nome + ' só pode ir em: ' +
        sol.zonas.map(function (z) { return NOME_ZONA[z]; }).join(' ou '), 'mau');
      return;
    }

    var qtd = e.contagem[sol.id] || 0;
    var custo = CI.custoDaSolucao(sol, qtd);
    if (custo > e.orcamento) { CI.ui.aviso('Verba insuficiente.', 'mau'); return; }

    aplicar(sol, alvo.x, alvo.y, custo, qtd);
  }

  function ocupado(x, y) {
    for (var i = 0; i < e.colocacoes.length; i++) {
      if (e.colocacoes[i].x === x && e.colocacoes[i].y === y) return true;
    }
    return false;
  }

  function aplicar(sol, x, y, custo, qtdAnterior) {
    var efeitos = CI.efeitosDaSolucao(sol, qtdAnterior);
    var deltasReais = {};

    // aplica cada efeito respeitando os limites 0 a 100
    CI.INDICADORES.forEach(function (ind) {
      var d = efeitos[ind.id];
      if (!d) return;
      var antes = e.indicadores[ind.id];
      var depois = Math.max(0, Math.min(100, antes + d));
      deltasReais[ind.id] = depois - antes;   // guardamos o valor REAL, para o "Desfazer" funcionar certinho
      e.indicadores[ind.id] = depois;
    });

    e.orcamento -= custo;
    e.contagem[sol.id] = qtdAnterior + 1;
    e.colocacoes.push({ x: x, y: y, id: sol.id, icone: sol.icone, custo: custo, deltas: deltasReais });

    CI.mapa.soltarParticulas(e.mapa, x, y);
    recalcular();
    atualizarTopo();
    atualizarSolucoes();
    piscarIndicadores(deltasReais);

    // Explicação completa na 1ª vez de cada solução; depois só um aviso rápido
    if (!e.explicadas[sol.id]) {
      e.explicadas[sol.id] = true;
      mostrarConsequencia(sol, deltasReais, qtdAnterior);
    } else {
      CI.ui.aviso(sol.icone + ' ' + resumoDeltas(deltasReais), 'ok');
    }

    // se acabou a verba, tira a seleção para não frustrar
    var proximo = CI.custoDaSolucao(sol, e.contagem[sol.id]);
    if (proximo > e.orcamento) { e.selecionada = null; atualizarSolucoes(); }
    atualizarDica();

    salvarLocal();
    e.precisaEnviar = true;
  }

  function resumoDeltas(deltas) {
    var partes = [];
    CI.INDICADORES.forEach(function (ind) {
      var d = deltas[ind.id];
      if (!d || Math.abs(d) < 0.5) return;
      partes.push(ind.icone + ' ' + (d > 0 ? '+' : '') + Math.round(d));
    });
    return partes.join('  ');
  }

  function mostrarConsequencia(sol, deltas, qtdAnterior) {
    var linhas = '';
    CI.INDICADORES.forEach(function (ind) {
      var d = deltas[ind.id];
      if (!d || Math.abs(d) < 0.5) return;
      var ehBom = ind.melhorAlto ? (d > 0) : (d < 0);
      linhas += '<div class="conseq"><span class="sinal" style="color:' +
        (ehBom ? 'var(--bom)' : 'var(--ruim)') + '">' + (d > 0 ? '+' : '') + Math.round(d) +
        '</span><span>' + ind.icone + ' ' + ind.nome + '</span></div>';
    });

    var aviso = qtdAnterior > 0
      ? '<p class="ajuda-peq">Você já tinha construído isso antes: o lado bom rende menos a cada repetição, mas os problemas continuam se somando.</p>'
      : '';

    CI.ui.modal({
      icone: sol.icone,
      titulo: sol.nome,
      corpo: '<p><b style="color:var(--bom)">O que melhora:</b> ' + sol.bom + '</p>' +
             '<p><b style="color:var(--ruim)">O que piora:</b> ' + sol.ruim + '</p>' +
             '<hr style="border:none;border-top:1px solid var(--grade);margin:12px 0">' +
             linhas + aviso,
      botoes: [{ texto: 'Entendi', classe: 'btn-verde' }]
    });
  }

  /* ==================================================================
     DESFAZER E REINICIAR
     ================================================================== */
  function desfazer() {
    if (e.encerrada) { CI.ui.aviso('A partida foi encerrada.', 'mau'); return; }
    if (!e.colocacoes.length) { CI.ui.aviso('Não há nada para desfazer.'); return; }

    var c = e.colocacoes.pop();
    for (var id in c.deltas) {
      if (Object.prototype.hasOwnProperty.call(c.deltas, id)) {
        e.indicadores[id] = Math.max(0, Math.min(100, e.indicadores[id] - c.deltas[id]));
      }
    }
    e.orcamento += c.custo;
    e.contagem[c.id] = Math.max(0, (e.contagem[c.id] || 1) - 1);

    recalcular();
    atualizarTopo();
    atualizarSolucoes();
    atualizarIndicadores();
    salvarLocal();
    e.precisaEnviar = true;
    CI.ui.aviso('Desfeito: ' + c.icone, 'ok');
  }

  function reiniciar() {
    CI.ui.modal({
      icone: '🔄',
      titulo: 'Reiniciar sua cidade?',
      corpo: '<p>Tudo o que você construiu será apagado e a verba volta ao valor inicial. O mapa continua o mesmo.</p>',
      botoes: [
        { texto: 'Não, voltar', classe: 'btn-neutro' },
        { texto: 'Sim, reiniciar', classe: 'btn-ambar', acao: function () {
            e.indicadores = CI.INDICADORES_INICIAIS();
            e.orcamento = CI.ORCAMENTO_INICIAL;
            e.colocacoes = [];
            e.contagem = {};
            e.selecionada = null;
            recalcular();
            atualizarTopo();
            atualizarSolucoes();
            atualizarIndicadores();
            atualizarDica();
            salvarLocal();
            e.precisaEnviar = true;
            CI.ui.aviso('Cidade reiniciada!', 'ok');
        } }
      ]
    });
  }

  /* ==================================================================
     INDICADORES E PONTUAÇÃO NA TELA
     ================================================================== */
  function montarIndicadores(caixa) {
    caixa.innerHTML = '';
    CI.INDICADORES.forEach(function (ind) {
      var div = document.createElement('div');
      div.className = 'indicador';
      div.setAttribute('data-ind', ind.id);
      div.innerHTML =
        '<div class="ic">' + ind.icone + '</div>' +
        '<div class="nome">' + ind.nome + (ind.melhorAlto ? '' : ' <i>(menor = melhor)</i>') + '</div>' +
        '<div class="trilho"><div class="barra" style="background:' + ind.cor + '"></div></div>' +
        '<div class="valor">0</div>';
      caixa.appendChild(div);
    });
    atualizarIndicadores(caixa);
  }

  function atualizarIndicadores(caixa) {
    caixa = caixa || document.getElementById('lista-indicadores');
    CI.INDICADORES.forEach(function (ind) {
      var div = caixa.querySelector('.indicador[data-ind="' + ind.id + '"]');
      if (!div) return;
      var v = Math.round(e.indicadores[ind.id]);
      div.querySelector('.barra').style.width = v + '%';
      div.querySelector('.valor').textContent = v;
    });
  }

  function piscarIndicadores(deltas) {
    atualizarIndicadores();
    var caixa = document.getElementById('lista-indicadores');
    for (var id in deltas) {
      if (!Object.prototype.hasOwnProperty.call(deltas, id)) continue;
      if (Math.abs(deltas[id]) < 0.5) continue;
      var div = caixa.querySelector('.indicador[data-ind="' + id + '"]');
      if (!div) continue;
      div.classList.remove('piscar');
      void div.offsetWidth;            // truque para reiniciar a animação
      div.classList.add('piscar');
    }
  }

  function recalcular() {
    e.pontos = CI.calcularPontuacao(e.indicadores, e.colocacoes.length);
    atualizarIndicadores();
  }

  function atualizarTopo() {
    document.getElementById('chip-orcamento').textContent = Math.round(e.orcamento);
    document.getElementById('chip-pontos').textContent = e.pontos;
    var chip = document.getElementById('chip-conexao');
    var ok = CI.firebase.estaOnline();
    chip.textContent = ok ? 'conectado' : 'sem internet (salvo aqui)';
    chip.style.borderColor = ok ? 'var(--verde)' : 'var(--vermelho)';
  }

  /* ==================================================================
     ANIMAÇÃO (carros e pessoas andando)
     ================================================================== */
  function comecarAnimacao() {
    if (e.rodando) return;
    e.rodando = true;
    ultimoQuadro = 0;
    requestAnimationFrame(quadro);
  }

  function quadro(agora) {
    if (!e.rodando) return;
    if (!ultimoQuadro) ultimoQuadro = agora;
    var dt = (agora - ultimoQuadro) / 1000;
    ultimoQuadro = agora;
    e.tempo += dt;

    CI.mapa.atualizarTransito(e.mapa, dt);

    // desenha no máximo ~30 vezes por segundo (economia em PC antigo)
    acumulado += dt;
    if (acumulado >= 0.033) {
      acumulado = 0;
      var sol = e.selecionada ? acharSolucao(e.selecionada) : null;
      var ocupados = {};
      e.colocacoes.forEach(function (c) { ocupados[c.x + ',' + c.y] = true; });

      CI.mapa.desenhar(ctx, e.mapa, {
        colocacoes: e.colocacoes,
        zonasValidas: sol ? sol.zonas : null,
        ocupados: ocupados,
        tempo: e.tempo
      });
    }
    requestAnimationFrame(quadro);
  }

  function pararAnimacao() { e.rodando = false; }

  /* ==================================================================
     SALVAR NO PRÓPRIO NAVEGADOR (funciona sem internet)
     ================================================================== */
  function chaveLocal(sala, nome) {
    return 'ci_v1_' + sala + '_' + String(nome).toLowerCase();
  }

  function salvarLocal() {
    try {
      localStorage.setItem(chaveLocal(e.sala, e.nome), JSON.stringify({
        semente: e.mapa.semente,
        indicadores: e.indicadores,
        orcamento: e.orcamento,
        colocacoes: e.colocacoes,
        contagem: e.contagem,
        explicadas: e.explicadas,
        idJogador: e.idJogador
      }));
    } catch (err) { /* navegador sem localStorage: tudo bem, só não salva */ }
  }

  function carregarLocal(sala, nome) {
    try {
      var txt = localStorage.getItem(chaveLocal(sala, nome));
      if (!txt) return null;
      var d = JSON.parse(txt);
      return (d && d.indicadores) ? d : null;
    } catch (err) { return null; }
  }

  /* ==================================================================
     ENVIO PARA O FIREBASE
     Caminho: cidade_inteligente/salas/{SALA}/jogadores/{ID}
     Sempre PATCH — nunca apaga nada de ninguém.
     ================================================================== */
  function enviarSePreciso() {
    if (!e.sala || !e.idJogador) return;
    if (!e.precisaEnviar) return;

    var dados = {
      nome: e.nome,
      pontuacao: e.pontos,
      solucoes: e.colocacoes.length,
      indicadores: {
        empregos: Math.round(e.indicadores.empregos),
        ambiente: Math.round(e.indicadores.ambiente),
        qualidade: Math.round(e.indicadores.qualidade),
        direitos: Math.round(e.indicadores.direitos),
        desigualdade: Math.round(e.indicadores.desigualdade)
      },
      atualizadoEm: Date.now()
    };

    e.precisaEnviar = false;
    CI.firebase.gravar('salas/' + e.sala + '/jogadores/' + e.idJogador, dados)
      .then(function (r) {
        if (!r.ok) e.precisaEnviar = true;   // deu errado: tenta de novo no próximo ciclo
        atualizarTopo();
      });
  }

  /* Confere se o professor já encerrou a partida */
  function conferirStatus() {
    if (!e.sala) return;
    CI.firebase.ler('salas/' + e.sala + '/status').then(function (r) {
      atualizarTopo();
      if (!r.ok) return;
      if (r.dados === 'encerrada' && !e.encerrada) {
        e.encerrada = true;
        e.selecionada = null;
        atualizarSolucoes();
        atualizarDica();
        mostrarRelatorio();
      }
    });
  }

  /* ==================================================================
     RELATÓRIO FINAL DA CIDADE DO ALUNO
     ================================================================== */
  function mostrarRelatorio() {
    var perfil = CI.perfilDaCidade(e.indicadores, e.colocacoes.length);

    document.getElementById('relatorio-perfil').textContent = perfil.emoji + ' ' + perfil.nome;
    document.getElementById('relatorio-texto').innerHTML = perfil.texto;
    document.getElementById('relatorio-pontos').textContent = e.pontos;

    montarIndicadores(document.getElementById('relatorio-indicadores'));
    atualizarIndicadores(document.getElementById('relatorio-indicadores'));

    var ol = document.getElementById('relatorio-perguntas');
    ol.innerHTML = '';
    perfil.perguntas.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = p;
      ol.appendChild(li);
    });

    // guarda o perfil no Firebase também (o professor pode comentar depois)
    if (e.sala && e.idJogador) {
      CI.firebase.gravar('salas/' + e.sala + '/jogadores/' + e.idJogador, {
        perfil: perfil.nome, pontuacao: e.pontos, atualizadoEm: Date.now()
      });
    }

    CI.ui.mostrarTela('tela-relatorio');
  }

  /* ==================================================================
     AJUDA (o tutorial pode ser revisto a qualquer momento)
     ================================================================== */
  function ajuda() {
    CI.ui.modal({
      icone: '❓',
      titulo: 'Como jogar',
      corpo:
        '<ul>' +
        '<li>Toque em uma <b>solução</b> da lista.</li>' +
        '<li>Toque em um lugar do mapa que estiver <b>brilhando</b>.</li>' +
        '<li>Cada solução tem um <b>lado bom</b> e um <b>lado ruim</b>.</li>' +
        '<li>Ganha quem tem a cidade mais <b>equilibrada</b>: olhe sempre o seu indicador mais baixo.</li>' +
        '<li>Repetir a mesma solução rende cada vez menos, mas os problemas continuam iguais.</li>' +
        '</ul>',
      botoes: [{ texto: 'Voltar a jogar', classe: 'btn-verde' }]
    });
  }

  /* ==================================================================
     LIGAÇÃO COM OS BOTÕES DA TELA
     ================================================================== */
  function ligarEventos() {
    var mapaCanvas = document.getElementById('mapa');

    /* Toque e clique:
       "pointerdown" atende mouse, dedo (celular/tablet) e caneta de uma vez só.
       Mesmo assim deixamos "click" e "touchstart" ligados como reserva, porque
       alguns navegadores antigos de escola não disparam eventos de ponteiro.
       O carimbo de tempo abaixo evita construir duas vezes no mesmo toque. */
    var jaUsaPonteiro = false;

    mapaCanvas.addEventListener('pointerdown', function (ev) {
      jaUsaPonteiro = true;          // este navegador tem eventos de ponteiro
      cliqueNoMapa(ev);
    });

    // Reservas: só entram em ação em navegadores que NÃO disparam pointerdown.
    mapaCanvas.addEventListener('click', function (ev) {
      if (jaUsaPonteiro) return;
      cliqueNoMapa(ev);
    });

    mapaCanvas.addEventListener('touchstart', function (ev) {
      if (jaUsaPonteiro) return;
      if (ev.touches && ev.touches[0]) {
        ev.preventDefault();
        cliqueNoMapa(ev.touches[0]);
      }
    }, { passive: false });

    document.getElementById('btn-desfazer').addEventListener('click', desfazer);
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);
    document.getElementById('btn-ajuda').addEventListener('click', ajuda);

    document.getElementById('btn-relatorio-voltar').addEventListener('click', function () {
      CI.ui.mostrarTela('tela-jogo');
    });
  }

  /* Interface pública do módulo */
  CI.jogo = {
    iniciar: iniciar,
    ligarEventos: ligarEventos,
    pararAnimacao: pararAnimacao,
    comecarAnimacao: comecarAnimacao,
    mostrarRelatorio: mostrarRelatorio,
    estado: e
  };

})();
