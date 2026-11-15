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
    pr.querySelector('[data-sc-pan]').removeAttribute('data-sc-pan');
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
  // One idea in the hero: the headline lifts away while the crew and the
  // foreground step closer. The pin is only as long as that move.
  var hero = $('#obiekt');
  var L = {};
  $$('[data-layer]', hero).forEach(function (el) { L[el.getAttribute('data-layer')] = el; });
  var heroLast = -1;
  function heroTick() {
    var p = pinP(hero);
    if (p === heroLast) return;
    heroLast = p;
    window.HeroP = p;
    if (reduce) return;
    var e = G.ease(p);
    L.sky.style.transform = 'translate3d(0,' + (e * 4) + '%,0) scale(' + (1 + e * 0.04) + ')';
    L.haze.style.transform = 'translate3d(0,' + (e * 6) + '%,0)';
    L.crew.style.transform = 'translate3d(0,' + (e * 10) + 'vh,0) scale(' + (1 + e * 0.16) + ')';
    L.fore.style.transform = 'translate3d(0,' + (e * 24) + 'vh,0) scale(' + (1 + e * 0.24) + ')';
    var c = G.clamp01((p - 0.2) / 0.7);
    L.copy.style.transform = 'translate3d(0,' + (-c * 10) + 'vh,0)';
    L.copy.style.opacity = String(1 - G.ease(c));
  }

  /* ------------------------------------------------- scope (the peak) -- */
  var scope = $('#pomiar');
  var scv = $('.scope__canvas', scope);
  var tags = $$('.scope__tag', scope);
  var scopeP = 0;

  // timings follow the three copy beats: 0–.30 dirty trace, .30–.62 split into
  // harmonics, .62–1 harmonics settle under their limits
  function cleanFromScope(p) { return G.clamp01((p - 0.5) / 0.32); }

  function drawScope(t) {
    var f = G.fit(scv), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    var p = scopeP;
    var narrow = w < 860 && h > w;
    var x0 = narrow ? 20 : w * 0.42, x1 = narrow ? w - 20 : w - Math.max(24, w * 0.05);
    var top = narrow ? Math.max(110, h * 0.15) : Math.max(76, h * 0.12), bottom = narrow ? h * 0.55 : h * 0.84;

    // graticule
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(238,243,246,0.06)';
    var cols = 10, rows = 8;
    for (var i = 0; i <= cols; i++) { var gx = x0 + (x1 - x0) * i / cols; ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx, bottom); ctx.stroke(); }
    for (var j = 0; j <= rows; j++) { var gy = top + (bottom - top) * j / rows; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }

    var split = G.ease((p - 0.24) / 0.14) * (1 - G.ease((p - 0.84) / 0.12));
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
    ctx.shadowColor = col; ctx.shadowBlur = narrow ? 0 : 10 + clean * 10; ctx.shadowOffsetY = 0;
    G.trace(ctx, function (x) { return G.voltage(s, x, cycles, t); }, x0, x1, mainY, mainAmp, narrow ? 320 : 520);
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
      G.trace(ctx, function (x) { return G.voltage(s, x, cycles, t, hN); }, x0, x1, ly, laneH * 0.07, 300);
      ctx.globalAlpha = 1;
    });

    // THD gauge. The 8 % line is the EN 50160 limit for supply voltage; it is
    // drawn as an illustration, the page labels the whole scene as a simulation.
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
    ctx.fillText('THD ' + G.fmt.thd(r.thd), gx0, gy - 8);
  }

  /* -------------------------------------------------------- services -- */
  // Desktop: list + one detail panel. Phone: accordion. Same markup, same
  // aria-expanded / aria-controls; on desktop one item is always open.
  var wide = matchMedia('(min-width: 861px)');
  var svcBtns = $$('.svc__btn');
  function openSvc(btn, opts) {
    opts = opts || {};
    var wasOpen = btn.classList.contains('is-open');
    var close = wasOpen && !wide.matches && !opts.force;
    svcBtns.forEach(function (b) {
      var on = b === btn && !close;
      b.classList.toggle('is-open', on);
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
      document.getElementById(b.getAttribute('aria-controls')).classList.toggle('is-open', on);
    });
    // on a phone, keep the tapped header where the finger is
    if (!wide.matches && !close && opts.user) {
      var top = btn.getBoundingClientRect().top;
      if (top < 70) scrollBy({ top: top - 80, behavior: 'instant' });
    }
  }
  svcBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { openSvc(b, { user: true }); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (e.key === 'Home') d = -i; else if (e.key === 'End') d = svcBtns.length - 1 - i;
      if (!d) return;
      e.preventDefault();
      var n = svcBtns[(i + d + svcBtns.length) % svcBtns.length];
      n.focus();
      if (wide.matches) openSvc(n);
    });
  });
  // crossing into the desktop layout with everything closed would leave the
  // detail column empty, so make sure one service is open there
  function ensureOpen() { if (wide.matches && !svcBtns.some(function (b) { return b.classList.contains('is-open'); })) openSvc(svcBtns[0], { force: true }); }
  if (wide.addEventListener) wide.addEventListener('change', ensureOpen);
  function showService(id) {
    var b = document.getElementById(id + '-btn');
    if (b) openSvc(b, { force: true });
  }

  /* ----------------------------------------------------------- route -- */
  var route = $('#proces');
  var cableLive = $('.route__cable-live', route);
  cableLive.setAttribute('pathLength', '1');
  var steps = $$('.step', route);

  /* --------------------------------------------------------- explorer -- */
  var site = $('#obiekty');
  var siteTabs = $$('.site__tab', site);
  var sitePanels = $$('.site__panel', site);
  var points = $('.site__points', site);
  var detail = $('.site__detail', site);
  var info = { title: $('.site__title', site), text: $('.site__text', site), gain: $('.site__gain', site), svc: $('.site__svc', site), order: $('.site__order', site) };
  var current = { panel: null, item: null };

  function pickPoint(panel, idx) {
    var items = $$('.site__list > li', panel);
    var li = items[idx];
    current.item = li;
    $$('.spot', panel).forEach(function (s, k) { s.classList.toggle('is-on', k === idx); });
    $$('.site__pt', points).forEach(function (b, k) { b.setAttribute('aria-pressed', k === idx ? 'true' : 'false'); });
    info.title.textContent = $('h4', li).textContent;
    info.text.textContent = $('.site__body', li).textContent;
    info.gain.textContent = $('.site__benefit', li).textContent;
    info.svc.setAttribute('href', '#' + li.getAttribute('data-svc'));
    detail.classList.remove('is-swap'); void detail.offsetWidth; detail.classList.add('is-swap');
  }
  function showSite(key, focus) {
    siteTabs.forEach(function (t) {
      var on = t.getAttribute('data-site') === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) { t.focus(); t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    });
    sitePanels.forEach(function (p) {
      var on = p.id === 'site-' + key;
      p.classList.toggle('is-active', on);
      if (!on) return;
      current.panel = p;
      // the point list is the accessible control; it is rebuilt from the panel's own list
      points.innerHTML = '';
      $$('.site__list > li', p).forEach(function (li, k) {
        var item = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'site__pt'; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<b aria-hidden="true">' + (k + 1) + '</b>';
        b.appendChild(document.createTextNode($('h4', li).textContent));
        b.addEventListener('click', function () { pickPoint(p, k); });
        item.appendChild(b); points.appendChild(item);
      });
      pickPoint(p, 0);
    });
  }
  siteTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showSite(t.getAttribute('data-site')); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = siteTabs[(i + 1) % siteTabs.length];
      else if (e.key === 'ArrowLeft') n = siteTabs[(i - 1 + siteTabs.length) % siteTabs.length];
      else if (e.key === 'Home') n = siteTabs[0];
      else if (e.key === 'End') n = siteTabs[siteTabs.length - 1];
      if (!n) return;
      e.preventDefault();
      showSite(n.getAttribute('data-site'), true);
    });
  });
  sitePanels.forEach(function (p) {
    $$('.spot', p).forEach(function (s, k) { s.addEventListener('click', function () { pickPoint(p, k); }); });
  });
  info.svc.addEventListener('click', function () { showService(current.item.getAttribute('data-svc')); });
  info.order.addEventListener('click', function () {
    prefill(current.item.getAttribute('data-topic'), 'Obiekt: ' + current.panel.getAttribute('data-name') + ', ' + $('h4', current.item).textContent.toLowerCase() + '. ');
  });
  showSite('zaklad');

  /* ------------------------------------------------------------ loop -- */
  var report = $('#kontakt');
  var chrome = $('.chrome');
  function visible(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; }

  var lastY = -1;
  function tick(now) {
    var t = now / 1000;
    var y = window.scrollY, moved = y !== lastY;
    lastY = y;
    // the scope trace animates over time, so it redraws every frame while on screen
    if (visible(scope)) { scopeP = pinP(scope); drawScope(reduce ? 0 : t); }
    if (moved) {
      heroTick();
      chrome.classList.toggle('is-paper', report.getBoundingClientRect().top < 60);
      chrome.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < 70);
      // route: the cable charges and the steps light up as the rail passes
      if (visible(route)) {
        var rp = phone ? G.clamp01((vh * 0.6 - route.getBoundingClientRect().top) / route.offsetHeight) : pinP(route);
        route.style.setProperty('--route', String(rp));
        cableLive.style.setProperty('--cable', String(G.clamp01(rp * 1.1)));
        steps.forEach(function (st, i) { st.classList.toggle('is-live', rp > (i + 0.35) / steps.length * 0.92); });
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ------------------------------------------------------------ form -- */
  var ask = $('.ask');
  var askMsg = $('.ask__msg', ask);
  var submitBtn = $('button[type=submit]', ask);
  var topicSel = ask.elements.topic;
  var MAIL = 'info@energymgmt.pl';
  ask.elements.t.value = String(Date.now()); // time-trap: the server rejects instant submissions

  // Any "Zapytaj o…" link can preselect the topic of the form.
  function prefill(topic, message) {
    if (topic) {
      var opt = $$('option', topicSel).filter(function (o) { return o.value === topic; })[0];
      if (opt) topicSel.value = topic;
    }
    var msg = ask.elements.message;
    if (message && !msg.value.trim()) msg.value = message;
  }
  $$('[data-topic]').forEach(function (a) {
    if (a.tagName !== 'A') return;
    a.addEventListener('click', function () { prefill(a.getAttribute('data-topic')); });
  });

  var msgs = { name: 'Podaj imię i nazwisko.', email: 'Podaj poprawny adres e-mail.' };
  function check(input) {
    var err = document.getElementById(input.id + '-err');
    var ok = input.checkValidity();
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) err.textContent = ok ? '' : msgs[input.name];
    return ok;
  }
  $$('[required]', ask).forEach(function (el) {
    el.addEventListener('blur', function () { if (el.value) check(el); });
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') check(el); });
  });
  function status(state, html) {
    askMsg.setAttribute('data-state', state);
    askMsg.innerHTML = html;
  }

  ask.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = $$('[required]', ask).filter(function (el) { return !check(el); });
    if (bad.length) { bad[0].focus(); status('error', 'Uzupełnij zaznaczone pola.'); return; }

    var data = {};
    ['topic', 'name', 'email', 'company', 'phone', 'message', 'website', 't'].forEach(function (k) { data[k] = (ask.elements[k].value || '').trim(); });
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wysyłanie…';
    status('pending', 'Wysyłamy zapytanie…');

    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(ask.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; });
    }).then(function (r) {
      // success is shown ONLY when the server confirms the message was handed to the mail provider
      if (r.res.ok && r.body && r.body.ok === true) {
        status('ok', 'Dziękujemy, zapytanie zostało wysłane. Odpowiemy na adres ' + escapeHtml(data.email) + '.');
        ask.reset();
        ask.elements.t.value = String(Date.now());
        submitBtn.textContent = 'Wyślij kolejne zapytanie';
        return;
      }
      fail(r.body && r.body.error === 'not_configured'
        ? 'Formularz nie jest jeszcze podłączony do skrzynki. Napisz bezpośrednio na '
        : (r.body && r.body.message) ? escapeHtml(r.body.message) + ' Spróbuj ponownie albo napisz na '
        : 'Nie udało się wysłać zapytania. Spróbuj ponownie albo napisz na ');
    }).catch(function () {
      fail('Brak połączenia z serwerem. Spróbuj ponownie albo napisz na ');
    }).then(function () {
      clearTimeout(timer);
      submitBtn.disabled = false;
      if (askMsg.getAttribute('data-state') !== 'ok') submitBtn.textContent = 'Spróbuj ponownie';
    });
  });
  function fail(prefix) {
    status('error', prefix + '<a href="mailto:' + MAIL + '">' + MAIL + '</a>.');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var yr = $('[data-year]'); if (yr) yr.textContent = String(new Date().getFullYear());
})();
