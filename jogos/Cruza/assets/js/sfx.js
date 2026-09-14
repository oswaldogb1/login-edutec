/* ==========================================================================
   CRUZA! — Efeitos sonoros sinteticos (WebAudio, sem arquivos externos)
   ========================================================================== */
(function (global) {
  'use strict';

  var ctx = null;
  var ligado = true;

  function ac() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tom(freq, dur, tipo, vol, atraso) {
    if (!ligado) return;
    var c = ac();
    if (!c) return;
    var t = c.currentTime + (atraso || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  var SFX = {
    ativar: function () { ac(); },
    mudo: function (v) { ligado = !v; },
    estaLigado: function () { return ligado; },
    tecla: function () { tom(520, 0.06, 'triangle', 0.07); },
    apagar: function () { tom(220, 0.07, 'sine', 0.06); },
    mover: function () { tom(680, 0.05, 'sine', 0.05); },
    erro: function () { tom(180, 0.18, 'sawtooth', 0.09); tom(140, 0.22, 'sawtooth', 0.07, 0.08); },
    acerto: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tom(f, 0.22, 'triangle', 0.16, i * 0.075);
      });
    },
    dica: function () { tom(880, 0.1, 'sine', 0.1); tom(1174, 0.14, 'sine', 0.09, 0.09); },
    vitoria: function () {
      [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5].forEach(function (f, i) {
        tom(f, 0.3, 'triangle', 0.17, i * 0.12);
      });
    },
    novoLider: function () {
      [784, 988, 1175].forEach(function (f, i) { tom(f, 0.25, 'square', 0.08, i * 0.1); });
    }
  };

  global.SFX = SFX;
})(window);
