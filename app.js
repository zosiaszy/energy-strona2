/* Energy Management · page choreography. Bespoke code lives here; the
   scrollcraft engine handles pins, cues, reveals and drift. */
(function () {
  'use strict';
  var G = window.Grid;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // On phones the process reads better as a vertical timeline than a
  // sideways pan, so the act is re-declared before the engine reads it.
  var phone = matchMedia('(max-width: 860px)').matches;
  if (phone) {
    var pr = document.getElementById('proces');
    pr.setAttribute('data-sc-act', 'flow');
    pr.removeAttribute('data-sc-span');
    pr.classList.add('route--stack', 'sc-section');
    var rail = pr.querySelector('[data-sc-pan]');
    rail.removeAttribute('data-sc-pan');
    pr.querySelector('[data-sc-stage]').removeAttribute('data-sc-stage');
  }

  ScrollCraft.mount(document.body);

  var vh = innerHeight;
  addEventListener('resize', function () { vh = innerHeight; lastY = -1; heroLast = -1; }, { passive: true });

  // progress through a pinned act: 0 when the stage sticks, 1 when it releases
  function pinP(el) {
    var r = el.getBoundingClientRect();
    var travel = r.height - vh;
    return travel > 0 ? G.clamp01(-r.top / travel) : (r.top < 0 ? 1 : 0);
  }

  /* ------------------------------------------------------------ hero -- */
  var hero = $('#obiekt');
  var L = {};
  $$('[data-layer]', hero).forEach(function (el) { L[el.getAttribute('data-layer')] = el; });
  var heroLast = -1;
  function heroTick() {
    var p = pinP(hero);
    // past the hero (or holding still) the layers are already where they belong
    if (p === heroLast) return;
    heroLast = p;
    window.HeroP = p;
    if (reduce) { L.beat.style.opacity = p > 0.45 ? '1' : '0'; L.copy.style.opacity = p > 0.45 ? '0' : '1'; return; }
    var e = G.ease(p);
    L.sky.style.transform = 'translate3d(0,' + (e * 4) + '%,0) scale(' + (1 + e * 0.04) + ')';
    L.haze.style.transform = 'translate3d(0,' + (e * 6) + '%,0)';
    L.crew.style.transform = 'translate3d(0,' + (e * 14) + 'vh,0) scale(' + (1 + e * 0.22) + ')';
    L.fore.style.transform = 'translate3d(0,' + (e * 30) + 'vh,0) scale(' + (1 + e * 0.3) + ')';
    var c = G.clamp01((p - 0.12) / 0.5);
    L.copy.style.transform = 'translate3d(0,' + (-c * 12) + 'vh,0)';
    L.copy.style.opacity = String(1 - G.ease(c));
    var b = G.clamp01((p - 0.5) / 0.25);
    L.beat.style.opacity = String(G.ease(b) * (1 - G.ease((p - 0.92) / 0.08)));
    L.beat.style.transform = 'translate3d(0,' + ((1 - G.ease(b)) * 4) + 'vh,0)';
  }

  /* ------------------------------------------------- scope (the peak) -- */
  var scope = $('#pomiar');
  var scv = $('.scope__canvas', scope);
  var tags = $$('.scope__tag', scope);
  var scopeP = 0;

  function cleanFromScope(p) { return G.clamp01((p - 0.48) / 0.3); }

  function drawScope(t) {
    var f = G.fit(scv), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    var p = scopeP;
    var narrow = w < 860 && h > w;
    var x0 = narrow ? 20 : w * 0.40, x1 = narrow ? w - 20 : w - Math.max(24, w * 0.05);
    var top = narrow ? Math.max(120, h * 0.17) : Math.max(76, h * 0.12), bottom = narrow ? h * 0.6 : h * 0.86;

    // graticule
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(238,243,246,0.055)';
    var cols = 10, rows = 8;
    for (var i = 0; i <= cols; i++) { var gx = x0 + (x1 - x0) * i / cols; ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx, bottom); ctx.stroke(); }
    for (var j = 0; j <= rows; j++) { var gy = top + (bottom - top) * j / rows; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }

    var split = G.ease((p - 0.2) / 0.14) * (1 - G.ease((p - 0.74) / 0.12));
    var clean = cleanFromScope(p);
    var s = G.stateFor(clean);
    var cycles = narrow ? 2 : 3;
    var mid = (top + bottom) / 2;
    var laneH = (bottom - top);
    var mainY = G.lerp(mid, top + laneH * 0.14, split);
    var mainAmp = G.lerp(laneH * 0.3, laneH * 0.1, split);
    var col = G.colour(clean);

    // current trace, dim, shows the phase shift that cos φ measures
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(238,243,246,' + (0.22 * (1 - split * 0.7)) + ')';
    G.trace(ctx, function (x) { return G.current(s, x, cycles); }, x0, x1, mainY, mainAmp, 240);
    ctx.setLineDash([]);

    // main voltage
    ctx.lineWidth = narrow ? 2 : 2.4;
    ctx.strokeStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 10 + clean * 10; ctx.shadowOffsetY = 0;
    G.trace(ctx, function (x) { return G.voltage(s, x, cycles, t); }, x0, x1, mainY, mainAmp, 520);
    ctx.shadowBlur = 0;

    // component lanes
    var lanes = [[1, 0.36], [3, 0.56], [5, 0.73], [7, 0.9]];
    lanes.forEach(function (ln, k) {
      var hN = ln[0], ly = top + laneH * ln[1];
      // harmonics never disappear; they settle under their limit and stay on screen
      var ok = hN === 1 ? 0 : s['h' + hN + 'T'];
      var a = split * (1 - ok * 0.35);
      var tag = tags[k];
      if (tag) {
        tag.style.opacity = String(split);
        tag.style.top = (ly - laneH * 0.07 * (hN === 1 ? 1 : 0.5) - 26) + 'px';
        tag.style.left = x0 + 'px';
        tag.classList.toggle('is-ok', ok > 0.6);
      }
      if (a < 0.01) return;
      ctx.globalAlpha = a;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = hN === 1 ? 'rgb(96,196,240)' : G.colour(ok);
      G.trace(ctx, function (x) { return G.voltage(s, x, cycles, t, hN); }, x0, x1, ly, laneH * 0.07, 400);
      ctx.globalAlpha = 1;
    });

    // THD gauge against the EN 50160 limit
    var r = G.readouts(s, t);
    var gx0 = x0, gx1 = narrow ? x1 : x0 + (x1 - x0) * 0.5, gy = narrow ? top - 26 : top - 30;
    var maxT = 20;
    ctx.fillStyle = 'rgba(238,243,246,0.08)';
    ctx.fillRect(gx0, gy, gx1 - gx0, 4);
    ctx.fillStyle = col;
    ctx.fillRect(gx0, gy, (gx1 - gx0) * Math.min(1, r.thd / maxT), 4);
    var lim = gx0 + (gx1 - gx0) * 8 / maxT;
    ctx.fillStyle = 'rgba(238,243,246,0.7)';
    ctx.fillRect(lim - 1, gy - 6, 2, 16);
    ctx.font = '500 12px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(157,173,185,0.95)';
    ctx.fillText(narrow ? 'limit 8 %' : 'limit EN 50160 · 8 %', lim + 8, gy - 4);
    ctx.fillStyle = col;
    ctx.font = '500 ' + (narrow ? 13 : 14) + 'px "Geist Mono", ui-monospace, monospace';
    ctx.fillText('THD ' + G.fmt.thd(r.thd).replace(' ', ' '), gx0, gy - 8);
  }

  /* -------------------------------------------------------- services -- */
  $$('.draw').forEach(function (svg) {
    $$('path, circle, rect', svg).forEach(function (el) {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength()) + 1); } catch (e) { /* noop */ }
    });
  });
  var svcs = $$('.svc');
  svcs.forEach(function (li) {
    var btn = $('.svc__btn', li);
    btn.addEventListener('click', function () {
      var open = !li.classList.contains('is-open');
      svcs.forEach(function (o) { o.classList.remove('is-open'); $('.svc__btn', o).setAttribute('aria-expanded', 'false'); });
      if (open) { li.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ----------------------------------------------------------- route -- */
  var route = $('#proces');
  var cableLive = $('.route__cable-live', route);
  cableLive.setAttribute('pathLength', '1');
  var steps = $$('.step', route);

  /* --------------------------------------------------------- explorer -- */
  var report = $('#kontakt');
  var chrome = $('.chrome');
  var site = $('#obiekty');
  var siteTabs = $$('.site__tab', site);
  var sitePanels = $$('.site__panel', site);
  var info = { title: $('.site__title', site), text: $('.site__text', site), svc: $('.site__svc', site), order: $('.site__order', site) };
  var siteChoice = 'Zakład produkcyjny';

  function prepDraw(svg) {
    $$('.ln', svg).forEach(function (el) {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength()) + 1); } catch (e) { /* noop */ }
    });
  }
  function pickSpot(btn) {
    var panel = btn.closest('.site__panel');
    $$('.spot', panel).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    info.title.textContent = btn.getAttribute('data-title');
    info.text.textContent = btn.getAttribute('data-body');
    info.svc.setAttribute('href', '#' + btn.getAttribute('data-svc'));
    info.svc.setAttribute('data-svc', btn.getAttribute('data-svc'));
    var box = $('.site__info', site);
    box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap');
  }
  function showSite(key, focus) {
    siteTabs.forEach(function (t) {
      var on = t.getAttribute('data-site') === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    sitePanels.forEach(function (p) {
      var on = p.id === 'site-' + key;
      p.hidden = !on;
      p.classList.remove('is-active');
      if (on) {
        siteChoice = p.getAttribute('data-name');
        void p.offsetWidth; // restart the line-drawing
        p.classList.add('is-active');
        pickSpot($('.spot', p));
      }
    });
  }
  sitePanels.forEach(function (p) { prepDraw(p); });
  siteTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showSite(t.getAttribute('data-site')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = siteTabs[(i + d + siteTabs.length) % siteTabs.length];
      showSite(n.getAttribute('data-site'), true);
    });
  });
  $$('.spot', site).forEach(function (b) {
    b.addEventListener('click', function () { pickSpot(b); });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) b.addEventListener('mouseenter', function () { pickSpot(b); });
  });
  // "Zobacz usługę" opens the matching row in the index
  info.svc.addEventListener('click', function () {
    var id = info.svc.getAttribute('data-svc');
    var row = document.getElementById(id);
    if (row) { var btn = row.closest('.svc').querySelector('.svc__btn'); if (!row.closest('.svc').classList.contains('is-open')) btn.click(); }
  });
  // "Poproś o ofertę" under a measuring point starts the message with that object
  info.order.addEventListener('click', function () {
    var opis = $('.ask textarea[name=opis]');
    if (opis && !opis.value.trim()) opis.value = 'Obiekt: ' + siteChoice + '. ';
  });
  showSite('zaklad');

  /* ------------------------------------------------------------ loop -- */
  function visible(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; }

  var lastY = -1;
  function tick(now) {
    var t = now / 1000;
    var y = window.scrollY, moved = y !== lastY;
    lastY = y;

    // the scope trace animates over time, so it redraws every frame while on screen
    if (visible(scope)) { scopeP = pinP(scope); drawScope(t); }

    // everything else depends only on scroll position: skip frames where it held still
    if (!moved) { requestAnimationFrame(tick); return; }
    heroTick();

    chrome.classList.toggle('is-paper', report.getBoundingClientRect().top < 60);

    // route cable
    if (visible(route)) {
      var rp = phone ? G.clamp01((vh * 0.6 - route.getBoundingClientRect().top) / route.offsetHeight) : pinP(route);
      route.style.setProperty('--route', String(rp));
      cableLive.style.setProperty('--cable', String(G.clamp01(rp * 1.1)));
      steps.forEach(function (st, i) { st.classList.toggle('is-live', rp > (i + 0.35) / steps.length * 0.92); });
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ------------------------------------------------------------ form -- */
  var ask = $('.ask');
  var askMsg = $('.ask__msg', ask);
  var msgs = {
    name: 'Podaj imię i nazwisko.',
    email: 'Podaj poprawny adres e-mail.'
  };
  function check(input) {
    var label = input.closest('.f');
    if (!label || !msgs[input.name]) return true;
    var ok = input.checkValidity();
    if (ok) label.removeAttribute('data-error'); else label.setAttribute('data-error', msgs[input.name]);
    return ok;
  }
  $$('[required]', ask).forEach(function (el) {
    el.addEventListener('blur', function () { if (el.value) check(el); });
    el.addEventListener('input', function () { if (el.closest('.f').hasAttribute('data-error')) check(el); });
  });
  ask.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = $$('[required]', ask).filter(function (el) { return !check(el); });
    if (bad.length) { bad[0].focus(); askMsg.textContent = 'Uzupełnij zaznaczone pola.'; askMsg.classList.remove('is-ok'); return; }
    var btn = $('button[type=submit]', ask);
    btn.disabled = true; askMsg.textContent = 'Wysyłanie…';
    // TODO: podpiąć endpoint (np. Formspree / Resend / własne API)
    setTimeout(function () {
      btn.disabled = false;
      askMsg.textContent = 'Dziękujemy, zapytanie przyjęte. Odezwiemy się z ofertą.';
      askMsg.classList.add('is-ok');
    }, 700);
  });

  var yr = $('[data-year]'); if (yr) yr.textContent = String(new Date().getFullYear());
})();
