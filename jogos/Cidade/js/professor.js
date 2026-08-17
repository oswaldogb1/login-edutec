/* ==========================================================================
   professor.js — PAINEL DO PROFESSOR (feito para projetar no datashow)
   --------------------------------------------------------------------------
   O que faz:
     - cria a sala e mostra o código gigante para a turma copiar
     - lê o Firebase a cada 3 segundos e mostra a pontuação de cada aluno
       num gráfico de barras desenhado à mão no <canvas> (sem biblioteca)
     - mostra o ranking ao vivo
     - encerra a partida e comemora o vencedor

   Sobre o gráfico (decisões de leitura à distância):
     - Barras horizontais: nome grande do lado esquerdo, fácil de ler de longe.
     - TODAS as barras têm a MESMA cor. A cor não indica posição — quem está
       na frente é mostrado pela medalha 🥇🥈🥉 e pelo tamanho da barra.
       (Se a cor mudasse conforme a posição, as barras trocariam de cor a cada
       ultrapassagem e ninguém conseguiria acompanhar o próprio filho/aluno.)
     - Escala fixa de 0 a 1000 pontos: as barras não "pulam" a cada segundo.
     - O ranking ao lado é a versão em texto do mesmo dado (acessibilidade).
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  var INTERVALO_LEITURA = 3000;      // de quanto em quanto tempo lê o Firebase
  var PONTUACAO_MAXIMA  = 1000;      // escala fixa do gráfico

  /* Cores do gráfico (mesma paleta do resto do jogo) */
  var COR_BARRA   = '#3987e5';
  var COR_BARRA_2 = '#2a6ab5';       // sombra/base da barra
  var COR_TINTA   = '#ffffff';
  var COR_TINTA_2 = '#c3c2b7';
  var COR_MUDA    = '#898781';
  var COR_GRADE   = '#2c2c2a';
  var COR_BASE    = '#383835';

  var p = {
    codigo: null,
    status: 'aguardando',
    jogadores: [],          // [{id, nome, pontuacao, solucoes, indicadores}]
    exibido: {},            // valores animados (para a barra crescer suave)
    timer: null,
    rodando: false,
    congelado: false,
    confeteAtivo: false
  };

  var telaCanvas, telaCtx, confeteCanvas, confeteCtx, confetes = [];

  /* ==================================================================
     CRIAR / ADMINISTRAR A SALA
     ================================================================== */

  /* Sorteia um código e confere se já não existe outra sala com ele */
  function criarSala(tentativa) {
    tentativa = tentativa || 0;
    var codigo = CI.firebase.sortearCodigo();

    CI.firebase.ler('salas/' + codigo + '/status').then(function (r) {
      // Se o código já está em uso, sorteia outro (até 5 vezes)
      if (r.ok && r.dados !== null && tentativa < 5) {
        criarSala(tentativa + 1);
        return;
      }

      CI.firebase.gravar('salas/' + codigo, {
        status: 'aguardando',
        config: {
          criadaEm: Date.now(),
          jogo: 'cidade-inteligente',
          versao: 1
        }
      }).then(function (res) {
        p.codigo = codigo;
        p.status = 'aguardando';
        p.jogadores = [];
        p.exibido = {};
        p.congelado = false;
        document.getElementById('codigo-sala').textContent = codigo;
        atualizarStatusNaTela();

        if (!res.ok) {
          CI.ui.aviso('Sala criada só neste computador (sem internet). Tente "Nova sala" quando a conexão voltar.', 'mau');
        } else {
          CI.ui.aviso('Sala ' + codigo + ' criada!', 'ok');
        }
        comecarLeitura();
      });
    });
  }

  function mudarStatus(novo) {
    if (!p.codigo) return;
    p.status = novo;
    atualizarStatusNaTela();
    CI.firebase.gravar('salas/' + p.codigo, {
      status: novo,
      atualizadoEm: Date.now()
    }).then(function (r) {
      if (!r.ok) CI.ui.aviso('Não consegui avisar os alunos (sem internet).', 'mau');
    });
  }

  function atualizarStatusNaTela() {
    var tag = document.getElementById('painel-status');
    var textos = { aguardando: 'aguardando alunos', jogando: 'partida em andamento', encerrada: 'partida encerrada' };
    tag.textContent = textos[p.status] || p.status;
    tag.className = 'tag' + (p.status === 'jogando' ? ' tag-ok' : (p.status === 'encerrada' ? ' tag-ruim' : ''));

    document.getElementById('btn-iniciar-partida').disabled  = (p.status === 'jogando');
    document.getElementById('btn-encerrar-partida').disabled = (p.status === 'encerrada');
  }

  /* ==================================================================
     LEITURA PERIÓDICA DO FIREBASE
     Caminho lido: cidade_inteligente/salas/{CODIGO}/jogadores
     ================================================================== */
  function comecarLeitura() {
    if (p.timer) clearInterval(p.timer);
    p.timer = setInterval(lerJogadores, INTERVALO_LEITURA);
    lerJogadores();
    comecarDesenho();
  }

  function pararLeitura() {
    if (p.timer) clearInterval(p.timer);
    p.timer = null;
    p.rodando = false;
  }

  function lerJogadores() {
    if (!p.codigo || p.congelado) return;

    CI.firebase.ler('salas/' + p.codigo + '/jogadores').then(function (r) {
      var tagConexao = document.getElementById('painel-conexao');
      if (!r.ok) {
        tagConexao.textContent = 'sem internet — tentando de novo';
        tagConexao.className = 'tag tag-ruim';
        return;
      }
      tagConexao.textContent = 'conectado';
      tagConexao.className = 'tag tag-ok';

      var lista = [];
      var dados = r.dados || {};
      for (var id in dados) {
        if (!Object.prototype.hasOwnProperty.call(dados, id)) continue;
        var j = dados[id];
        if (!j || typeof j !== 'object') continue;
        lista.push({
          id: id,
          nome: String(j.nome || 'sem nome').slice(0, 16),
          pontuacao: Number(j.pontuacao) || 0,
          solucoes: Number(j.solucoes) || 0,
          indicadores: j.indicadores || null
        });
      }

      lista.sort(function (a, b) {
        if (b.pontuacao !== a.pontuacao) return b.pontuacao - a.pontuacao;
        return a.nome.localeCompare(b.nome);
      });

      p.jogadores = lista;
      document.getElementById('painel-qtd-jogadores').textContent = lista.length;
      montarRanking();
    });
  }

  function montarRanking() {
    var ol = document.getElementById('lista-ranking');
    ol.innerHTML = '';

    if (!p.jogadores.length) {
      var vazio = document.createElement('li');
      vazio.innerHTML = '<span class="nome" style="color:var(--tinta-3)">Ninguém entrou ainda…</span>';
      ol.appendChild(vazio);
      return;
    }

    p.jogadores.forEach(function (j, i) {
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="pos">' + medalha(i) + '</span>' +
        '<span class="nome">' + escapar(j.nome) + '</span>' +
        '<span class="pts">' + j.pontuacao + '</span>';
      ol.appendChild(li);
    });
  }

  function medalha(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return (i + 1) + 'º';
  }

  function escapar(txt) {
    return String(txt).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ==================================================================
     O GRÁFICO DE BARRAS (desenhado à mão, sem biblioteca)
     ================================================================== */
  function comecarDesenho() {
    if (p.rodando) return;
    telaCanvas = document.getElementById('grafico-painel');
    telaCtx = telaCanvas.getContext('2d');
    p.rodando = true;
    requestAnimationFrame(desenharGrafico);
  }

  function ajustarTamanho(canvas, ctx) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var larg = Math.max(320, Math.floor(canvas.clientWidth));
    var alt  = Math.max(240, Math.floor(canvas.clientHeight));
    if (canvas.width !== Math.floor(larg * dpr) || canvas.height !== Math.floor(alt * dpr)) {
      canvas.width  = Math.floor(larg * dpr);
      canvas.height = Math.floor(alt * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { largura: larg, altura: alt };
  }

  function desenharGrafico() {
    if (!p.rodando) return;

    var tam = ajustarTamanho(telaCanvas, telaCtx);
    var L = tam.largura, A = tam.altura;
    var ctx = telaCtx;

    ctx.clearRect(0, 0, L, A);
    ctx.fillStyle = '#1a1a19';
    ctx.fillRect(0, 0, L, A);

    if (!p.jogadores.length) {
      ctx.fillStyle = COR_MUDA;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 26px system-ui, "Segoe UI", sans-serif';
      ctx.fillText('Esperando os alunos entrarem na sala ' + (p.codigo || '----') + '…', L / 2, A / 2 - 16);
      ctx.font = '18px system-ui, "Segoe UI", sans-serif';
      ctx.fillStyle = '#5c5b57';
      ctx.fillText('Projete esta tela e escreva o código na lousa.', L / 2, A / 2 + 20);
      requestAnimationFrame(desenharGrafico);
      return;
    }

    var n = p.jogadores.length;
    var margemEsq = Math.min(240, Math.max(130, L * 0.18));   // espaço dos nomes
    var margemDir = 86;                                        // espaço do número
    var topo = 34, base = A - 26;
    var alturaUtil = base - topo;

    var espaco = alturaUtil / n;
    var alturaBarra = Math.max(6, Math.min(70, espaco - 12));
    var fonteNome = Math.max(11, Math.min(24, alturaBarra * 0.72));

    var x0 = margemEsq;
    var largMax = L - margemEsq - margemDir;

    /* --- linhas de grade (bem discretas, atrás das barras) --- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '13px system-ui, "Segoe UI", sans-serif';
    for (var g = 0; g <= 4; g++) {
      var valor = (PONTUACAO_MAXIMA / 4) * g;
      var gx = Math.round(x0 + (valor / PONTUACAO_MAXIMA) * largMax) + 0.5;
      ctx.fillStyle = COR_GRADE;
      ctx.fillRect(gx, topo, 1, base - topo);
      ctx.fillStyle = COR_MUDA;
      ctx.fillText(String(valor), gx, topo - 12);
    }
    // linha de base (eixo)
    ctx.fillStyle = COR_BASE;
    ctx.fillRect(x0, topo, 2, base - topo);

    /* --- uma barra por aluno --- */
    for (var i = 0; i < n; i++) {
      var j = p.jogadores[i];
      var y = topo + i * espaco + (espaco - alturaBarra) / 2;

      // animação suave: o valor mostrado "corre atrás" do valor real
      var alvo = j.pontuacao;
      if (p.exibido[j.id] === undefined) p.exibido[j.id] = 0;
      p.exibido[j.id] += (alvo - p.exibido[j.id]) * 0.15;
      if (Math.abs(alvo - p.exibido[j.id]) < 0.6) p.exibido[j.id] = alvo;

      var larg = Math.max(3, (Math.min(p.exibido[j.id], PONTUACAO_MAXIMA) / PONTUACAO_MAXIMA) * largMax);

      // trilho de fundo
      ctx.fillStyle = '#232322';
      retanguloArredondado(ctx, x0 + 2, y, largMax, alturaBarra, 4);
      ctx.fill();

      // a barra (mesma cor para todo mundo)
      ctx.fillStyle = COR_BARRA;
      retanguloArredondado(ctx, x0 + 2, y, larg, alturaBarra, 4);
      ctx.fill();
      ctx.fillStyle = COR_BARRA_2;
      ctx.fillRect(x0 + 2, y + alturaBarra - 3, Math.max(0, larg - 4), 3);

      // nome do aluno (com medalha para os três primeiros)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + fonteNome.toFixed(0) + 'px system-ui, "Segoe UI", sans-serif';
      ctx.fillStyle = COR_TINTA;
      var rotulo = medalha(i) + ' ' + j.nome;
      ctx.fillText(cortar(ctx, rotulo, margemEsq - 14), x0 - 12, y + alturaBarra / 2);

      // pontuação no fim da barra
      ctx.textAlign = 'left';
      ctx.font = '700 ' + fonteNome.toFixed(0) + 'px system-ui, "Segoe UI", sans-serif';
      ctx.fillStyle = COR_TINTA_2;
      ctx.fillText(String(Math.round(p.exibido[j.id])), x0 + 2 + larg + 10, y + alturaBarra / 2);
    }

    /* --- rótulo do eixo --- */
    ctx.textAlign = 'left';
    ctx.fillStyle = COR_MUDA;
    ctx.font = '13px system-ui, "Segoe UI", sans-serif';
    ctx.fillText('pontos (0 a 1000) — mais equilíbrio, mais pontos', x0, A - 8);

    requestAnimationFrame(desenharGrafico);
  }

  /* Corta o texto com "…" se não couber no espaço */
  function cortar(ctx, txt, largura) {
    if (ctx.measureText(txt).width <= largura) return txt;
    var t = txt;
    while (t.length > 2 && ctx.measureText(t + '…').width > largura) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  function retanguloArredondado(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ==================================================================
     ENCERRAR A PARTIDA E COMEMORAR O VENCEDOR
     ================================================================== */
  function encerrar() {
    if (!p.codigo) { CI.ui.aviso('Crie uma sala primeiro.', 'mau'); return; }

    CI.ui.modal({
      icone: '🏁',
      titulo: 'Encerrar a partida?',
      corpo: '<p>O placar congela, os alunos param de construir e cada um recebe o relatório da própria cidade.</p>',
      botoes: [
        { texto: 'Ainda não', classe: 'btn-neutro' },
        { texto: 'Encerrar agora', classe: 'btn-ambar', acao: function () {
            // lê uma última vez para o placar final ficar atualizado
            lerJogadores();
            mudarStatus('encerrada');
            setTimeout(function () {
              p.congelado = true;      // placar congelado
              mostrarVencedor();
            }, 1200);
        } }
      ]
    });
  }

  function mostrarVencedor() {
    var caixa = document.getElementById('painel-vencedor');
    caixa.classList.remove('oculto');

    var linhaPontos = document.getElementById('vencedor-pontos').parentNode;

    if (!p.jogadores.length) {
      document.getElementById('vencedor-nome').textContent = 'Ninguém jogou 😅';
      linhaPontos.style.display = 'none';
      document.getElementById('vencedor-podio').innerHTML = '';
      return;
    }
    linhaPontos.style.display = '';   // volta ao normal se antes estava escondida

    var campeao = p.jogadores[0];
    document.getElementById('vencedor-nome').textContent = campeao.nome;
    document.getElementById('vencedor-pontos').textContent = campeao.pontuacao;

    var podio = document.getElementById('vencedor-podio');
    podio.innerHTML = '';
    p.jogadores.slice(0, 5).forEach(function (j, i) {
      var li = document.createElement('li');
      li.innerHTML = medalha(i) + ' ' + escapar(j.nome) + ' — <b>' + j.pontuacao + '</b>';
      podio.appendChild(li);
    });

    comecarConfete();
  }

  /* Confete em pixels (bem leve: só quadradinhos caindo) */
  function comecarConfete() {
    confeteCanvas = document.getElementById('confete');
    confeteCtx = confeteCanvas.getContext('2d');
    confetes = [];

    var cores = ['#c98500', '#3987e5', '#199e70', '#e66767', '#9085e9', '#ffffff'];
    for (var i = 0; i < 120; i++) {
      confetes.push({
        x: Math.random() * window.innerWidth,
        y: -Math.random() * window.innerHeight,
        vy: 60 + Math.random() * 150,
        vx: (Math.random() - 0.5) * 60,
        tam: 4 + Math.random() * 6,
        cor: cores[Math.floor(Math.random() * cores.length)]
      });
    }

    p.confeteAtivo = true;
    var anterior = 0;
    function passo(agora) {
      if (!p.confeteAtivo) return;
      if (!anterior) anterior = agora;
      var dt = Math.min(0.05, (agora - anterior) / 1000);
      anterior = agora;

      var L = window.innerWidth, A = window.innerHeight;
      if (confeteCanvas.width !== L || confeteCanvas.height !== A) {
        confeteCanvas.width = L; confeteCanvas.height = A;
      }
      confeteCtx.clearRect(0, 0, L, A);

      for (var i = 0; i < confetes.length; i++) {
        var c = confetes[i];
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.y > A) { c.y = -10; c.x = Math.random() * L; }
        confeteCtx.fillStyle = c.cor;
        confeteCtx.fillRect(c.x, c.y, c.tam, c.tam);
      }
      requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  function pararConfete() { p.confeteAtivo = false; }

  /* ==================================================================
     BOTÕES DO PAINEL
     ================================================================== */
  function ligarEventos() {
    document.getElementById('btn-iniciar-partida').addEventListener('click', function () {
      if (!p.codigo) { CI.ui.aviso('Crie uma sala primeiro.', 'mau'); return; }
      p.congelado = false;
      mudarStatus('jogando');
      CI.ui.aviso('Partida iniciada! Bom jogo.', 'ok');
    });

    document.getElementById('btn-encerrar-partida').addEventListener('click', encerrar);

    document.getElementById('btn-fechar-vencedor').addEventListener('click', function () {
      pararConfete();
      document.getElementById('painel-vencedor').classList.add('oculto');
    });

    document.getElementById('btn-nova-sala').addEventListener('click', function () {
      CI.ui.modal({
        icone: '🆕',
        titulo: 'Criar uma nova sala?',
        corpo: '<p>Um novo código será sorteado. A sala anterior <b>continua existindo</b> — os alunos que já entraram nela ficam para trás.</p>',
        botoes: [
          { texto: 'Cancelar', classe: 'btn-neutro' },
          { texto: 'Criar nova sala', classe: 'btn-verde', acao: function () {
              pararConfete();
              document.getElementById('painel-vencedor').classList.add('oculto');
              criarSala();
          } }
        ]
      });
    });

    /* Limpar sala: ÚNICA operação que apaga algo no banco.
       Apaga só o nó desta sala, dentro de cidade_inteligente/salas/. */
    document.getElementById('btn-limpar-sala').addEventListener('click', function () {
      if (!p.codigo) { CI.ui.aviso('Não há sala para limpar.', 'mau'); return; }
      CI.ui.modal({
        icone: '🗑️',
        titulo: 'Apagar a sala ' + p.codigo + '?',
        corpo: '<p>Isso apaga do banco de dados os jogadores e a pontuação <b>desta sala</b>.</p>' +
               '<p class="ajuda-peq">Nenhum outro jogo ou site é afetado: só o endereço ' +
               '<code>' + CI.firebase.NO_RAIZ + '/salas/' + p.codigo + '</code> é removido.</p>',
        botoes: [
          { texto: 'Cancelar', classe: 'btn-neutro' },
          { texto: 'Apagar sala', classe: 'btn-ambar', acao: function () {
              var codigo = p.codigo;
              CI.firebase.apagarSala(codigo).then(function (r) {
                if (r.ok) {
                  CI.ui.aviso('Sala ' + codigo + ' apagada.', 'ok');
                  p.jogadores = []; p.exibido = {};
                  montarRanking();
                  document.getElementById('painel-qtd-jogadores').textContent = '0';
                  criarSala();
                } else {
                  CI.ui.aviso('Não consegui apagar (sem internet).', 'mau');
                }
              });
          } }
        ]
      });
    });

    document.getElementById('btn-sair-painel').addEventListener('click', function () {
      pararLeitura();
      pararConfete();
      document.getElementById('painel-vencedor').classList.add('oculto');
      CI.ui.mostrarTela('tela-inicio');
    });
  }

  CI.professor = {
    ligarEventos: ligarEventos,
    abrirPainel: function () {
      atualizarStatusNaTela();
      if (!p.codigo) criarSala();
      else comecarLeitura();
    },
    pararTudo: function () { pararLeitura(); pararConfete(); },
    estado: p
  };

})();
