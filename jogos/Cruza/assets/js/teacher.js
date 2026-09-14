/* ==========================================================================
   CRUZA! — Painel do professor: ranking ao vivo para projeção
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var SENHA = '54321';

  var puzzle = Puzzle.build();
  var cena = null;

  var P = {
    sala: 'GERAL',
    encerrar: null,
    jogadores: [],
    ordem: 'pontos',
    lider: null,
    posicoes: {},
    digitado: ''
  };

  var ORDENS = {
    pontos: { rotulo: 'pontos', fn: function (a, b) { return (b.pontos - a.pontos) || (b.acertos - a.acertos) || (a.tempoMs - b.tempoMs); } },
    acertos: { rotulo: 'palavras', fn: function (a, b) { return (b.acertos - a.acertos) || (b.pontos - a.pontos); } },
    tempo: { rotulo: 'tempo', fn: function (a, b) { return (b.finalizado - a.finalizado) || (a.tempoMs - b.tempoMs); } },
    nome: { rotulo: 'nome', fn: function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); } }
  };

  /* ---------------------------------------------------------- utilidades */

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function formatarTempo(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000));
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

  /* -------------------------------------------------------------- acesso */

  function pintarPontosSenha() {
    Array.prototype.forEach.call($('pontosSenha').children, function (p, i) {
      p.classList.toggle('on', i < P.digitado.length);
    });
  }

  function tentarEntrar() {
    if (P.digitado === SENHA) {
      try { sessionStorage.setItem('cruza:prof', '1'); } catch (e) {}
      abrirPainel();
    } else {
      $('avisoAcesso').textContent = 'Senha incorreta. Tente novamente.';
      $('cartaoAcesso').classList.add('negado');
      SFX.erro();
      setTimeout(function () { $('cartaoAcesso').classList.remove('negado'); }, 500);
      P.digitado = '';
      pintarPontosSenha();
    }
  }

  function digitarSenha(t) {
    SFX.ativar();
    if (t === 'limpar') { P.digitado = ''; }
    else if (t === 'ok') { tentarEntrar(); return; }
    else if (P.digitado.length < 5) { P.digitado += t; SFX.tecla(); }
    $('avisoAcesso').textContent = '';
    pintarPontosSenha();
    if (P.digitado.length === 5) setTimeout(tentarEntrar, 180);
  }

  function ligarAcesso() {
    $('tecladoSenha').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.tecla');
      if (btn) digitarSenha(btn.dataset.t);
    });
    document.addEventListener('keydown', function (ev) {
      if (!$('telaAcesso') || $('telaAcesso').classList.contains('oculto')) return;
      if (/^[0-9]$/.test(ev.key)) digitarSenha(ev.key);
      else if (ev.key === 'Backspace') { P.digitado = P.digitado.slice(0, -1); pintarPontosSenha(); }
      else if (ev.key === 'Enter') tentarEntrar();
    });
  }

  /* -------------------------------------------------------------- painel */

  function abrirPainel() {
    $('telaAcesso').classList.add('oculto');
    $('telaPainel').classList.remove('oculto');

    var params = new URLSearchParams(location.search);
    var salvo = '';
    try { salvo = localStorage.getItem('cruza:salaProf') || ''; } catch (e) {}
    P.sala = limparCodigo(params.get('sala') || salvo || 'GERAL') || 'GERAL';

    montarGradePalavras();
    trocarSala(P.sala);
    setInterval(atualizarTempos, 1000);
  }

  function trocarSala(sala) {
    P.sala = limparCodigo(sala) || 'GERAL';
    try { localStorage.setItem('cruza:salaProf', P.sala); } catch (e) {}

    $('salaAtual').textContent = P.sala;
    $('codigoConvite').textContent = P.sala;
    P.lider = null;
    P.posicoes = {};
    P.jogadores = [];
    desenhar();
    montarConvite();

    if (P.encerrar) P.encerrar();
    P.encerrar = DB.observarJogadores(P.sala, receberDados, mostrarStatus);
    DB.registrarSala(P.sala);
  }

  function mostrarStatus(estado) {
    var led = $('ledStatus'), txt = $('txtStatus');
    led.className = 'led';
    if (estado === 'live') { txt.textContent = 'ao vivo'; }
    else if (estado === 'polling') { txt.textContent = 'atualizando'; led.classList.add('aguardando'); }
    else if (estado === 'reconectando') { txt.textContent = 'reconectando…'; led.classList.add('aguardando'); }
    else { txt.textContent = 'sem conexão'; led.classList.add('off'); }
  }

  function receberDados(obj) {
    P.jogadores = Object.keys(obj || {}).map(function (id) {
      var j = obj[id] || {};
      return {
        id: id,
        nome: j.nome || 'Anônimo',
        turma: j.turma || '',
        pontos: +j.pontos || 0,
        acertos: +j.acertos || 0,
        total: +j.total || puzzle.words.length,
        dicas: +j.dicas || 0,
        ajudas: +j.ajudas || 0,
        tempoMs: +j.tempoMs || 0,
        inicioEm: +j.inicioEm || 0,
        atualizadoEm: +j.atualizadoEm || 0,
        finalizado: !!j.finalizado,
        palavras: j.palavras || {}
      };
    });
    desenhar();
  }

  /* ------------------------------------------------------------- desenho */

  function ordenados() {
    var lista = P.jogadores.slice();
    lista.sort(ORDENS[P.ordem].fn);
    return lista;
  }

  function desenhar() {
    var lista = ordenados();
    desenharStats(lista);
    desenharPodio(lista);
    desenharLista(lista);
    desenharPalavras();
  }

  function desenharStats(lista) {
    var concluiram = lista.filter(function (j) { return j.finalizado; }).length;
    var soma = lista.reduce(function (t, j) { return t + j.pontos; }, 0);
    var palavras = lista.reduce(function (t, j) { return t + j.acertos; }, 0);
    $('stJogadores').textContent = lista.length;
    $('stConcluiram').textContent = concluiram;
    $('stMedia').textContent = lista.length ? Math.round(soma / lista.length) : 0;
    $('stPalavras').textContent = palavras;
  }

  function desenharPodio(lista) {
    var podio = $('podio');
    var top = lista.slice(0, 3);
    var novoLider = top[0] ? top[0].id : null;
    var mudou = novoLider && P.lider && novoLider !== P.lider;

    podio.innerHTML = '';
    [0, 1, 2].forEach(function (i) {
      var j = top[i];
      var classe = 'degrau p' + (i + 1) + (j ? '' : ' vazio');
      var div = document.createElement('div');
      div.className = classe;
      var medalha = ['🥇', '🥈', '🥉'][i];
      if (j) {
        div.innerHTML =
          '<div class="medalha">' + medalha + '</div>' +
          '<div class="nome-p">' + escapar(j.nome) + '</div>' +
          (j.turma ? '<div class="turma-p">' + escapar(j.turma) + '</div>' : '') +
          '<div class="pts-p">' + j.pontos + '</div>' +
          '<div class="det-p">' + j.acertos + '/' + j.total + ' palavras · ' + formatarTempo(j.tempoMs) +
          (j.finalizado ? ' · ✅' : '') + '</div>';
      } else {
        div.innerHTML = '<div class="medalha">' + medalha + '</div><div class="nome-p">—</div><div class="det-p">aguardando</div>';
      }
      podio.appendChild(div);
    });

    if (mudou) {
      var primeiro = podio.querySelector('.p1');
      if (primeiro) primeiro.classList.add('coroa-nova');
      SFX.novoLider();
      if (cena && cena.ok) cena.celebrar(200);
      toast('👑 ' + top[0].nome + ' assumiu a liderança!', 'ouro');
    }
    P.lider = novoLider;
  }

  function desenharLista(lista) {
    var alvo = $('lista');
    if (!lista.length) {
      alvo.innerHTML = '<div class="vazio-msg"><span class="grande">🧩</span>' +
        'Ninguém entrou na sala <strong>' + escapar(P.sala) + '</strong> ainda.<br>' +
        'Compartilhe o link e o código com a turma.</div>';
      return;
    }

    alvo.innerHTML = '';
    lista.forEach(function (j, i) {
      var antes = P.posicoes[j.id];
      var subiu = typeof antes === 'number' && i < antes;
      var pct = Math.round((j.acertos / (j.total || 15)) * 100);

      var linha = document.createElement('div');
      linha.className = 'linha' + (subiu ? ' subiu' : '') + (j.finalizado ? ' concluiu' : '');
      linha.innerHTML =
        '<div class="col-pos">' + (['🥇', '🥈', '🥉'][i] || (i + 1) + 'º') + '</div>' +
        '<div class="col-nome">' + escapar(j.nome) +
        '<small>' + escapar(j.turma) +
        (j.dicas ? ' · ' + j.dicas + ' letra' + (j.dicas > 1 ? 's' : '') + ' revelada' + (j.dicas > 1 ? 's' : '') : '') +
        (j.ajudas ? ' · ' + j.ajudas + ' dica' + (j.ajudas > 1 ? 's' : '') : '') + '</small></div>' +
        '<div class="barra-prog' + (pct >= 100 ? ' cheia' : '') + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="col-pts">' + j.pontos + '</div>' +
        '<div class="col-tempo" data-tempo="' + j.inicioEm + '" data-fim="' + (j.finalizado ? 1 : 0) + '">' +
        formatarTempo(j.tempoMs) + '</div>';
      alvo.appendChild(linha);

      if (subiu) setTimeout(function () { linha.classList.remove('subiu'); }, 2500);
      P.posicoes[j.id] = i;
    });
  }

  /** Mantém o cronômetro correndo para quem ainda está jogando. */
  function atualizarTempos() {
    Array.prototype.forEach.call(document.querySelectorAll('.col-tempo'), function (el) {
      if (el.dataset.fim === '1') return;
      var inicio = +el.dataset.tempo;
      if (inicio > 0) el.textContent = formatarTempo(Date.now() - inicio);
    });
  }

  function montarGradePalavras() {
    var grade = $('gradePalavras');
    grade.innerHTML = '';
    puzzle.words.forEach(function (w) {
      var chip = document.createElement('div');
      chip.className = 'chip-palavra';
      chip.dataset.palavra = w.answer;
      chip.innerHTML = '<span>' + w.raw + '</span><b>0</b>';
      grade.appendChild(chip);
    });
  }

  function desenharPalavras() {
    var contagem = {};
    P.jogadores.forEach(function (j) {
      Object.keys(j.palavras || {}).forEach(function (p) {
        contagem[p] = (contagem[p] || 0) + 1;
      });
    });
    var maior = Math.max(1, Math.max.apply(null, [0].concat(Object.keys(contagem).map(function (k) { return contagem[k]; }))));
    Array.prototype.forEach.call(document.querySelectorAll('.chip-palavra'), function (chip) {
      var n = contagem[chip.dataset.palavra] || 0;
      chip.querySelector('b').textContent = n;
      chip.classList.toggle('dificil', P.jogadores.length >= 3 && n <= maior * 0.34);
    });
  }

  /* ------------------------------------------------------------ convite  */

  function linkDoAluno() {
    var base = location.href.replace(/professor\.html.*$/, 'index.html');
    return base + '?sala=' + encodeURIComponent(P.sala);
  }

  function montarConvite() {
    var link = linkDoAluno();
    $('linkAluno').textContent = link;

    var caixa = $('qr');
    caixa.innerHTML = '';
    if (typeof QRCode !== 'undefined' && location.protocol !== 'file:') {
      try {
        new QRCode(caixa, { text: link, width: 116, height: 116, correctLevel: QRCode.CorrectLevel.M });
        return;
      } catch (e) {}
    }
    caixa.innerHTML = '<div style="color:#334;font-size:.72rem;text-align:center;padding:.4rem;line-height:1.3">' +
      'QR disponível<br>ao publicar<br>em um servidor</div>';
  }

  /* ---------------------------------------------------------- controles  */

  function exportarCSV() {
    var lista = ordenados();
    var linhas = [['posicao', 'nome', 'turma', 'pontos', 'palavras', 'total',
      'letras_reveladas', 'dicas_de_pergunta', 'tempo', 'finalizado'].join(';')];
    lista.forEach(function (j, i) {
      linhas.push([
        i + 1,
        '"' + j.nome.replace(/"/g, "'") + '"',
        '"' + j.turma.replace(/"/g, "'") + '"',
        j.pontos, j.acertos, j.total, j.dicas, j.ajudas,
        formatarTempo(j.tempoMs),
        j.finalizado ? 'sim' : 'nao'
      ].join(';'));
    });
    var blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cruza-ranking-' + P.sala + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function ligarControles() {
    $('btnOrdenar').addEventListener('click', function () {
      var chaves = Object.keys(ORDENS);
      var prox = chaves[(chaves.indexOf(P.ordem) + 1) % chaves.length];
      P.ordem = prox;
      this.textContent = '↕ Ordenar: ' + ORDENS[prox].rotulo;
      P.posicoes = {};
      desenhar();
    });

    $('btnProjecao').addEventListener('click', function () {
      var on = document.body.classList.toggle('projecao');
      this.textContent = on ? '🖥 Modo normal' : '📺 Projeção';
    });

    $('btnTela').addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(function () {});
    });

    $('btnCSV').addEventListener('click', exportarCSV);

    $('btnCopiar').addEventListener('click', function () {
      var link = linkDoAluno();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(function () { toast('Link copiado! 📋', 'bom'); },
          function () { toast('Copie manualmente o link abaixo', 'ruim'); });
      } else {
        toast('Copie manualmente o link abaixo', 'ruim');
      }
    });

    $('btnTrocarSala').addEventListener('click', function () {
      $('campoNovaSala').value = P.sala;
      DB.listarSalas().then(function (salas) {
        var box = $('salasConhecidas');
        box.innerHTML = '';
        salas.slice(0, 12).forEach(function (s) {
          var b = document.createElement('button');
          b.className = 'btn fantasma';
          b.style.cssText = 'padding:.35rem .8rem;font-size:.8rem';
          b.textContent = s;
          b.addEventListener('click', function () { $('campoNovaSala').value = s; });
          box.appendChild(b);
        });
      });
      $('modalSala').showModal();
    });

    $('btnCancelarSala').addEventListener('click', function () { $('modalSala').close(); });
    $('btnConfirmarSala').addEventListener('click', function () {
      var nova = limparCodigo($('campoNovaSala').value);
      if (!nova) { toast('Digite um código válido', 'ruim'); return; }
      $('modalSala').close();
      trocarSala(nova);
      toast('Sala ' + nova + ' aberta 🏫', 'bom');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cena = Scene3D.init($('cena3d'), { raio: 58, altura: 26, velocidade: 0.022 });
    ligarAcesso();
    ligarControles();
    var liberado = false;
    try { liberado = sessionStorage.getItem('cruza:prof') === '1'; } catch (e) {}
    if (liberado) abrirPainel();
  });
})();
