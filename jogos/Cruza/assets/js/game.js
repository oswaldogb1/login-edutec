/* ==========================================================================
   CRUZA! — Logica do jogo (tela do aluno)
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var PONTOS_BASE = 100;
  var PONTOS_POR_LETRA = 5;
  var BONUS_SEQUENCIA = 20;
  var MAX_BONUS_SEQUENCIA = 100;
  var CUSTO_DICA = 40;
  var MAX_DICAS = 5;
  var BONUS_CONCLUSAO = 300;

  var puzzle = Puzzle.build();
  var cena = null;

  var S = {
    id: null,
    nome: '',
    turma: '',
    sala: 'GERAL',
    letras: [],          // letras digitadas: letras[r][c]
    resolvidas: {},      // index da palavra -> { tempoMs, comDica }
    reveladas: {},       // "r,c" -> true (letra dada por dica)
    ajudasVistas: {},    // index da palavra -> true (dica de apoio ja aberta)
    ajudas: 0,
    palavraAtual: null,  // objeto word
    celAtual: 0,         // indice da celula dentro da palavra
    pontos: 0,
    sequencia: 0,
    dicas: 0,
    inicio: 0,
    fim: 0,
    terminou: false,
    celulas: {}          // "r,c" -> elemento DOM
  };

  /* ------------------------------------------------------------ utilidades */

  function chave(r, c) { return r + ',' + c; }

  function formatarTempo(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    return (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
  }

  function limparCodigo(v) {
    return (Puzzle.normalize(v) || '').replace(/[^A-Z0-9-]/g, '').slice(0, 12);
  }

  function toast(texto, tipo) {
    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || '');
    el.textContent = texto;
    $('toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, 2700);
  }

  function pontosVoando(x, y, texto) {
    var el = document.createElement('div');
    el.className = 'pontos-voando';
    el.textContent = texto;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1400);
  }

  /* ------------------------------------------------------------- entrada */

  function iniciarEntrada() {
    var params = new URLSearchParams(location.search);
    var salvo = {};
    try { salvo = JSON.parse(localStorage.getItem('cruza:jogador') || '{}'); } catch (e) {}

    $('campoNome').value = salvo.nome || '';
    $('campoTurma').value = salvo.turma || '';
    $('campoSala').value = limparCodigo(params.get('sala') || salvo.sala || 'GERAL') || 'GERAL';

    $('formEntrada').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = $('campoNome').value.trim().replace(/\s+/g, ' ');
      if (nome.length < 2) {
        $('avisoEntrada').textContent = 'Escreva seu nome para entrar no ranking.';
        return;
      }
      S.nome = nome;
      S.turma = $('campoTurma').value.trim() || 'Sem turma';
      S.sala = limparCodigo($('campoSala').value) || 'GERAL';

      try {
        localStorage.setItem('cruza:jogador', JSON.stringify({ nome: S.nome, turma: S.turma, sala: S.sala }));
      } catch (e) {}

      SFX.ativar();
      comecarJogo();
    });
  }

  /* ----------------------------------------------------------- tabuleiro */

  function montarTabuleiro() {
    var tab = $('tabuleiro');
    tab.innerHTML = '';
    tab.style.gridTemplateColumns = 'repeat(' + puzzle.cols + ', var(--cel))';
    S.celulas = {};

    for (var r = 0; r < puzzle.rows; r++) {
      S.letras[r] = S.letras[r] || [];
      for (var c = 0; c < puzzle.cols; c++) {
        var dado = puzzle.grid[r][c];
        if (!dado) {
          var vazia = document.createElement('div');
          vazia.className = 'cel-vazia';
          tab.appendChild(vazia);
          continue;
        }
        S.letras[r][c] = S.letras[r][c] || '';

        var cel = document.createElement('div');
        cel.className = 'cel';
        cel.dataset.r = r;
        cel.dataset.c = c;
        cel.setAttribute('role', 'gridcell');

        var numHtml = dado.num ? '<i class="num">' + dado.num + '</i>' : '';
        cel.innerHTML =
          '<div class="face frente">' + numHtml + '<span class="letra"></span></div>' +
          '<div class="face verso">' + numHtml + '<span class="letra">' + dado.letter + '</span></div>';

        cel.addEventListener('click', aoClicarCelula);
        S.celulas[chave(r, c)] = cel;
        tab.appendChild(cel);
      }
    }
    ajustarTamanho();
  }

  function ajustarTamanho() {
    var palco = $('palco');
    var largura = palco.clientWidth - 24;
    var altura = palco.clientHeight - 24;
    if (largura < 100 || altura < 100) return;
    var porLargura = (largura - 28 - (puzzle.cols - 1) * 3) / puzzle.cols;
    var porAltura = (altura - 28 - (puzzle.rows - 1) * 3) / puzzle.rows;
    var tam = Math.floor(Math.min(porLargura, porAltura));
    tam = Math.max(20, Math.min(52, tam));
    document.documentElement.style.setProperty('--cel', tam + 'px');
  }

  /* ---------------------------------------------------------- navegacao  */

  function aoClicarCelula(ev) {
    var r = +ev.currentTarget.dataset.r;
    var c = +ev.currentTarget.dataset.c;
    var idxs = puzzle.grid[r][c].words;
    var candidatas = idxs.map(function (i) {
      return puzzle.words.filter(function (w) { return w.index === i; })[0];
    });

    var alvo = null;
    if (S.palavraAtual && candidatas.length > 1 && candidatas.some(function (w) { return w === S.palavraAtual; })) {
      // celula de cruzamento: alterna a direcao
      alvo = candidatas.filter(function (w) { return w !== S.palavraAtual; })[0];
    }
    if (!alvo) {
      alvo = candidatas.filter(function (w) { return !S.resolvidas[w.index]; })[0] || candidatas[0];
    }
    selecionarPalavra(alvo, posicaoNaPalavra(alvo, r, c));
    SFX.mover();
  }

  function posicaoNaPalavra(w, r, c) {
    for (var i = 0; i < w.cells.length; i++) {
      if (w.cells[i].r === r && w.cells[i].c === c) return i;
    }
    return 0;
  }

  /**
   * Escolher uma palavra sempre posiciona o cursor na PRIMEIRA letra.
   * Assim "clicar na dica e digitar a resposta inteira" funciona sempre: as
   * casas ja fechadas por cruzamento sao puladas consumindo a letra digitada
   * (ver `digitar`). Comecar na primeira casa vazia desalinharia a digitacao.
   */
  function selecionarPalavra(w, pos) {
    if (!w) return;
    S.palavraAtual = w;
    S.celAtual = typeof pos === 'number' ? pos : 0;
    pintar();
    atualizarFaixa();
    focarEntradaOculta();
    trazerParaVista(w.cells[S.celAtual]);
  }

  /**
   * Aproxima a celula ativa rolando SOMENTE o palco — usar scrollIntoView aqui
   * arrastaria a pagina inteira e esconderia o placar no topo.
   */
  function trazerParaVista(cel) {
    var palco = $('palco');
    var el = S.celulas[chave(cel.r, cel.c)];
    if (!el || !palco) return;
    var caixa = el.getBoundingClientRect();
    var area = palco.getBoundingClientRect();
    var margem = 30;
    if (caixa.top < area.top + margem) palco.scrollTop -= (area.top + margem - caixa.top);
    else if (caixa.bottom > area.bottom - margem) palco.scrollTop += (caixa.bottom - area.bottom + margem);
    if (caixa.left < area.left + margem) palco.scrollLeft -= (area.left + margem - caixa.left);
    else if (caixa.right > area.right - margem) palco.scrollLeft += (caixa.right - area.right + margem);
  }


  function proximaPalavraAberta() {
    var lista = puzzle.words.filter(function (w) { return !S.resolvidas[w.index]; });
    if (!lista.length) return null;
    if (!S.palavraAtual) return lista[0];
    var pos = lista.indexOf(S.palavraAtual);
    return lista[(pos + 1) % lista.length];
  }

  /* -------------------------------------------------------------- pintura */

  function pintar() {
    Object.keys(S.celulas).forEach(function (k) {
      S.celulas[k].classList.remove('destaque', 'foco');
    });
    if (!S.palavraAtual) return;
    S.palavraAtual.cells.forEach(function (cel, i) {
      var el = S.celulas[chave(cel.r, cel.c)];
      if (!el) return;
      el.classList.add('destaque');
      if (i === S.celAtual) el.classList.add('foco');
    });
  }

  function escreverLetra(r, c, letra) {
    S.letras[r][c] = letra;
    var el = S.celulas[chave(r, c)];
    if (el) el.querySelector('.frente .letra').textContent = letra;
  }

  function atualizarFaixa() {
    var w = S.palavraAtual;
    if (!w) return;
    $('faixaNum').textContent = w.num;
    $('faixaDir').textContent = (w.dir === 'H' ? 'Horizontal' : 'Vertical') + ' · ' + w.len + ' letras';
    $('faixaTexto').textContent = w.clue;

    var aberta = !!S.ajudasVistas[w.index];
    var caixa = $('faixaAjuda');
    caixa.textContent = aberta ? w.hint : '';
    caixa.classList.toggle('oculto', !aberta);
    var botao = $('btnAjudaFaixa');
    botao.textContent = aberta ? '💡 Dica aberta' : '💡 Dica';
    botao.classList.toggle('usada', aberta);
    botao.classList.toggle('oculto', !!S.resolvidas[w.index]);

    Array.prototype.forEach.call(document.querySelectorAll('.dica-item'), function (el) {
      el.classList.toggle('ativa', +el.dataset.idx === w.index);
    });
  }

  /**
   * Dica de apoio da pergunta: um empurrãozinho em texto, sem custo de pontos
   * (o botão 💡 do topo, que revela uma letra, continua custando).
   */
  function abrirAjuda(w) {
    if (!w) return;
    var nova = !S.ajudasVistas[w.index];
    if (nova) {
      S.ajudasVistas[w.index] = true;
      S.ajudas++;
      SFX.dica();
      toast('💡 Dica da pergunta ' + w.num, 'ouro');
    }
    var item = document.querySelector('.dica-item[data-idx="' + w.index + '"]');
    if (item) {
      var caixa = item.querySelector('.ajuda');
      caixa.textContent = w.hint;
      caixa.classList.remove('oculto');
      var btn = item.querySelector('.btn-ajuda');
      btn.textContent = '💡 Dica aberta';
      btn.classList.add('usada');
    }
    if (S.palavraAtual === w) atualizarFaixa();
  }

  function montarPainelDicas() {
    var painel = $('painelDicas');
    painel.innerHTML = '';
    ['H', 'V'].forEach(function (dir) {
      var titulo = document.createElement('h3');
      titulo.textContent = dir === 'H' ? '➡ Horizontais' : '⬇ Verticais';
      painel.appendChild(titulo);

      puzzle.words.filter(function (w) { return w.dir === dir; }).forEach(function (w) {
        var item = document.createElement('div');
        item.className = 'dica-item';
        item.dataset.idx = w.index;
        item.innerHTML =
          '<div class="n">' + w.num + '</div>' +
          '<div><div class="texto-dica">' + w.clue + '</div>' +
          '<div class="linha-meta"><span class="meta">' + w.len + ' letras</span>' +
          '<button class="btn-ajuda" type="button">💡 Dica</button></div>' +
          '<div class="ajuda oculto"></div></div>';

        item.querySelector('.btn-ajuda').addEventListener('click', function (ev) {
          ev.stopPropagation();
          selecionarPalavra(w, 0);
          abrirAjuda(w);
        });
        item.addEventListener('click', function () {
          selecionarPalavra(w, 0);
          SFX.mover();
        });
        painel.appendChild(item);
      });
    });
  }

  /* ------------------------------------------------------------- digitar */

  function digitar(letra) {
    if (S.terminou || !S.palavraAtual) return;
    var w = S.palavraAtual;
    if (S.resolvidas[w.index]) { avancarPalavra(); return; }

    var cel = w.cells[S.celAtual];
    if (celaTravada(cel.r, cel.c)) { avancar(1); return; }

    escreverLetra(cel.r, cel.c, letra);
    SFX.tecla();
    avancar(1);
    verificarPalavras(cel.r, cel.c);
  }

  function apagar() {
    if (S.terminou || !S.palavraAtual) return;
    var w = S.palavraAtual;
    var cel = w.cells[S.celAtual];
    if (!celaTravada(cel.r, cel.c) && S.letras[cel.r][cel.c]) {
      escreverLetra(cel.r, cel.c, '');
      SFX.apagar();
      pintar();
      return;
    }
    if (S.celAtual > 0) {
      S.celAtual--;
      var ant = w.cells[S.celAtual];
      if (!celaTravada(ant.r, ant.c)) escreverLetra(ant.r, ant.c, '');
      SFX.apagar();
      pintar();
    }
  }

  /** Celula travada = pertence a alguma palavra ja resolvida. */
  function celaTravada(r, c) {
    return puzzle.grid[r][c].words.some(function (i) { return S.resolvidas[i]; });
  }

  function avancar(passo) {
    var w = S.palavraAtual;
    var i = S.celAtual + passo;
    if (i < 0) i = 0;
    if (i > w.len - 1) i = w.len - 1;
    S.celAtual = i;
    pintar();
  }

  function avancarPalavra() {
    var prox = proximaPalavraAberta();
    if (prox) selecionarPalavra(prox, 0);
  }

  /* ---------------------------------------------------------- verificacao */

  function verificarPalavras(r, c) {
    var indices = puzzle.grid[r][c].words.slice();
    indices.forEach(function (idx) {
      var w = puzzle.words.filter(function (x) { return x.index === idx; })[0];
      if (!w || S.resolvidas[idx]) return;

      var letras = w.cells.map(function (cel) { return S.letras[cel.r][cel.c] || ''; });
      if (letras.some(function (l) { return l === ''; })) return; // ainda incompleta
      var digitado = letras.join('');

      if (digitado === w.answer) {
        resolverPalavra(w);
      } else {
        errarPalavra(w);
      }
    });
  }

  function errarPalavra(w) {
    // so quebra a sequencia se o erro for na palavra em que o aluno esta;
    // uma cruzada que fechou errada "de raspao" nao deve punir a sequencia.
    if (w === S.palavraAtual) S.sequencia = 0;
    SFX.erro();
    toast('Ops! "' + w.clue.slice(0, 32) + '…" ainda não confere', 'ruim');
    w.cells.forEach(function (cel) {
      var el = S.celulas[chave(cel.r, cel.c)];
      if (!el || celaTravada(cel.r, cel.c)) return;
      el.classList.add('errada');
      setTimeout(function () { el.classList.remove('errada'); }, 500);
    });
  }

  function resolverPalavra(w) {
    var usouDica = w.cells.some(function (cel) { return S.reveladas[chave(cel.r, cel.c)]; });
    S.resolvidas[w.index] = { tempoMs: Date.now() - S.inicio, comDica: usouDica };
    S.sequencia++;

    var bonus = Math.min(MAX_BONUS_SEQUENCIA, (S.sequencia - 1) * BONUS_SEQUENCIA);
    var ganho = PONTOS_BASE + w.len * PONTOS_POR_LETRA + bonus;
    S.pontos += ganho;

    // animacao de virada, letra por letra
    w.cells.forEach(function (cel, i) {
      var el = S.celulas[chave(cel.r, cel.c)];
      if (!el) return;
      setTimeout(function () {
        el.classList.add('resolvida', 'brilho');
        setTimeout(function () { el.classList.remove('brilho'); }, 1200);
      }, i * 55);
    });

    var alvo = S.celulas[chave(w.cells[0].r, w.cells[0].c)];
    if (alvo) {
      var box = alvo.getBoundingClientRect();
      pontosVoando(box.left, box.top, '+' + ganho);
    }

    SFX.acerto();
    if (cena && cena.ok) cena.celebrar(70);
    toast('✅ ' + w.raw + (bonus ? '  ·  sequência +' + bonus : ''), 'bom');

    marcarDicaFeita(w);
    atualizarPlacar(true);
    salvarProgresso(w);

    if (Object.keys(S.resolvidas).length === puzzle.words.length) {
      setTimeout(terminar, 900);
    } else {
      // so pula sozinho se o jogador nao escolheu outra palavra nesse meio tempo
      setTimeout(function () {
        if (S.palavraAtual === w) avancarPalavra();
      }, 450);
    }
  }

  function marcarDicaFeita(w) {
    var el = document.querySelector('.dica-item[data-idx="' + w.index + '"]');
    if (!el) return;
    el.classList.add('feita');
    el.querySelector('.meta').textContent = '✔ ' + w.raw;
    var btn = el.querySelector('.btn-ajuda');
    if (btn) btn.classList.add('oculto');
    var caixa = el.querySelector('.ajuda');
    if (caixa) caixa.classList.add('oculto');
  }

  /* ---------------------------------------------------------------- dica */

  function usarDica() {
    if (S.terminou) return;
    if (S.dicas >= MAX_DICAS) { toast('Suas ' + MAX_DICAS + ' dicas acabaram!', 'ruim'); return; }
    var w = S.palavraAtual;
    if (!w || S.resolvidas[w.index]) { toast('Escolha uma palavra primeiro', 'ruim'); return; }

    var alvo = null;
    for (var i = 0; i < w.cells.length; i++) {
      var cel = w.cells[i];
      if (S.letras[cel.r][cel.c] !== w.answer[i]) { alvo = { cel: cel, letra: w.answer[i], i: i }; break; }
    }
    if (!alvo) { toast('Essa palavra já está completa!', 'bom'); return; }

    S.dicas++;
    S.pontos = Math.max(0, S.pontos - CUSTO_DICA);
    S.reveladas[chave(alvo.cel.r, alvo.cel.c)] = true;
    escreverLetra(alvo.cel.r, alvo.cel.c, alvo.letra);
    var el = S.celulas[chave(alvo.cel.r, alvo.cel.c)];
    if (el) el.classList.add('dica');

    SFX.dica();
    toast('💡 Letra revelada  ·  −' + CUSTO_DICA + ' pontos  ·  restam ' + (MAX_DICAS - S.dicas), 'ouro');
    atualizarPlacar(true);
    S.celAtual = Math.min(w.len - 1, alvo.i + 1);
    pintar();
    verificarPalavras(alvo.cel.r, alvo.cel.c);
  }

  /* ------------------------------------------------------------- placar  */

  function atualizarPlacar(animar) {
    var mp = $('mPontos'), ma = $('mAcertos');
    mp.querySelector('b').textContent = S.pontos;
    ma.querySelector('b').textContent = Object.keys(S.resolvidas).length + '/' + puzzle.words.length;
    if (animar) {
      [mp, ma].forEach(function (el) {
        el.classList.remove('pulando');
        void el.offsetWidth;
        el.classList.add('pulando');
      });
    }
  }

  function tiquetaque() {
    if (S.terminou) return;
    $('mTempo').querySelector('b').textContent = formatarTempo(Date.now() - S.inicio);
  }

  /* ------------------------------------------------------ sincronizacao  */

  function resumoJogador(extra) {
    var base = {
      nome: S.nome,
      turma: S.turma,
      pontos: S.pontos,
      acertos: Object.keys(S.resolvidas).length,
      total: puzzle.words.length,
      dicas: S.dicas,
      ajudas: S.ajudas,
      tempoMs: (S.fim || Date.now()) - S.inicio,
      inicioEm: S.inicio,
      finalizado: !!S.terminou
    };
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  function salvarProgresso(palavra) {
    DB.salvarJogador(S.sala, S.id, resumoJogador()).catch(function () {});
    if (palavra) {
      DB.salvarPalavra(S.sala, S.id, palavra.answer, {
        emMs: S.resolvidas[palavra.index].tempoMs,
        comDica: S.resolvidas[palavra.index].comDica
      }).catch(function () {});
    }
  }

  /* -------------------------------------------------------------- final  */

  function terminar() {
    S.terminou = true;
    S.fim = Date.now();

    var duracaoS = Math.floor((S.fim - S.inicio) / 1000);
    var bonusTempo = Math.max(0, Math.min(300, Math.round((1200 - duracaoS) * 0.5)));
    S.pontos += BONUS_CONCLUSAO + bonusTempo;
    atualizarPlacar(true);

    SFX.vitoria();
    if (cena && cena.ok) cena.celebrar(400);

    $('fPontos').textContent = S.pontos;
    $('fTempo').textContent = formatarTempo(S.fim - S.inicio);
    $('fDicas').textContent = S.dicas;
    $('fraseFinal').textContent = S.dicas === 0
      ? 'Perfeito! Você completou tudo sem usar nenhuma dica.'
      : 'Parabéns! Bônus de conclusão +' + BONUS_CONCLUSAO + ' e bônus de tempo +' + bonusTempo + '.';

    DB.salvarJogador(S.sala, S.id, resumoJogador({ finalizado: true, concluidoEm: S.fim })).catch(function () {});

    $('telaFinal').classList.remove('oculto');
    carregarMiniRanking();
  }

  function carregarMiniRanking() {
    DB.lerJogadores(S.sala).then(function (obj) {
      var lista = Object.keys(obj).map(function (k) {
        var j = obj[k] || {};
        return { id: k, nome: j.nome || '—', pontos: j.pontos || 0, acertos: j.acertos || 0, tempoMs: j.tempoMs || 0 };
      });
      lista.sort(function (a, b) {
        return (b.pontos - a.pontos) || (b.acertos - a.acertos) || (a.tempoMs - b.tempoMs);
      });

      var pos = lista.findIndex(function (j) { return j.id === S.id; }) + 1;
      $('fPos').textContent = pos ? pos + 'º' : '—';

      var alvo = $('miniRanking');
      alvo.innerHTML = '<h3>Ranking da sala ' + S.sala + '</h3>';
      lista.slice(0, 6).forEach(function (j, i) {
        var medalha = ['🥇', '🥈', '🥉'][i] || (i + 1) + 'º';
        var linha = document.createElement('div');
        linha.className = 'mini-linha' + (j.id === S.id ? ' eu' : '');
        linha.innerHTML = '<span class="pos">' + medalha + '</span><span>' + escapar(j.nome) +
          '</span><span class="pts">' + j.pontos + '</span>';
        alvo.appendChild(linha);
      });
      if (pos > 6) {
        var minha = lista[pos - 1];
        var l2 = document.createElement('div');
        l2.className = 'mini-linha eu';
        l2.innerHTML = '<span class="pos">' + pos + 'º</span><span>' + escapar(minha.nome) +
          '</span><span class="pts">' + minha.pontos + '</span>';
        alvo.appendChild(l2);
      }
    }).catch(function () {
      $('miniRanking').innerHTML = '<h3>Ranking indisponível no momento</h3>';
    });
  }

  function escapar(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* -------------------------------------------------------------- teclado */

  function focarEntradaOculta() {
    var toque = window.matchMedia('(hover: none)').matches;
    if (toque) {
      var inp = $('entradaOculta');
      inp.value = '';
      inp.focus({ preventScroll: true });
    }
  }

  function ligarTeclado() {
    document.addEventListener('keydown', function (ev) {
      if (S.terminou || $('telaJogo').classList.contains('oculto')) return;
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;

      var k = ev.key;
      if (k === 'Backspace') { ev.preventDefault(); apagar(); return; }
      if (k === 'Tab') { ev.preventDefault(); avancarPalavra(); return; }
      if (k === 'Enter') { ev.preventDefault(); avancarPalavra(); return; }
      if (k === 'ArrowRight' || k === 'ArrowDown') { ev.preventDefault(); avancar(1); return; }
      if (k === 'ArrowLeft' || k === 'ArrowUp') { ev.preventDefault(); avancar(-1); return; }

      if (k.length === 1) {
        var letra = Puzzle.normalize(k);
        if (/^[A-Z]$/.test(letra)) { ev.preventDefault(); digitar(letra); }
      }
    });

    // Teclado virtual (celular/tablet)
    $('entradaOculta').addEventListener('input', function (ev) {
      var v = ev.target.value;
      ev.target.value = '';
      for (var i = 0; i < v.length; i++) {
        var letra = Puzzle.normalize(v[i]);
        if (/^[A-Z]$/.test(letra)) digitar(letra);
      }
    });
    $('entradaOculta').addEventListener('keydown', function (ev) {
      if (ev.key === 'Backspace') { ev.preventDefault(); apagar(); }
    });
  }

  /* ------------------------------------------------------------ controles */

  function ligarControles() {
    $('btnDica').addEventListener('click', usarDica);

    $('btnAjudaFaixa').addEventListener('click', function () {
      abrirAjuda(S.palavraAtual);
    });

    $('btnPlano').addEventListener('click', function () {
      var plano = $('palco').classList.toggle('plano');
      this.classList.toggle('ativo', plano);
      this.textContent = plano ? '🀫' : '🧊';
      this.title = plano ? 'Voltar para a visão 3D' : 'Alternar visão 3D / plana';
    });

    $('btnSom').addEventListener('click', function () {
      var mudo = SFX.estaLigado();
      SFX.mudo(mudo);
      this.textContent = mudo ? '🔇' : '🔊';
      this.classList.toggle('ativo', !mudo);
    });

    $('btnSair').addEventListener('click', function () {
      if (!confirm('Sair do jogo? Sua pontuação atual já foi salva no ranking.')) return;
      salvarProgresso(null);
      location.reload();
    });

    $('btnJogarDeNovo').addEventListener('click', function () { location.reload(); });

    window.addEventListener('resize', ajustarTamanho);

    // salva o progresso periodicamente e ao sair da pagina
    setInterval(function () {
      if (!S.terminou && Object.keys(S.resolvidas).length > 0) salvarProgresso(null);
    }, 20000);

    // Ultima gravacao ao fechar/atualizar a aba. `keepalive` deixa a requisicao
    // terminar depois da pagina sair; sendBeacon nao serve aqui porque so faz
    // POST — no Firebase isso criaria um filho novo em vez de atualizar.
    window.addEventListener('pagehide', function () {
      if (S.terminou || !S.id) return;
      try {
        fetch(DB.url('salas/' + encodeURIComponent(S.sala) + '/jogadores/' + S.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resumoJogador()),
          keepalive: true
        });
      } catch (e) {}
    });
  }

  /* -------------------------------------------------------------- inicio */

  /**
   * Um mesmo aluno mantem o mesmo registro no ranking mesmo se recarregar a
   * pagina — evita entradas fantasma com pontuacao zerada no painel do professor.
   */
  function idDoJogador() {
    var chaveLocal = 'cruza:id:' + S.sala + ':' + Puzzle.normalize(S.nome);
    var id = null;
    try { id = localStorage.getItem(chaveLocal); } catch (e) {}
    if (!id) {
      id = DB.novoId();
      try { localStorage.setItem(chaveLocal, id); } catch (e) {}
    }
    return id;
  }

  function comecarJogo() {
    S.id = idDoJogador();
    S.inicio = Date.now();

    $('telaEntrada').classList.add('oculto');
    $('telaJogo').classList.remove('oculto');
    // durante a partida o canto superior direito e do placar
    $('btnProfessor').classList.add('oculto');
    $('hudNome').textContent = S.nome;
    $('hudTurma').textContent = S.turma + ' · sala ' + S.sala;

    montarTabuleiro();
    montarPainelDicas();
    requestAnimationFrame(ajustarTamanho);
    selecionarPalavra(puzzle.words[0], 0);
    atualizarPlacar(false);

    DB.registrarSala(S.sala);
    DB.salvarJogador(S.sala, S.id, resumoJogador({ entrouEm: S.inicio })).catch(function () {});

    setInterval(tiquetaque, 1000);
    toast('Boa sorte, ' + S.nome.split(' ')[0] + '! 🚀', 'bom');
  }

  document.addEventListener('DOMContentLoaded', function () {
    cena = Scene3D.init($('cena3d'), { raio: 48, altura: 21, velocidade: 0.03 });
    iniciarEntrada();
    ligarTeclado();
    ligarControles();
  });
})();
