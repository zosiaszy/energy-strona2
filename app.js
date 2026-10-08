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
  addEventListener('resize', function () { vh = innerHeight; }, { passive: true });

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
  function heroTick() {
    var p = pinP(hero);
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
      var gone = hN === 1 ? 0 : s['h' + hN + 'T'];
      var a = split * (1 - gone * 0.92);
      var tag = tags[k];
      if (tag) {
        tag.style.opacity = String(split);
        tag.style.top = (ly - laneH * 0.07 * (hN === 1 ? 1 : 0.5) - 26) + 'px';
        tag.style.left = x0 + 'px';
        tag.classList.toggle('is-gone', gone > 0.6);
      }
      if (a < 0.01) return;
      ctx.globalAlpha = a;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = hN === 1 ? 'rgb(96,196,240)' : 'rgb(242,165,58)';
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

  /* ------------------------------------------------ analyzer strip ----- */
  var meter = $('.meter');
  var mcv = $('.meter__canvas', meter);
  var live = {};
  $$('[data-live]', meter).forEach(function (el) { live[el.getAttribute('data-live')] = el; });

  var stageList = $('.meter__stages', meter);
  var stages = $$('[data-sc-stage-name]').map(function (sec) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + sec.id;
    a.textContent = sec.getAttribute('data-sc-stage-name');
    li.appendChild(a);
    stageList.appendChild(li);
    return { sec: sec, a: a };
  });

  function drawMeter(t, s) {
    var f = G.fit(mcv), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(238,243,246,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = G.colour(G.clean);
    // the strip scrolls like a running recorder
    var off = reduce ? 0 : t * 0.35;
    G.trace(ctx, function (x) { return G.voltage(s, x + off, 4, t); }, 0, w, h / 2, h * 0.36, 260);
  }

  var lastRead = 0;
  function setRead(map, r) {
    if (map.thd) { map.thd.innerHTML = G.fmt.thd(r.thd); map.thd.classList.toggle('is-bad', r.thd > 8); map.thd.classList.toggle('is-good', r.thd <= 8); }
    if (map.u) { map.u.innerHTML = G.fmt.u(r.u); map.u.classList.toggle('is-bad', r.u < 225); }
    if (map.pf) { map.pf.innerHTML = G.fmt.pf(r.tg); map.pf.classList.toggle('is-bad', r.tg > 0.4); map.pf.classList.toggle('is-good', r.tg <= 0.4); }
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
  // "Zamów pomiar tego obiektu" preselects step 1 of the order
  info.order.addEventListener('click', function () {
    var r = $$('input[name=obiekt]').filter(function (x) { return x.value === siteChoice; })[0];
    if (r) { r.checked = true; syncSlip(); go(1); }
  });
  showSite('zaklad');

  /* ------------------------------------------------------------ loop -- */
  function visible(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; }

  function tick(now) {
    var t = now / 1000;
    heroTick();

    scopeP = pinP(scope);
    var sr = scope.getBoundingClientRect();
    G.clean = sr.top > 0 ? 0 : cleanFromScope(scopeP);
    var s = G.stateFor(G.clean);

    if (visible(scope)) drawScope(t);

    // dock the strip into the protocol
    var rr = report.getBoundingClientRect();
    var docked = rr.top < vh * 0.55;
    meter.classList.toggle('is-docked', docked);
    chrome.classList.toggle('is-paper', rr.top < 60);
    if (!docked && !document.hidden) drawMeter(t, s);
    if (now - lastRead > 140) {
      lastRead = now;
      setRead(live, G.readouts(s, t));
    }

    // route cable
    if (visible(route)) {
      var rp = phone ? G.clamp01((vh * 0.6 - route.getBoundingClientRect().top) / route.offsetHeight) : pinP(route);
      route.style.setProperty('--route', String(rp));
      cableLive.style.setProperty('--cable', String(G.clamp01(rp * 1.1)));
      steps.forEach(function (st, i) { st.classList.toggle('is-live', rp > (i + 0.35) / steps.length * 0.92); });
    }

    // current stage
    var cur = null;
    stages.forEach(function (st) { if (st.sec.getBoundingClientRect().top < vh * 0.5) cur = st; });
    stages.forEach(function (st) { st.a.setAttribute('aria-current', st === cur ? 'true' : 'false'); });

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------------------------------------------------------- wizard -- */
  var wiz = $('.wiz');
  var wsteps = $$('.wiz__step', wiz);
  var prog = $$('.wiz__progress li', wiz);
  var slip = $('.slip');
  var slipF = {};
  $$('[data-slip]', slip).forEach(function (el) { slipF[el.getAttribute('data-slip')] = el; });
  var stepNow = 0;
  var msgs = {
    name: 'Podaj imię i nazwisko.',
    email: 'Podaj poprawny adres e-mail.',
    phone: 'Podaj numer telefonu.'
  };
  var SCOPE = {
    'Wyłączenia falowników lub napędów': 'analiza jakości energii',
    'Opłaty za energię bierną': 'kompensacja mocy biernej, tg φ',
    'Grzanie się urządzeń': 'harmoniczne, obciążenie',
    'Potrzebne testy NC RfG': 'testy NC RfG',
    'Uruchomienie lub przegląd stacji': 'stacja, sterowniki polowe, nastawy',
    'Audyt i koszty energii': 'audyt energetyczny'
  };

  function setSlip(key, val) {
    var el = slipF[key];
    var v = val || el.getAttribute('data-empty');
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.toggle('is-filled', !!val);
    el.classList.remove('is-ink'); void el.offsetWidth; if (val) el.classList.add('is-ink');
  }
  function syncSlip() {
    var o = $('input[name=obiekt]:checked', wiz);
    setSlip('obiekt', o ? o.value : '');
    var sit = $$('input[name=sytuacja]:checked', wiz).map(function (x) { return x.value; });
    var opis = wiz.opis.value.trim();
    setSlip('sytuacja', sit.join(', ') + (opis ? (sit.length ? '. ' : '') + opis : ''));
    var who = [wiz.elements['name'].value.trim(), wiz.company.value.trim()].filter(Boolean).join(', ');
    var how = [wiz.phone.value.trim(), wiz.email.value.trim()].filter(Boolean).join(' · ');
    setSlip('kontakt', [who, how].filter(Boolean).join(' · '));
    var sc = sit.map(function (x) { return SCOPE[x]; }).filter(Boolean);
    setSlip('zakres', sc.length ? sc.join('; ') : '');
  }
  slipF.date.textContent = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  function check(input) {
    var label = input.closest('.f');
    if (!label || !msgs[input.name]) return true;
    var ok = input.checkValidity();
    if (ok) label.removeAttribute('data-error'); else label.setAttribute('data-error', msgs[input.name]);
    return ok;
  }
  function go(n) {
    stepNow = n;
    wsteps.forEach(function (st, i) { st.hidden = i !== n; st.classList.toggle('is-on', i === n); });
    prog.forEach(function (li, i) { li.classList.toggle('is-on', i <= n); });
    var first = $('input, textarea', wsteps[n]);
    if (first && document.activeElement && wiz.contains(document.activeElement)) first.focus({ preventScroll: true });
  }
  function valid(n) {
    var msg = $('.wiz__msg', wsteps[n]);
    msg.textContent = '';
    if (n === 0 && !$('input[name=obiekt]:checked', wiz)) { msg.textContent = 'Wybierz rodzaj obiektu.'; return false; }
    if (n === 1 && !$$('input[name=sytuacja]:checked', wiz).length && !wiz.opis.value.trim()) { msg.textContent = 'Zaznacz przynajmniej jedną sytuację albo ją opisz.'; return false; }
    return true;
  }
  $$('[data-next]', wiz).forEach(function (b) { b.addEventListener('click', function () { if (valid(stepNow)) go(stepNow + 1); }); });
  $$('[data-prev]', wiz).forEach(function (b) { b.addEventListener('click', function () { go(stepNow - 1); }); });
  wiz.addEventListener('change', syncSlip);
  wiz.addEventListener('input', function (e) {
    syncSlip();
    var f = e.target.closest('.f'); if (f && f.hasAttribute('data-error')) check(e.target);
  });
  $$('input', wsteps[2]).forEach(function (el) { el.addEventListener('blur', function () { if (el.value) check(el); }); });
  // a click on an object card moves straight on: one less decision
  $$('input[name=obiekt]', wiz).forEach(function (r) {
    r.addEventListener('click', function () { setTimeout(function () { if (stepNow === 0) go(1); }, 220); });
  });

  wiz.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('.wiz__msg', wsteps[2]);
    var bad = $$('[required]', wsteps[2]).filter(function (el) { return !check(el); });
    if (bad.length) { bad[0].focus(); msg.textContent = 'Uzupełnij zaznaczone pola.'; msg.classList.remove('is-ok'); return; }
    var btn = $('button[type=submit]', wiz);
    btn.disabled = true; msg.textContent = 'Wysyłanie…';
    // TODO: podpiąć endpoint (np. Formspree / Resend / własne API)
    setTimeout(function () {
      btn.disabled = false;
      slip.classList.add('is-stamped');
      msg.textContent = 'Dziękujemy, zgłoszenie przyjęte. Oddzwonimy, żeby ustalić termin.';
      msg.classList.add('is-ok');
    }, 700);
  });

  var yr = $('[data-year]'); if (yr) yr.textContent = String(new Date().getFullYear());
})();
