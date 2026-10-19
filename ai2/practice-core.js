/* Practice Lab engine: seeded question variants, practice sets, drills, marking and self-marking.
   Generator files call PRACTICE.family({...}); see gen-ea.js for the shape. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el, $ = function (s, r) { return (r || document).querySelector(s); };
  var PR = window.PRACTICE = { fams: [] };

  /* ---------- seeded randomness ---------- */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  PR.rng = function (seedStr) {
    var r = mulberry(hash(String(seedStr)));
    r.int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    r.pick = function (a) { return a[Math.floor(r() * a.length)]; };
    r.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    r.sample = function (a, n) { return r.shuffle(a).slice(0, n); };
    r.chance = function (p) { return r() < p; };
    r.gauss = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return r;
  };
  function newCode() { var s = '', c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (var i = 0; i < 5; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
  PR.family = function (f) { PR.fams.push(f); };
  PR.fmt = function (v, d) { return String(+(+v).toFixed(d == null ? 2 : d)); };

  /* ---------- saved attempts (this browser only) ---------- */
  var KEY = 'ai2-practice-v1', H = [];
  try { H = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { H = []; }
  function saveH(rec) { H.unshift(rec); H = H.slice(0, 8); try { localStorage.setItem(KEY, JSON.stringify(H)); } catch (e) {} }

  /* ---------- answer parsing ---------- */
  function num(s) {
    s = String(s).replace(/[%\s]/g, '').replace(',', '.'); if (s === '') return NaN;
    var m = s.match(/^(-?[\d.]+)\/([\d.]+)$/); if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[\s,;]/g, ''); }

  /* ---------- part types: each build() returns {filled, mark, reveal} ---------- */
  var T = {};
  function tag(host, text) { var t = el('p', 'pq-tag', text); host.appendChild(t); return t; }

  T.mcq = function (host, p, r) {
    var order = r.shuffle(p.opts.map(function (t, i) { return i; })), picked = -1, btns = [];
    var box = el('div', 'opts'); host.appendChild(box);
    order.forEach(function (oi, pos) {
      var b = el('button', 'opt'); b.type = 'button'; b.appendChild(el('span', 'ol', 'ABCDEF'.charAt(pos))); b.appendChild(el('span', null, p.opts[oi]));
      b.addEventListener('click', function () { if (b.disabled) return; picked = oi; btns.forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); });
      box.appendChild(b); btns.push(b);
    });
    return {
      filled: function () { return picked >= 0; },
      mark: function () { return picked === p.a ? 1 : 0; },
      reveal: function () { btns.forEach(function (b, pos) { b.disabled = true; var o = order[pos]; if (o === p.a) b.classList.add('good'); else if (o === picked) b.classList.add('bad'); }); }
    };
  };

  T.multi = function (host, p, r) {
    var order = r.shuffle(p.opts.map(function (t, i) { return i; })), on = {}, rows = [];
    tag(host, 'Tick all that apply.');
    var box = el('div', 'opts'); host.appendChild(box);
    order.forEach(function (oi, pos) {
      var b = el('button', 'opt'); b.type = 'button'; b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', 'false');
      b.appendChild(el('span', 'ol', '☐')); b.appendChild(el('span', null, p.opts[oi]));
      b.addEventListener('click', function () { if (b.disabled) return; on[oi] = !on[oi]; b.classList.toggle('sel', !!on[oi]); b.setAttribute('aria-checked', String(!!on[oi])); b.firstChild.textContent = on[oi] ? '☑' : '☐'; });
      box.appendChild(b); rows.push({ b: b, oi: oi });
    });
    return {
      filled: function () { return Object.keys(on).some(function (k) { return on[k]; }); },
      mark: function () { var good = 0, bad = 0; p.opts.forEach(function (t, i) { var c = p.a.indexOf(i) >= 0; if (on[i] && c) good++; else if (on[i] && !c) bad++; }); return Math.max(0, (good - bad) / p.a.length); },
      reveal: function () { rows.forEach(function (x) { x.b.disabled = true; var c = p.a.indexOf(x.oi) >= 0; if (c) x.b.classList.add('good'); else if (on[x.oi]) x.b.classList.add('bad'); }); }
    };
  };

  /* numeric and text fields. p.fields: [{label, ans, tol, txt, unit}], p.cols = fields per row */
  T.num = function (host, p) {
    var grid = el('div', 'pq-fields'); if (p.cols) grid.style.gridTemplateColumns = 'repeat(' + p.cols + ',minmax(0,1fr))'; host.appendChild(grid);
    var ins = p.fields.map(function (f) {
      var w = el('label', 'pq-f'), i = document.createElement('input');
      i.type = 'text'; i.inputMode = f.txt ? 'text' : 'decimal'; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('aria-label', f.label || 'answer');
      w.appendChild(el('span', 'pq-fl', f.label || '')); var row = el('span', 'pq-fi'); row.appendChild(i); if (f.unit) row.appendChild(el('span', 'pq-u', f.unit)); w.appendChild(row);
      grid.appendChild(w); return { i: i, w: w, f: f };
    });
    function ok(x) { var f = x.f, v = x.i.value; if (f.txt) return norm(v) === norm(f.ans); var n = num(v); return isFinite(n) && Math.abs(n - f.ans) <= (f.tol == null ? 0.011 : f.tol); }
    return {
      filled: function () { return ins.some(function (x) { return x.i.value.trim() !== ''; }); },
      mark: function () { var g = 0; ins.forEach(function (x) { if (ok(x)) g++; }); return g / ins.length; },
      reveal: function () { ins.forEach(function (x) { x.i.disabled = true; var good = ok(x); x.w.classList.add(good ? 'ok' : 'no'); if (!good) x.w.appendChild(el('span', 'pq-ans', 'Answer: ' + (x.f.txt ? x.f.ans : PR.fmt(x.f.ans, x.f.dp == null ? 2 : x.f.dp)))); }); }
    };
  };

  /* put the items in the right order with up and down buttons */
  T.order = function (host, p, r) {
    var cur = r.shuffle(p.items.map(function (t, i) { return i; })); if (cur.join() === p.items.map(function (t, i) { return i; }).join()) cur.reverse();
    var list = el('ol', 'pq-order'); host.appendChild(list); var locked = false, touched = false;
    tag(host, 'Use the arrows to move steps up or down.');
    function draw() {
      list.innerHTML = '';
      cur.forEach(function (id, pos) {
        var li = el('li'), t = el('span', 'pq-ot', p.items[id]), b = el('span', 'pq-ob');
        [['▲', -1, 'Move up'], ['▼', 1, 'Move down']].forEach(function (d) {
          var x = el('button', 'pq-mv', d[0]); x.type = 'button'; x.setAttribute('aria-label', d[2] + ': ' + p.items[id]); x.disabled = locked || pos + d[1] < 0 || pos + d[1] >= cur.length;
          x.addEventListener('click', function () { var j = pos + d[1], t2 = cur[pos]; cur[pos] = cur[j]; cur[j] = t2; touched = true; draw(); }); b.appendChild(x);
        });
        li.appendChild(t); li.appendChild(b); if (locked) li.classList.add(id === pos ? 'ok' : 'no'); list.appendChild(li);
      });
    }
    draw();
    return {
      filled: function () { return touched; },
      mark: function () { var g = 0; cur.forEach(function (id, pos) { if (id === pos) g++; }); return g / cur.length; },
      reveal: function () { locked = true; draw(); host.appendChild(el('p', 'pq-ans', 'Correct order: ' + p.items.map(function (t, i) { return (i + 1) + '. ' + t; }).join('  ')));  }
    };
  };

  /* decide a category for each item with a drop-down */
  T.match = function (host, p) {
    var tb = el('div', 'pq-match'); host.appendChild(tb);
    var rows = p.items.map(function (it) {
      var row = el('div', 'pq-mrow'), s = document.createElement('select'); s.setAttribute('aria-label', it.t);
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'choose…'; s.appendChild(o0);
      p.cats.forEach(function (c, i) { var o = document.createElement('option'); o.value = i; o.textContent = c; s.appendChild(o); });
      row.appendChild(el('span', 'pq-mt', it.t)); row.appendChild(s); tb.appendChild(row); return { s: s, row: row, it: it };
    });
    return {
      filled: function () { return rows.some(function (x) { return x.s.value !== ''; }); },
      mark: function () { var g = 0; rows.forEach(function (x) { if (x.s.value !== '' && +x.s.value === x.it.c) g++; }); return g / rows.length; },
      reveal: function () { rows.forEach(function (x) { x.s.disabled = true; var good = x.s.value !== '' && +x.s.value === x.it.c; x.row.classList.add(good ? 'ok' : 'no'); if (!good) x.row.appendChild(el('span', 'pq-ans', 'Answer: ' + p.cats[x.it.c])); }); }
    };
  };

  /* a written answer, marked by the student against a checklist after the model answer is shown */
  T.write = function (host, p, r, hooks) {
    var ta = document.createElement('textarea'); ta.rows = p.rows || 5; ta.placeholder = 'Write your answer here, in full sentences, as you would on paper…'; ta.setAttribute('aria-label', 'Your written answer'); host.appendChild(ta);
    var out = el('div', 'pq-self'), ticks = [], doneSelf = false; host.appendChild(out);
    return {
      filled: function () { return ta.value.trim().length >= 15; },
      self: true,
      mark: function () { if (!ticks.length) return 0; var g = 0; ticks.forEach(function (t) { if (t.checked) g++; }); return g / ticks.length; },
      reveal: function () {
        ta.disabled = true; out.innerHTML = '';
        if (!ta.value.trim()) out.appendChild(el('p', 'fine', 'You did not write anything, so this part scores 0 unless you tick points below after writing it on paper.'));
        var m = el('div', 'pq-model'); m.appendChild(el('b', null, 'A strong answer covers: '));
        var ul = el('ul', 'pq-rubric'); p.rubric.forEach(function (pt) {
          var li = el('li'), lab = el('label'), cb = document.createElement('input'); cb.type = 'checkbox';
          cb.addEventListener('change', function () { if (hooks && hooks.changed) hooks.changed(); });
          lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + pt)); li.appendChild(lab); ul.appendChild(li); ticks.push(cb);
        });
        m.appendChild(ul); out.appendChild(m);
        out.appendChild(el('p', 'fine', 'Be honest: tick only the points your answer actually made, in your own words. Examiners give marks for ideas, not for matching phrases.'));
      }
    };
  };

  /* a new parameter grid: per axis, three values that should be centred on the best, finer, and reach past an edge when the best sat on one.
     p.axes: [{label, old:[3 values], k: index of best in old, geo: bool, ref:[3 example values]}] */
  T.axes = function (host, p) {
    var rows = [], names = ['Low', 'Medium (the best so far)', 'High'];
    p.axes.forEach(function (ax) {
      var w = el('div', 'pq-axis'); w.appendChild(el('span', 'pq-fl', ax.label));
      var r3 = el('div', 'pq-axrow'), ins = [];
      for (var i = 0; i < 3; i++) {
        var l = el('label', 'pq-f'), inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', ax.label + ' ' + names[i]);
        l.appendChild(el('span', 'pq-fl', names[i])); l.appendChild(inp); r3.appendChild(l); ins.push(inp);
      }
      w.appendChild(r3); host.appendChild(w); rows.push({ ax: ax, ins: ins, w: w });
    });
    function check(x) {
      var v = x.ins.map(function (i) { return num(i.value); }), ax = x.ax, res = { centred: false, refined: false, dir: false, valid: v.every(isFinite) };
      if (!res.valid) return res;
      var bestV = ax.old[ax.k]; res.centred = Math.abs(v[1] - bestV) <= 0.005 * Math.abs(bestV) + 1e-12;
      var ordered = v[0] < v[1] && v[1] < v[2];
      function gap(a, b) { return ax.geo ? Math.log(b / a) / Math.LN2 : b - a; }
      var old = ax.geo ? 1 : ax.old[1] - ax.old[0];
      if (ordered && v[0] > 0) { var g1 = gap(v[0], v[1]), g2 = gap(v[1], v[2]); res.refined = Math.max(g1, g2) <= old * 1.001 && Math.min(g1, g2) < old * 0.999; }
      res.ordered = ordered;
      if (ax.k === 2) res.dir = v[2] > ax.old[2]; else if (ax.k === 0) res.dir = v[0] < ax.old[0]; else res.dir = v[0] >= ax.old[0] && v[2] <= ax.old[2];
      return res;
    }
    return {
      filled: function () { return rows.some(function (x) { return x.ins.some(function (i) { return i.value.trim() !== ''; }); }); },
      mark: function () { var t = 0; rows.forEach(function (x) { var c = check(x); t += (c.centred ? 0.4 : 0) + (c.refined ? 0.3 : 0) + (c.dir ? 0.3 : 0); }); return t / rows.length; },
      reveal: function () {
        rows.forEach(function (x) {
          x.ins.forEach(function (i) { i.disabled = true; });
          var c = check(x), ax = x.ax, ul = el('ul', 'pq-checks');
          function li(ok, t) { var e = el('li', ok ? 'ok' : 'no', (ok ? '✓ ' : '✗ ') + t); ul.appendChild(e); }
          li(c.centred, 'The best value so far (' + ax.old[ax.k] + ') becomes the new middle value.');
          li(c.refined, 'The steps are finer than before (' + (ax.geo ? 'smaller than a factor of 2' : 'smaller than ' + +(ax.old[1] - ax.old[0]).toFixed(4)) + ') and the values increase from low to high.');
          li(c.dir, ax.k === 2 ? 'The high value reaches beyond the old maximum (' + ax.old[2] + '), because the best sat on the upper edge.' : ax.k === 0 ? 'The low value reaches beyond the old minimum (' + ax.old[0] + '), because the best sat on the lower edge.' : 'The values stay between the old low and high, because the best was in the middle.');
          x.w.appendChild(ul); x.w.appendChild(el('p', 'pq-ans', 'One good answer: ' + ax.ref.join(', ')));
        });
      }
    };
  };
  PR.types = T;

  /* ---------- rendering a question ---------- */
  function buildQuestion(host, q, r, o) {
    var card = el('article', 'pq-card'); host.appendChild(card);
    var head = el('div', 'pq-head'); head.appendChild(el('span', 'chip', q.label)); head.appendChild(el('span', 'pq-marks', q.marks + (q.marks === 1 ? ' mark' : ' marks'))); card.appendChild(head);
    var stem = el('div', 'pq-stem'); if (q.html) stem.innerHTML = q.html; else stem.textContent = q.stem; card.appendChild(stem);
    if (q.fig) { var f = el('div', 'pq-fig'); card.appendChild(f); if (typeof q.fig === 'string') f.innerHTML = q.fig; else q.fig(f); }
    var parts = q.parts.slice();
    if (o.written && q.reason) parts.push({ kind: 'write', ask: 'Explain your reasoning in two or three sentences.', rubric: q.reason, weight: 0.4 });
    var tot = 0; parts.forEach(function (p) { p.w = p.weight || 1; tot += p.w; });
    var insts = parts.map(function (p, i) {
      var box = el('section', 'pq-part'); card.appendChild(box);
      if (p.ask) box.appendChild(el('p', 'pq-ask', (parts.length > 1 ? '(' + 'abcdefg'.charAt(i) + ') ' : '') + p.ask));
      var inst = T[p.kind](box, p, r, { changed: function () { if (o.onSelf) o.onSelf(); } }); inst.box = box; inst.p = p; return inst;
    });
    var fb = el('div', 'fbk'); fb.hidden = true; fb.setAttribute('aria-live', 'polite'); card.appendChild(fb);
    var api = {
      card: card, q: q,
      filled: function () { return insts.some(function (i) { return i.filled(); }); },
      score: function () { var s = 0; insts.forEach(function (i) { s += i.mark() * i.p.w; }); return s / tot * q.marks; },
      hasSelf: insts.some(function (i) { return i.self; }),
      reveal: function () {
        insts.forEach(function (i) { i.reveal(); });
        fb.hidden = false; fb.className = 'fbk'; fb.innerHTML = '';
        var s = api.score(); fb.classList.add(s >= q.marks * 0.99 ? 'yes' : 'no');
        var line = el('p', 'pq-scoreline'); line.setAttribute('data-score', ''); fb.appendChild(line); api.line = line; api.paint();
        (q.explain || []).forEach(function (t) { var p = el('p'); p.innerHTML = t; fb.appendChild(p); });
        if (q.tip) { var t = el('p', 'tip'); t.appendChild(el('b', null, 'Where to practise: ')); t.appendChild(document.createTextNode(q.tip)); fb.appendChild(t); }
      },
      paint: function () { if (!api.line) return; var s = api.score(); api.line.textContent = (s >= q.marks * 0.99 ? 'Full marks. ' : 'You scored ') + PR.fmt(s, 1) + ' of ' + q.marks + (api.hasSelf ? ' (written parts: your own marking)' : '') + '.'; }
    };
    return api;
  }

  /* ---------- paper construction ---------- */
  function formsAll() { var out = []; PR.fams.forEach(function (f) { f.forms.forEach(function (fm) { out.push({ fam: f, form: fm }); }); }); return out; }
  function makeQuestion(code, slot, fam, fm) {
    var r = PR.rng(code + '#' + slot + '#' + fm.id), q = fm.gen(r);
    q.label = fam.label; q.marks = q.marks || fm.marks; q.fam = fam.id; q.form = fm.id; q.world = fam.world; q.tip = q.tip || fam.tip;
    q.parts = q.parts || [q.part]; q.code = code; return { q: q, r: PR.rng(code + '#r' + slot) };
  }
  PR.paper = function (code, size, writtenOK) {
    var r = PR.rng(code + '#paper'), all = formsAll().filter(function (x) { return writtenOK || !x.form.writeOnly; });
    function pool(pred) { return all.filter(pred); }
    var chosen = [], used = {};
    function take(list, n) {
      var l = r.shuffle(list.filter(function (x) { return !used[x.fam.id]; })), got = 0;
      for (var i = 0; i < l.length && got < n; i++) { if (used[l[i].fam.id]) continue; used[l[i].fam.id] = 1; chosen.push(l[i]); got++; }
    }
    take(pool(function (x) { return x.fam.id === 'ea-sel'; }), 1);
    take(pool(function (x) { return x.fam.id === 'sweep'; }), 1);
    take(pool(function (x) { return x.form.marks >= 10 && x.fam.id !== 'ea-sel'; }), 1);
    var rest = pool(function (x) { return x.form.marks < 10 && x.fam.id !== 'sweep'; }), want = size - chosen.length;
    take(rest, want);
    return chosen.map(function (x, i) { return makeQuestion(code, i, x.fam, x.form); });
  };

  /* ---------- screens ---------- */
  var app, timerId = null;
  var opts = { written: true, timer: false };
  function clear() { if (timerId) { clearInterval(timerId); timerId = null; } app.innerHTML = ''; window.scrollTo(0, 0); }

  function home() {
    clear();
    var p = el('div', 'panel'); app.appendChild(p);
    p.appendChild(el('h2', null, 'Choose how to practise'));
    p.appendChild(el('p', null, 'Every practice set and every drill is generated fresh from a short code, with new numbers, new scenarios and new wording. The same code always gives the same set, so you can swap codes with a friend and compare. You will not see the same question twice, so memorising answers will not help. Understanding will.'));

    var cfg = el('div', 'pq-cfg'); p.appendChild(cfg);
    UI.toggle(cfg, 'Include written-answer practice (you mark it yourself). The real exam asks for written answers, not multiple choice.', opts.written, function (v) { opts.written = v; });
    UI.toggle(cfg, 'Optional 45 minute timer', opts.timer, function (v) { opts.timer = v; });

    var g = el('div', 'pq-menu'); p.appendChild(g);
    var c1 = el('div', 'pq-opt'); c1.appendChild(el('h3', null, 'Practice set'));
    c1.appendChild(el('p', null, 'Six practice questions on different topics, with an optional 45 minute timer, marked at the end with a topic-by-topic review. This is not a mock test or a mock exam.'));
    var row1 = el('div', 'btnrow'); c1.appendChild(row1); UI.button(row1, 'New practice set', 'btn-sun', function () { startPaper(newCode(), 6); });
    UI.button(row1, 'Short set (3 questions)', '', function () { startPaper(newCode(), 3); }); g.appendChild(c1);

    var c2 = el('div', 'pq-opt'); c2.appendChild(el('h3', null, 'Replay a practice code'));
    c2.appendChild(el('p', null, 'Type a code to get exactly the same practice set again.'));
    var row2 = el('div', 'btnrow'), inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 12; inp.placeholder = 'e.g. K7F2Q'; inp.className = 'pq-code'; inp.setAttribute('aria-label', 'Paper code');
    row2.appendChild(inp); UI.button(row2, 'Start', '', function () { var c = inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c) startPaper(c, 6); }); c2.appendChild(row2); g.appendChild(c2);

    p.appendChild(el('h3', 'pq-sub', 'Topic drills: one question at a time, instant feedback, endless new variants'));
    var drills = el('div', 'pq-drills'); p.appendChild(drills);
    PR.fams.forEach(function (f) {
      var b = el('button', 'pq-drill'); b.type = 'button'; b.appendChild(el('strong', null, f.label)); b.appendChild(el('span', null, f.blurb));
      b.addEventListener('click', function () { startDrill(f, 0); }); drills.appendChild(b);
    });
    if (H.length) {
      p.appendChild(el('h3', 'pq-sub', 'Your recent practice sets (saved only in this browser)'));
      var ul = el('ul', 'pq-hist'); H.forEach(function (h) { var li = el('li'); li.textContent = h.code + ': ' + PR.fmt(h.got, 1) + ' of ' + h.of + ' (' + Math.round(h.got / h.of * 100) + '%) on ' + h.date; ul.appendChild(li); }); p.appendChild(ul);
    }
  }

  function startPaper(code, size) {
    clear();
    var qs = PR.paper(code, size, opts.written), cards = [];
    var bar = el('div', 'pq-bar'); app.appendChild(bar);
    var left = el('span', 'pq-code-show'); left.textContent = 'Practice set ' + code + '  ·  ' + qs.length + ' questions  ·  ' + qs.reduce(function (s, x) { return s + x.q.marks; }, 0) + ' marks';
    var clock = el('span', 'pq-clock'); bar.appendChild(left); bar.appendChild(clock);
    var secs = (size >= 6 ? 45 : 20) * 60;
    function tick() { var m = Math.floor(secs / 60), s = secs % 60; clock.textContent = opts.timer ? (secs > 0 ? m + ':' + (s < 10 ? '0' : '') + s + ' left' : 'Time is up, finish your answer and submit') : ''; if (secs > 0) secs--; }
    if (opts.timer) { tick(); timerId = setInterval(tick, 1000); }
    app.appendChild(el('p', 'fine', 'Answer every question. Give numeric answers to 2 decimal places unless told otherwise. Submit when you are ready: nothing is marked until then.'));
    var host = el('div', 'pq-paper'); app.appendChild(host);
    qs.forEach(function (x, i) { var h = el('div'); host.appendChild(h); var c = buildQuestion(h, x.q, x.r, { written: opts.written, onSelf: function () { if (done) paintTotal(); } }); h.querySelector('.pq-head').insertBefore(el('b', 'pq-no', 'Q' + (i + 1)), h.querySelector('.chip')); cards.push(c); });
    var done = false, tot = el('div', 'pq-total'); tot.hidden = true;
    var foot = el('div', 'btnrow');
    var sub = UI.button(foot, 'Submit practice set', 'btn-sun', function () {
      var empty = cards.filter(function (c) { return !c.filled(); }).length;
      if (empty && sub.dataset.sure !== '1') { sub.dataset.sure = '1'; sub.textContent = empty + ' question(s) unanswered. Submit anyway?'; return; }
      done = true; if (timerId) { clearInterval(timerId); timerId = null; clock.textContent = 'Submitted'; }
      cards.forEach(function (c) { c.reveal(); }); sub.disabled = true; foot.hidden = true; paintTotal(); tot.hidden = false; tot.scrollIntoView({ behavior: UI.reduce ? 'auto' : 'smooth', block: 'start' }); AI2.sfx.win();
      var s = score(); saveH({ code: code, got: s.got, of: s.of, date: new Date().toLocaleDateString('en-GB') });
    });
    UI.button(foot, 'Leave this set', '', home);
    app.appendChild(foot); app.appendChild(tot);
    function score() { var got = 0, of = 0; cards.forEach(function (c) { got += c.score(); of += c.q.marks; }); return { got: got, of: of }; }
    function paintTotal() {
      cards.forEach(function (c) { c.paint(); });
      var s = score(), pct = s.got / s.of; tot.innerHTML = '';
      tot.appendChild(el('h2', null, 'Result: ' + PR.fmt(s.got, 1) + ' of ' + s.of + ' (' + Math.round(pct * 100) + '%)'));
      tot.appendChild(el('p', null, pct >= 0.7 ? 'Strong. Now try a set with written answers switched on, or swap codes with a friend. Remember this is practice, not a prediction of your exam mark.' : pct >= 0.4 ? 'A solid base. Use the review below to choose what to revisit, then try a new practice set.' : 'Good: you now know exactly where the gaps are. Work through the drills for the weakest topics, then come back.'));
      var tb = document.createElement('table'); tb.className = 'tbl'; var h = '<thead><tr><th>Question</th><th>Topic</th><th>Marks</th></tr></thead><tbody>';
      cards.forEach(function (c, i) { var sc = c.score(); h += '<tr><td class="n">Q' + (i + 1) + '</td><td>' + c.q.label + '</td><td class="n">' + PR.fmt(sc, 1) + ' / ' + c.q.marks + '</td></tr>'; });
      tb.innerHTML = h + '</tbody>'; tot.appendChild(tb);
      var weak = cards.filter(function (c) { return c.score() < c.q.marks * 0.7 && c.q.world; });
      if (weak.length) { var w = el('p', 'fine'); w.textContent = 'Revisit: ' + weak.map(function (c) { return c.q.label + ' (' + c.q.world + ')'; }).join('; ') + '.'; tot.appendChild(w); }
      var row = el('div', 'btnrow'); UI.button(row, 'New practice set', 'btn-sun', function () { startPaper(newCode(), size); }); UI.button(row, 'Back to practice menu', '', home);
      var a = el('a', 'btn', 'Back to AI2 World'); a.href = 'index.html'; row.appendChild(a); tot.appendChild(row);
    }
  }

  function startDrill(fam, n) {
    clear();
    var code = newCode(), fm = fam.forms.filter(function (x) { return opts.written || !x.writeOnly; }); if (!fm.length) fm = fam.forms; var pick = fm[Math.floor(Math.random() * fm.length)];
    var x = makeQuestion(code, 0, fam, pick);
    var bar = el('div', 'pq-bar'); app.appendChild(bar); bar.appendChild(el('span', 'pq-code-show', fam.label + '  ·  variant ' + code)); var back = el('button', 'btn', 'All topics'); back.type = 'button'; back.addEventListener('click', home); bar.appendChild(back);
    var host = el('div', 'pq-paper'); app.appendChild(host);
    var c = buildQuestion(host, x.q, x.r, { written: opts.written, onSelf: function () { c.paint(); } });
    var row = el('div', 'btnrow'); app.appendChild(row);
    var chk = UI.button(row, 'Check my answer', 'btn-sun', function () { c.reveal(); chk.hidden = true; nx.hidden = false; nx.focus(); (c.score() >= x.q.marks * 0.99 ? AI2.sfx.ok : AI2.sfx.bad)(); });
    var nx = UI.button(row, 'Another variant >', 'btn-sun', function () { startDrill(fam, n + 1); }); nx.hidden = true;
  }

  PR.start = function () { app = $('#app'); home(); };
})();
