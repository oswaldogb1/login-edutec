/* ==========================================================================
   CRUZA! — Camada de dados (Firebase Realtime Database via REST)
   REGRA DE OURO: este modulo NUNCA apaga nada no servidor.
   Escreve apenas com PATCH (merge) dentro do namespace /cruzada_cidades.
   ========================================================================== */
(function (global) {
  'use strict';

  var BASE = 'https://edutec-arnaldo-default-rtdb.firebaseio.com';
  var ROOT = 'cruzada_cidades';

  function url(path) {
    return BASE + '/' + ROOT + (path ? '/' + path : '') + '.json';
  }

  function salaPath(sala, rest) {
    return 'salas/' + encodeURIComponent(sala) + (rest ? '/' + rest : '');
  }

  /** PATCH = merge. Jamais remove chaves irmas no servidor. */
  function patch(path, data) {
    return fetch(url(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error('Firebase PATCH ' + res.status);
      return res.json();
    });
  }

  function get(path, query) {
    return fetch(url(path) + (query ? '?' + query : ''), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Firebase GET ' + res.status);
        return res.json();
      });
  }

  /* ---------------------------------------------------------------- salas */

  function registrarSala(sala) {
    return patch(salaPath(sala), {
      codigo: sala,
      criadaEm: Date.now(),
      jogo: 'cruzada-cidades'
    }).catch(function () { /* silencioso: nao bloqueia o jogo */ });
  }

  function listarSalas() {
    return get('salas', 'shallow=true').then(function (obj) {
      return obj ? Object.keys(obj) : [];
    }).catch(function () { return []; });
  }

  /* ------------------------------------------------------------ jogadores */

  function novoId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function salvarJogador(sala, id, dados) {
    dados.atualizadoEm = Date.now();
    return patch(salaPath(sala, 'jogadores/' + id), dados);
  }

  /** Registra uma palavra acertada sem tocar nas demais chaves. */
  function salvarPalavra(sala, id, palavra, info) {
    var payload = {};
    payload[palavra] = info;
    return patch(salaPath(sala, 'jogadores/' + id + '/palavras'), payload);
  }

  function lerJogadores(sala) {
    return get(salaPath(sala, 'jogadores')).then(function (obj) { return obj || {}; });
  }

  /* ------------------------------------------------ tempo real (streaming) */

  /**
   * Observa /salas/{sala}/jogadores em tempo real.
   * Usa o streaming REST (EventSource). Se falhar, cai para polling.
   * Retorna uma funcao para encerrar a observacao.
   */
  function observarJogadores(sala, onData, onStatus) {
    var estado = {};
    var fechado = false;
    var es = null, timer = null;

    function emitir() { onData(JSON.parse(JSON.stringify(estado))); }

    function aplicar(path, data, merge) {
      if (path === '/' || path === '') {
        if (merge && data) { Object.keys(data).forEach(function (k) { setIn('/' + k, data[k]); }); }
        else { estado = data || {}; }
        return;
      }
      setIn(path, data, merge);
    }

    function setIn(path, data, merge) {
      var parts = path.split('/').filter(Boolean);
      var last = parts.pop();
      var node = estado;
      parts.forEach(function (p) {
        if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
        node = node[p];
      });
      if (data === null && !merge) { delete node[last]; return; } // apenas em memoria
      if (merge && typeof data === 'object' && data !== null && typeof node[last] === 'object' && node[last]) {
        Object.keys(data).forEach(function (k) { node[last][k] = data[k]; });
      } else {
        node[last] = data;
      }
    }

    function polling() {
      if (timer) return;
      onStatus && onStatus('polling');
      var tick = function () {
        if (fechado) return;
        lerJogadores(sala).then(function (obj) {
          estado = obj; emitir(); onStatus && onStatus('polling');
        }).catch(function () { onStatus && onStatus('offline'); });
      };
      tick();
      timer = setInterval(tick, 4000);
    }

    function stream() {
      if (typeof EventSource === 'undefined') return polling();
      try {
        es = new EventSource(url(salaPath(sala, 'jogadores')));
      } catch (e) { return polling(); }

      es.addEventListener('put', function (ev) {
        var msg = JSON.parse(ev.data);
        aplicar(msg.path, msg.data, false);
        emitir(); onStatus && onStatus('live');
      });
      es.addEventListener('patch', function (ev) {
        var msg = JSON.parse(ev.data);
        aplicar(msg.path, msg.data, true);
        emitir(); onStatus && onStatus('live');
      });
      es.addEventListener('keep-alive', function () { onStatus && onStatus('live'); });
      es.onerror = function () {
        if (fechado) return;
        onStatus && onStatus('reconectando');
        // EventSource ja tenta reconectar sozinho; garante dados com polling leve
        if (!timer) setTimeout(function () { if (!fechado && es && es.readyState !== 1) polling(); }, 6000);
      };
    }

    stream();

    return function encerrar() {
      fechado = true;
      if (es) es.close();
      if (timer) clearInterval(timer);
    };
  }

  global.DB = {
    BASE: BASE, ROOT: ROOT,
    url: url,
    novoId: novoId,
    registrarSala: registrarSala,
    listarSalas: listarSalas,
    salvarJogador: salvarJogador,
    salvarPalavra: salvarPalavra,
    lerJogadores: lerJogadores,
    observarJogadores: observarJogadores
  };
})(window);
