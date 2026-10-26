/* Grid: one waveform model shared by the analyzer strip, the scope and the
   protocol. Readouts are computed from the same amplitudes that are drawn,
   so the numbers on screen always describe the trace on screen. */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };

  var DIRTY = { h3: 0.12, h5: 0.09, h7: 0.05, sag: 1, flicker: 1, pf: 0.82 };
  var CLEAN = { h3: 0.015, h5: 0.012, h7: 0.008, sag: 0, flicker: 0, pf: 0.98 };
  var PHASE = { h3: 0.6, h5: 2.1, h7: 4.0 };

  // Each disturbance is brought within its limit in its own window of the
  // overall clean value, highest order first, so the order is visible.
  var ORDER = ['h7', 'h5', 'h3', 'sag', 'pf'];
  function stateFor(c) {
    var s = {};
    ORDER.forEach(function (k, i) {
      var t = ease((c - i * 0.17) / 0.32);
      s[k] = lerp(DIRTY[k], CLEAN[k], t);
      s[k + 'T'] = t;
    });
    s.flicker = lerp(DIRTY.flicker, CLEAN.flicker, s.sagT);
    return s;
  }

  function envelope(s, x, t) {
    // a voltage dip travelling through the window, and a slow flicker
    var dipPos = ((t * 0.32) % 1.6) - 0.3;
    var d = x - dipPos;
    var dip = Math.exp(-(d * d) / 0.006) * 0.22 * s.sag;
    var fl = Math.sin(t * 7.3 + x * 3) * 0.035 * s.flicker;
    return 1 - dip + fl;
  }

  // x: 0..1 across the window, cycles: how many 50 Hz periods fit, t: seconds
  function voltage(s, x, cycles, t, only) {
    var w = TAU * x * cycles;
    if (only === 1) return Math.sin(w);
    if (only === 3) return s.h3 * Math.sin(3 * w + PHASE.h3) * 4;
    if (only === 5) return s.h5 * Math.sin(5 * w + PHASE.h5) * 4;
    if (only === 7) return s.h7 * Math.sin(7 * w + PHASE.h7) * 4;
    var v = Math.sin(w) + s.h3 * Math.sin(3 * w + PHASE.h3) + s.h5 * Math.sin(5 * w + PHASE.h5) + s.h7 * Math.sin(7 * w + PHASE.h7);
    // a little switching hash on the dirty signal
    v += (s.h7 / 0.05) * 0.018 * Math.sin(w * 41 + t * 30);
    return v * envelope(s, x, t);
  }
  function current(s, x, cycles) {
    return 0.62 * Math.sin(TAU * x * cycles - Math.acos(s.pf));
  }

  function readouts(s, t) {
    var thd = Math.sqrt(s.h3 * s.h3 + s.h5 * s.h5 + s.h7 * s.h7) * 100;
    var u = 230.2 - 8.6 * s.sag - 0.9 * s.flicker * Math.sin((t || 0) * 1.7);
    return { thd: thd, u: u, pf: s.pf, tg: Math.tan(Math.acos(s.pf)) };
  }
  var fmt = {
    thd: function (v) { return v.toFixed(1).replace('.', ',') + ' %'; },
    u: function (v) { return v.toFixed(1).replace('.', ',') + ' V'; },
    pf: function (v) { return v.toFixed(2).replace('.', ','); }
  };

  function mix(a, b, t) {
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
  }
  var AMBER = [242, 165, 58], BLUE = [96, 196, 240];
  function colour(c) { return mix(AMBER, BLUE, ease(c)); }

  // Size a canvas to its CSS box at a capped DPR and return the 2D context.
  function fit(cv) {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function trace(ctx, fn, x0, x1, yMid, amp, steps) {
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var x = i / steps;
      var px = x0 + (x1 - x0) * x, py = yMid - fn(x) * amp;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }

  global.Grid = {
    stateFor: stateFor, voltage: voltage, current: current, readouts: readouts,
    fmt: fmt, colour: colour, fit: fit, trace: trace, ease: ease, clamp01: clamp01, lerp: lerp,
    clean: 0 // page-wide cleanliness, written by app.js
  };
})(window);
