/* AI2 World engine: map, level view, quiz, reflection, saved progress.
   Each world file calls AI2.register({...}); see ea.js for the shape. */
(function () {
  'use strict';
  var AI2 = window.AI2 = { worlds: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var INK = '#231a52';

  /* ---------- saved progress (this browser only) ---------- */
  var KEY = 'ai2-world-v1', S = { w: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) S = JSON.parse(raw) || S; } catch (e) {}
  if (!S.w) S.w = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function ws(id) { return S.w[id] || (S.w[id] = { best: -1, of: 0, conf: 0, notes: {} }); }
  function coins() { var c = 0; AI2.worlds.forEach(function (w) { var s = S.w[w.id]; if (s && s.best > 0) c += s.best * 10; }); return c; }
  function stars(w) { var s = ws(w.id); if (s.best < 0 || !s.of) return 0; var r = s.best / s.of; return r >= 1 ? 3 : r >= 0.8 ? 2 : r >= 0.6 ? 1 : 0; }

  /* ---------- sound ---------- */
  var actx = null, soundOn = true;
  function tone(notes) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime;
      notes.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.045, t + n[2]);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[2] + n[1]);
        o.connect(g); g.connect(actx.destination);
        o.start(t + n[2]); o.stop(t + n[2] + n[1] + 0.02);
      });
    } catch (e) {}
  }
  var sfx = AI2.sfx = {
    coin: function () { tone([[988, 0.08, 0], [1319, 0.3, 0.08]]); },
    ok: function () { tone([[659, 0.08, 0], [880, 0.2, 0.08]]); },
    bad: function () { tone([[220, 0.18, 0], [165, 0.22, 0.12]]); },
    open: function () { tone([[523, 0.07, 0], [659, 0.07, 0.07], [784, 0.12, 0.14]]); },
    win: function () { tone([[523, 0.1, 0], [659, 0.1, 0.1], [784, 0.1, 0.2], [1047, 0.45, 0.3]]); }
  };

  /* ---------- small UI kit used by the demos ---------- */
  var UI = AI2.ui = { el: el, shuffle: shuffle, reduce: reduce, INK: INK };
  UI.slider = function (host, o) {
    var wrap = el('label', 'ctl'), top = el('span', 'ctl-top'), val = el('output', 'ctl-val');
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = o.min; inp.max = o.max; inp.step = o.step || 1; inp.value = o.value;
    function show() { val.textContent = o.fmt ? o.fmt(+inp.value) : inp.value; }
    inp.addEventListener('input', function () { show(); if (o.onInput) o.onInput(+inp.value); });
    top.appendChild(el('span', 'ctl-name', o.label)); top.appendChild(val);
    wrap.appendChild(top); wrap.appendChild(inp); host.appendChild(wrap); show();
    return { el: wrap, get: function () { return +inp.value; }, set: function (v, silent) { inp.value = v; show(); if (!silent && o.onInput) o.onInput(+inp.value); } };
  };
  UI.button = function (host, text, cls, fn) {
    var b = el('button', 'btn ' + (cls || ''), text); b.type = 'button'; b.addEventListener('click', fn); host.appendChild(b); return b;
  };
  UI.toggle = function (host, text, on, fn) {
    var b = el('button', 'tgl', text); b.type = 'button'; b.setAttribute('aria-pressed', String(!!on));
    b.addEventListener('click', function () { var v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); fn(v); });
    host.appendChild(b); return b;
  };
  UI.presets = function (host, label, items, fn) {
    var row = el('div', 'presets'); row.appendChild(el('span', 'presets-l', label));
    items.forEach(function (it) { var b = el('button', 'chip-btn', it.t); b.type = 'button'; b.addEventListener('click', function () { fn(it); }); row.appendChild(b); });
    host.appendChild(row); return row;
  };
  UI.canvas = function (host, w, h, label) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'cv';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); host.appendChild(c); return c;
  };
  UI.readout = function (host) { var p = el('p', 'readout'); p.setAttribute('aria-live', 'off'); host.appendChild(p); return p; };
  UI.note = function (host, text, cls) { var p = el('p', cls || 'demo-note', text); host.appendChild(p); return p; };
  UI.loop = function (fn) {
    var id = 0, last = 0, on = false;
    function tick(t) { if (!on) return; var dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt, t); id = requestAnimationFrame(tick); }
    return {
      start: function () { if (on) return; on = true; last = performance.now(); id = requestAnimationFrame(tick); },
      stop: function () { on = false; cancelAnimationFrame(id); },
      get on() { return on; }
    };
  };
  UI.tabs = function (host, label, names, fn) {
    var row = el('div', 'subtabs'); row.setAttribute('role', 'tablist'); row.setAttribute('aria-label', label);
    var btns = names.map(function (n, i) {
      var b = el('button', 'subtab', n); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { select(i); }); row.appendChild(b); return b;
    });
    function select(i) { btns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); }); fn(i); }
    host.appendChild(row);
    return { select: select, el: row };
  };
  UI.star = function (filled) {
    var rows = ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'], o = '';
    rows.forEach(function (r, y) { r.split('').forEach(function (c, x) { if (c === 'X') o += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }); });
    return '<svg class="star ' + (filled ? 'on' : '') + '" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + o + '</svg>';
  };

  AI2.register = function (w) { AI2.worlds.push(w); };

  /* ---------- scenery ---------- */
  function cloud(w, top, t, dl) {
    var rects = [[4, 0, 3, 1, '#fff'], [9, 0, 3, 1, '#fff'], [3, 1, 10, 1, '#fff'], [1, 2, 14, 1, '#fff'], [0, 3, 16, 2, '#fff'], [1, 5, 14, 1, '#e6efff'], [3, 6, 10, 1, '#cfe0ff']];
    var o = rects.map(function (r) { return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" fill="' + r[4] + '"/>'; }).join('');
    return '<svg class="cloud" style="width:' + w + 'px;top:' + top + 'px;--t:' + t + 's;--dl:' + dl + 's" viewBox="0 0 16 7" shape-rendering="crispEdges">' + o + '</svg>';
  }
  function hill(units, rows, cls) {
    var o = '';
    for (var r = 0; r < rows; r++) {
      var w = Math.min(units, 4 + r * 4), x = (units - w) / 2;
      o += '<rect x="' + x + '" y="' + r + '" width="' + w + '" height="1" fill="#1fa31f"/><rect x="' + x + '" y="' + r + '" width="1" height="1" fill="#5fd35f"/><rect x="' + (x + w - 1) + '" y="' + r + '" width="1" height="1" fill="#0f7a0f"/>';
    }
    return '<svg class="hill ' + cls + '" viewBox="0 0 ' + units + ' ' + rows + '" shape-rendering="crispEdges">' + o + '</svg>';
  }
  function scenery() {
    var tile = "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' shape-rendering='crispEdges'><rect width='32' height='32' fill='#c84c0c'/><g fill='#f4a460'><rect y='2' width='32' height='2'/><rect y='18' width='32' height='2'/></g><g fill='#231a52'><rect width='32' height='2'/><rect y='16' width='32' height='2'/><rect width='2' height='16'/><rect x='16' width='2' height='16'/><rect x='8' y='16' width='2' height='16'/><rect x='24' y='16' width='2' height='16'/></g></svg>";
    document.documentElement.style.setProperty('--brick-tile', 'url("data:image/svg+xml,' + encodeURIComponent(tile) + '")');
    $('#scenery').insertAdjacentHTML('afterbegin', cloud(128, 150, 70, -12) + cloud(176, 300, 96, -52) + cloud(104, 430, 120, -80) + hill(24, 6, 'a') + hill(16, 4, 'b'));
  }

  /* ---------- map ---------- */
  var cur = -1, step = 0, demoState = null, blocks = [];
  var STEPS = ['1 EXPLORE', '2 TEST', '3 REFLECT', '4 GO FURTHER'];

  function refreshMap() {
    var cleared = 0;
    AI2.worlds.forEach(function (w, i) {
      var b = blocks[i], st = stars(w), done = st > 0;
      if (done) cleared++;
      b.classList.toggle('met', done);
      b.querySelector('.badge').textContent = done ? '✓' : '?';
      $('#stars-' + w.id).innerHTML = [1, 2, 3].map(function (k) { return UI.star(k <= st); }).join('');
    });
    $('#hud-clear').textContent = cleared + '/' + AI2.worlds.length;
    $('#hud-coins').textContent = 'x' + ('00' + coins()).slice(-3);
    var all = cleared === AI2.worlds.length;
    $('#world').classList.toggle('won', all);
    $('#clear').hidden = !all;
  }

  function buildMap() {
    var list = $('#levels');
    AI2.worlds.forEach(function (w, i) {
      var li = el('li'); li.style.setProperty('--lift', [34, 0, 34][i % 3] + 'px');
      li.innerHTML = '<div class="floater" style="--d:' + (-i * 0.5).toFixed(2) + 's">' +
        '<button class="block" type="button" aria-label="World ' + w.n + ': ' + w.title + '"><span class="lvn">' + w.n + '</span><span class="badge" aria-hidden="true">?</span></button>' +
        '<span class="nm">' + w.title.toUpperCase() + '</span><span class="sub">' + w.short + '</span><span class="stars" id="stars-' + w.id + '" aria-hidden="true"></span></div>';
      list.appendChild(li);
      var b = li.querySelector('.block'); blocks.push(b);
      b.addEventListener('click', function () {
        if (!reduce) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
        sfx.open(); openWorld(i);
      });
    });
    refreshMap();
  }

  /* ---------- level view ---------- */
  function pauseDemos() { if (demoState) demoState.items.forEach(function (d) { if (d.api && d.api.pause) d.api.pause(); }); }

  function openWorld(i) {
    pauseDemos();
    cur = i; var w = AI2.worlds[i];
    var lv = $('#lv'); lv.hidden = false; lv.style.setProperty('--wc', w.color);
    $('#lv-n').textContent = w.n;
    $('#lv-title').textContent = w.title;
    $('#lv-short').textContent = w.intro;
    var nav = $('#steps'); nav.innerHTML = '';
    STEPS.forEach(function (s, k) {
      var b = el('button', 'step', s); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', function () { setStep(k); }); nav.appendChild(b);
    });
    buildExplore(w);
    setStep(0);
    lv.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function buildExplore(w) {
    var pane = $('#pane-0'); pane.innerHTML = '';
    var items = (w.demos || []).map(function (d) { return { def: d, host: null, api: null }; });
    demoState = { items: items, shown: -1 };
    function show(k) {
      pauseDemos();
      items.forEach(function (it, n) { if (it.host) it.host.hidden = n !== k; });
      var it = items[k];
      if (!it.host) { it.host = el('div', 'demo'); pane.appendChild(it.host); it.api = it.def.build(it.host, { goTest: function () { setStep(1); } }) || {}; }
      it.host.hidden = false;
      if (it.api.resume) it.api.resume();
      demoState.shown = k;
    }
    if (items.length > 1) {
      var holder = el('div', 'tabs-holder'); pane.appendChild(holder);
      UI.tabs(holder, 'Demos', items.map(function (d) { return d.def.title; }), show).select(0);
    } else show(0);
    var foot = el('div', 'pane-foot');
    foot.appendChild(el('p', 'fine', 'Play with every setting. When you can predict what a change will do, take the test.'));
    UI.button(foot, 'Take the test >', 'btn-sun', function () { setStep(1); });
    pane.appendChild(foot);
  }

  function setStep(k) {
    step = k;
    if (k !== 0) pauseDemos();
    else if (demoState && demoState.shown >= 0) { var it = demoState.items[demoState.shown]; if (it && it.api && it.api.resume) it.api.resume(); }
    for (var n = 0; n < 4; n++) {
      $('#pane-' + n).hidden = n !== k;
      var b = $('#steps').children[n]; b.setAttribute('aria-selected', String(n === k));
    }
    var w = AI2.worlds[cur];
    if (k === 1) renderQuizStart(w);
    if (k === 2) renderReflect(w);
    if (k === 3) renderMore(w);
    if (k > 0) $('#steps').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- quiz ---------- */
  var QZ = null;
  function renderQuizStart(w) {
    var pane = $('#pane-1'); pane.innerHTML = '';
    var s = ws(w.id), p = el('div', 'panel quiz');
    p.appendChild(el('h3', null, 'Test yourself'));
    p.appendChild(el('p', null, w.quiz.length + ' questions, one at a time. After each answer you get feedback, and a hint for where to look in the demo. You can retake it as often as you like; your best score counts.'));
    if (s.best >= 0) p.appendChild(el('p', 'fine', 'Your best so far: ' + s.best + ' of ' + s.of + '.'));
    var row = el('div', 'btnrow');
    UI.button(row, 'Start the test', 'btn-sun', function () { startQuiz(w); });
    UI.button(row, '< Back to the demo', '', function () { setStep(0); });
    p.appendChild(row); pane.appendChild(p);
  }
  function startQuiz(w) {
    QZ = { w: w, qs: shuffle(w.quiz).map(function (q) {
      var order = shuffle(q.opts.map(function (t, i) { return i; }));
      return { q: q, order: order };
    }), i: 0, right: 0, missed: [] };
    renderQuestion();
  }
  function renderQuestion() {
    var pane = $('#pane-1'); pane.innerHTML = '';
    var item = QZ.qs[QZ.i], q = item.q, p = el('div', 'panel quiz');
    var meta = el('p', 'qz-meta'); meta.appendChild(el('span', null, 'QUESTION ' + (QZ.i + 1) + ' OF ' + QZ.qs.length)); meta.appendChild(el('span', 'chip', q.tag));
    p.appendChild(meta); p.appendChild(el('h3', null, q.q));
    var opts = el('div', 'opts'), fb = el('div', 'fbk'); fb.hidden = true; fb.setAttribute('aria-live', 'polite');
    var buttons = item.order.map(function (oi, pos) {
      var b = el('button', 'opt'); b.type = 'button';
      b.appendChild(el('span', 'ol', 'ABCD'.charAt(pos))); b.appendChild(el('span', null, q.opts[oi]));
      b.addEventListener('click', function () { answer(oi); }); opts.appendChild(b); return b;
    });
    function answer(oi) {
      var ok = oi === q.a;
      buttons.forEach(function (b, pos) { b.disabled = true; var o = item.order[pos]; if (o === q.a) b.classList.add('good'); else if (o === oi) b.classList.add('bad'); });
      if (ok) { QZ.right++; sfx.ok(); } else { QZ.missed.push(q); sfx.bad(); }
      fb.hidden = false; fb.className = 'fbk ' + (ok ? 'yes' : 'no'); fb.innerHTML = '';
      fb.appendChild(el('b', null, ok ? 'Correct! ' : 'Not quite. '));
      fb.appendChild(el('span', null, q.why));
      if (!ok && q.tip) { var t = el('p', 'tip'); t.appendChild(el('b', null, 'Try this in the demo: ')); t.appendChild(document.createTextNode(q.tip)); fb.appendChild(t); }
      var row = el('div', 'btnrow');
      if (!ok && q.tip) UI.button(row, 'Open the demo', '', function () { setStep(0); });
      UI.button(row, QZ.i + 1 < QZ.qs.length ? 'Next question >' : 'See my result >', 'btn-sun', function () { QZ.i++; if (QZ.i < QZ.qs.length) renderQuestion(); else finishQuiz(); });
      fb.appendChild(row);
      var nb = row.lastChild; setTimeout(function () { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 50);
    }
    p.appendChild(opts); p.appendChild(fb); pane.appendChild(p);
  }
  function finishQuiz() {
    var w = QZ.w, s = ws(w.id), n = QZ.qs.length, r = QZ.right, prev = s.best;
    if (r > s.best) { s.best = r; s.of = n; }
    save(); refreshMap();
    var pane = $('#pane-1'); pane.innerHTML = '';
    var p = el('div', 'panel quiz'), pct = r / n;
    var head = pct >= 1 ? 'PERFECT RUN!' : pct >= 0.8 ? 'GREAT WORK!' : pct >= 0.6 ? 'LEVEL CLEARED' : 'NOT YET, KEEP GOING';
    if (pct >= 0.6) sfx.win(); else sfx.bad();
    p.appendChild(el('h3', 'score', head));
    p.appendChild(el('p', 'big', r + ' of ' + n + ' correct'));
    var st = el('p', 'stars big-stars'); st.innerHTML = [1, 2, 3].map(function (k) { return UI.star(k <= (pct >= 1 ? 3 : pct >= 0.8 ? 2 : pct >= 0.6 ? 1 : 0)); }).join(''); p.appendChild(st);
    if (r > prev && prev >= 0) p.appendChild(el('p', 'fine', 'New best! Your previous best was ' + prev + '.'));
    var tags = {}, order = [];
    QZ.w.quiz.forEach(function (q) { if (!tags[q.tag]) { tags[q.tag] = { n: 0, miss: 0, tip: '' }; order.push(q.tag); } tags[q.tag].n++; });
    QZ.missed.forEach(function (q) { tags[q.tag].miss++; tags[q.tag].tip = q.tip || ''; });
    var box = el('div', 'review'); box.appendChild(el('h4', null, 'How you did by idea'));
    order.forEach(function (t) {
      var row = el('div', 'rv ' + (tags[t].miss ? 'warn' : 'good'));
      row.appendChild(el('b', null, t)); row.appendChild(el('span', null, tags[t].miss ? (tags[t].n - tags[t].miss) + ' of ' + tags[t].n + '. Revisit: ' + tags[t].tip : 'Solid.'));
      box.appendChild(row);
    });
    p.appendChild(box);
    p.appendChild(el('p', null, pct >= 0.6 ? 'Next, write down what you now understand and what is still fuzzy. That is where the learning sticks.' : 'Go back to the demo and test the ideas you missed, then try again. Getting it wrong here is how you find the gaps.'));
    var row = el('div', 'btnrow');
    UI.button(row, pct >= 0.6 ? 'Reflect >' : 'Back to the demo', 'btn-sun', function () { setStep(pct >= 0.6 ? 2 : 0); });
    UI.button(row, 'Retake the test', '', function () { startQuiz(w); });
    p.appendChild(row); pane.appendChild(p);
  }

  /* ---------- reflection ---------- */
  function renderReflect(w) {
    var pane = $('#pane-2'); pane.innerHTML = '';
    var s = ws(w.id), p = el('div', 'panel');
    p.appendChild(el('h3', null, 'Reflect'));
    p.appendChild(el('p', 'fine', 'Your notes stay in this browser only. Nothing is sent anywhere. Use Copy to paste them into your own notes.'));
    var conf = el('div', 'conf'); conf.appendChild(el('p', 'cl', 'How confident do you feel about this topic?'));
    var cbtn = el('div', 'btnrow'), labels = ['Lost', 'Shaky', 'Getting there', 'Good', 'I could teach it'];
    labels.forEach(function (l, i) {
      var b = el('button', 'tgl', (i + 1) + ' ' + l); b.type = 'button'; b.setAttribute('aria-pressed', String(s.conf === i + 1));
      b.addEventListener('click', function () { s.conf = i + 1; save(); Array.prototype.forEach.call(cbtn.children, function (x, k) { x.setAttribute('aria-pressed', String(k === i)); }); });
      cbtn.appendChild(b);
    });
    conf.appendChild(cbtn); p.appendChild(conf);
    var areas = [];
    w.reflect.forEach(function (q, i) {
      var f = el('div', 'fld'), id = 'rf-' + w.id + '-' + i, lab = el('label', null, q); lab.setAttribute('for', id);
      var ta = document.createElement('textarea'); ta.id = id; ta.rows = 3; ta.maxLength = 700; ta.value = s.notes[i] || '';
      ta.addEventListener('input', function () { s.notes[i] = ta.value; save(); });
      f.appendChild(lab); f.appendChild(ta); p.appendChild(f); areas.push(ta);
    });
    var row = el('div', 'btnrow'), msg = el('span', 'fine', '');
    UI.button(row, 'Copy my notes', '', function () {
      var text = w.n + ' ' + w.title + '\nConfidence: ' + (s.conf || 'not set') + '/5\n\n' + w.reflect.map(function (q, i) { return q + '\n' + (s.notes[i] || '') ; }).join('\n\n');
      function fallback() { areas[0].focus(); msg.textContent = 'Copy blocked here. Select your notes and copy them by hand.'; }
      try { navigator.clipboard.writeText(text).then(function () { msg.textContent = 'Copied.'; }, fallback); } catch (e) { fallback(); }
    });
    UI.button(row, 'Go further >', 'btn-sun', function () { setStep(3); });
    row.appendChild(msg); p.appendChild(row); pane.appendChild(p);
  }

  /* ---------- go further ---------- */
  function renderMore(w) {
    var pane = $('#pane-3'); pane.innerHTML = '';
    var p = el('div', 'panel'); p.appendChild(el('h3', null, 'Go further'));
    var grid = el('div', 'more');
    w.more.forEach(function (m) {
      var c = el('div', 'mc' + (m.cls ? ' ' + m.cls : '')); c.appendChild(el('h4', null, m.h));
      m.p.forEach(function (t) { c.appendChild(el('p', null, t)); });
      grid.appendChild(c);
    });
    p.appendChild(grid);
    var row = el('div', 'btnrow');
    var next = AI2.worlds[cur + 1];
    if (next) UI.button(row, 'Next world: ' + next.title + ' >', 'btn-sun', function () { sfx.open(); openWorld(cur + 1); });
    UI.button(row, 'Back to the map', '', function () { closeWorld(); });
    p.appendChild(row); pane.appendChild(p);
  }
  function closeWorld() {
    pauseDemos(); $('#lv').hidden = true; cur = -1;
    $('#world').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  AI2.start = function () {
    scenery(); buildMap();
    $('#lv-back').addEventListener('click', closeWorld);
    var snd = $('#snd');
    snd.addEventListener('click', function () {
      soundOn = !soundOn; snd.setAttribute('aria-pressed', String(soundOn)); snd.textContent = 'SOUND ' + (soundOn ? 'ON' : 'OFF'); if (soundOn) sfx.coin();
    });
    $('#reset').addEventListener('click', function () {
      var b = $('#reset');
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to erase my progress'; setTimeout(function () { b.dataset.sure = ''; b.textContent = 'Start over'; }, 4000); return; }
      S = { w: {} }; save(); b.dataset.sure = ''; b.textContent = 'Start over'; refreshMap(); if (cur >= 0) closeWorld();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pauseDemos(); });
  };
})();
