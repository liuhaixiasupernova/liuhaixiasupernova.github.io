/* World 1-2, demo 1: particle swarm lab. Landscapes (five hills, smooth, rugged), three neighbourhoods,
   and an experiment panel that runs many trials so students can compare with evidence. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- landscapes ---------- */
  var KINDS = [
    { id: 'hills', name: 'Five hills' },
    { id: 'smooth', name: 'Smooth' },
    { id: 'rugged', name: 'Rugged' }
  ];
  var lands = {};
  function land(kind) {
    if (lands[kind]) return lands[kind];
    var peaks, rough = 0.03;
    if (kind === 'smooth') peaks = [[6.2, 6.8, 1, 2.6], [2.5, 3, 0.25, 1.6]];
    else if (kind === 'hills') peaks = [[8, 7.6, 1, 0.6], [2.4, 7.2, 0.85, 1], [3, 2.5, 0.8, 1.1], [7.2, 2.2, 0.75, 0.9], [5.5, 5, 0.5, 0.9]];
    else { var r = mulberry(77); peaks = []; for (var i = 0; i < 30; i++) peaks.push([r() * 10, r() * 10, 0.45 + 0.55 * r(), 0.28 + 0.2 * r()]); rough = 0.05; }
    function G(x, y) { var s = 0; for (var k = 0; k < peaks.length; k++) { var p = peaks[k], dx = x - p[0], dy = y - p[1]; s += p[2] * Math.exp(-(dx * dx + dy * dy) / (2 * p[3] * p[3])); } return s + rough * Math.sin(3 * x) * Math.sin(3 * y); }
    var gmax = 0, top = [5, 5];
    for (var x = 0; x <= 10; x += 0.05) for (var y = 0; y <= 10; y += 0.05) { var v = G(x, y); if (v > gmax) { gmax = v; top = [x, y]; } }
    var heat = document.createElement('canvas'); heat.width = 70; heat.height = 70;
    var c = heat.getContext('2d'), img = c.createImageData(70, 70), stops = [[0, [223, 243, 255]], [0.35, [143, 216, 255]], [0.7, [255, 226, 120]], [1, [255, 150, 30]]];
    for (var j = 0; j < 70; j++) for (var i2 = 0; i2 < 70; i2++) {
      var vv = Math.max(0, Math.min(1, G((i2 + 0.5) / 7, (j + 0.5) / 7) / gmax)), k2 = 0; while (k2 < stops.length - 2 && vv > stops[k2 + 1][0]) k2++;
      var a = stops[k2], b = stops[k2 + 1], f = (vv - a[0]) / (b[0] - a[0]), o = (j * 70 + i2) * 4;
      for (var q = 0; q < 3; q++) img.data[o + q] = Math.round(a[1][q] + (b[1][q] - a[1][q]) * f); img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return (lands[kind] = { G: G, gmax: gmax, top: top, heat: heat });
  }

  /* the particle that a given particle listens to: whole swarm, two fixed friends, or the three nearest on the map */
  function informer(P, pi, topo, gb) {
    if (topo === 0) return { x: gb.x, y: gb.y };
    var n = P.length, bi = pi, p = P[pi];
    if (topo === 1) { var li = (pi + n - 1) % n, ri = (pi + 1) % n; if (P[li].pf > P[bi].pf) bi = li; if (P[ri].pf > P[bi].pf) bi = ri; }
    else {
      var ds = []; for (var k = 0; k < n; k++) if (k !== pi) ds.push([Math.hypot(P[k].x - p.x, P[k].y - p.y), k]);
      ds.sort(function (a, b) { return a[0] - b[0]; });
      for (var m = 0; m < Math.min(3, ds.length); m++) if (P[ds[m][1]].pf > P[bi].pf) bi = ds[m][1];
    }
    return { x: P[bi].px, y: P[bi].py, i: bi };
  }
  function stepSwarm(P, gbRef, L, cfg, rnd) {
    var vmax = 0.9;
    P.forEach(function (p, pi) {
      var r1 = rnd(), r2 = rnd(), g = informer(P, pi, cfg.topo, gbRef.gb);
      p.vx = cfg.w * p.vx + cfg.c1 * r1 * (p.px - p.x) + cfg.c2 * r2 * (g.x - p.x);
      p.vy = cfg.w * p.vy + cfg.c1 * r1 * (p.py - p.y) + cfg.c2 * r2 * (g.y - p.y);
      var sp = Math.hypot(p.vx, p.vy); if (sp > vmax) { p.vx *= vmax / sp; p.vy *= vmax / sp; }
      p.ox = p.x; p.oy = p.y; p.x += p.vx; p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx *= -0.5; } if (p.x > 10) { p.x = 10; p.vx *= -0.5; }
      if (p.y < 0) { p.y = 0; p.vy *= -0.5; } if (p.y > 10) { p.y = 10; p.vy *= -0.5; }
    });
    P.forEach(function (p) { var f = L.G(p.x, p.y); if (f > p.pf) { p.pf = f; p.px = p.x; p.py = p.y; } if (f > gbRef.gb.f) gbRef.gb = { x: p.x, y: p.y, f: f }; });
  }
  function makeSwarm(L, n, rnd) {
    var P = [], gb = { x: 5, y: 5, f: -1 };
    for (var i = 0; i < n; i++) { var x = rnd() * 10, y = rnd() * 10, f = L.G(x, y); P.push({ x: x, y: y, vx: rnd() - 0.5, vy: rnd() - 0.5, px: x, py: y, pf: f, ox: x, oy: y, trail: [] }); if (f > gb.f) gb = { x: x, y: y, f: f }; }
    return { P: P, ref: { gb: gb } };
  }
  /* a small real-coded GA with the same evaluation budget, for comparison */
  function gaTrial(L, pop, gens, seed) {
    var rnd = mulberry(seed * 131 + 9), cl = function (v) { return Math.max(0, Math.min(10, v)); }, P = [], i, best = 0;
    for (i = 0; i < pop; i++) { var x = rnd() * 10, y = rnd() * 10; P.push({ x: x, y: y, f: L.G(x, y) }); }
    P.forEach(function (p) { if (p.f > best) best = p.f; });
    for (var g = 0; g < gens; g++) {
      P.sort(function (a, b) { return b.f - a.f; }); var N = [P[0]];
      function sel() { var b = P[Math.floor(rnd() * pop)], c = P[Math.floor(rnd() * pop)]; return c.f > b.f ? c : b; }
      while (N.length < pop) {
        var a = sel(), b = sel(), x2 = a.x, y2 = a.y;
        if (rnd() < 0.9) { x2 = a.x + (rnd() * 2 - 0.5) * (b.x - a.x); y2 = a.y + (rnd() * 2 - 0.5) * (b.y - a.y); }
        if (rnd() < 0.3) x2 += 0.5 * gauss(rnd); if (rnd() < 0.3) y2 += 0.5 * gauss(rnd);
        x2 = cl(x2); y2 = cl(y2); var f = L.G(x2, y2); if (f > best) best = f; N.push({ x: x2, y: y2, f: f });
      }
      P = N;
    }
    return best;
  }

  function build(host) {
    var N = 420, seed = 5, rnd, it = 0, running = false, tw = 1, tweenT = 0.12, reachedAt = -1;
    var kind = 'hills', L = land(kind), topo = 0, S, histB = [], histA = [], showTop = false;

    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, N, N, 'Map of a landscape; a swarm of particles searches for the highest ground');
    var ch = UI.canvas(view, 640, 150, 'Best fitness found and swarm average over time');
    var out = UI.readout(view);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#6a3df0"></i>a particle</li><li><i style="background:#ffd23c"></i>star: the best spot found so far by the swarm. It is not necessarily the highest ground.</li><li><i style="background:#ff9a1e"></i>orange = higher ground</li>'; view.appendChild(lg);
    var resHead = el('h3', 'demo-title', 'Experiment results'); resHead.hidden = true; view.appendChild(resHead);
    var resBox = el('div', 'scroll-x'); view.appendChild(resBox);

    ctl.appendChild(el('h3', 'demo-title', 'Particle swarm lab'));
    UI.note(ctl, 'No particle is in charge. Each one remembers its own best spot and listens to the best spot found by the particles it can hear. It is pulled toward both while its old speed carries it on. Press Run, then change the world and the rules.');
    ctl.appendChild(el('p', 'fine', 'Landscape'));
    var tabL = UI.tabs(ctl, 'Landscape', KINDS.map(function (k) { return k.name; }), function (i) { kind = KINDS[i].id; L = land(kind); reset(); });
    ctl.appendChild(el('p', 'fine', 'Who each particle listens to'));
    var tabT = UI.tabs(ctl, 'Neighbourhood', ['Whole swarm', '2 fixed friends (non-local)', '3 nearest on the map (local)'], function (i) { topo = i; reset(); });
    var sN = UI.slider(ctl, { label: 'Number of particles', min: 3, max: 60, value: 20, onInput: reset });
    var sW = UI.slider(ctl, { label: 'Inertia (keep old speed)', min: 0, max: 1.2, step: 0.05, value: 0.7, fmt: function (v) { return v.toFixed(2); } });
    var sC1 = UI.slider(ctl, { label: 'Own memory pull (c1)', min: 0, max: 3, step: 0.1, value: 1.5, fmt: function (v) { return v.toFixed(1); } });
    var sC2 = UI.slider(ctl, { label: 'Listening pull (c2)', min: 0, max: 3, step: 0.1, value: 1.5, fmt: function (v) { return v.toFixed(1); } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run', 'btn-sun', function () { running = !running; bRun.textContent = running ? 'Pause' : 'Run'; });
    UI.button(row, 'Step', '', function () { running = false; bRun.textContent = 'Run'; step(); });
    UI.button(row, 'Restart', '', reset);
    UI.button(row, 'New random start', '', function () { seed++; reset(); });
    UI.toggle(row, 'Show the highest ground', false, function (v) { showTop = v; });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Balanced', v: [20, 0.7, 1.5, 1.5, 0, 0] },
      { t: 'Everyone follows the shared best', v: [20, 0.7, 0, 3, 0, 0] },
      { t: 'Loners: no listening', v: [20, 0.7, 3, 0, 0, 0] },
      { t: 'Too much inertia', v: [20, 1.1, 1.5, 1.5, 0, 0] },
      { t: 'Rugged, whole swarm', v: [20, 0.7, 1.5, 1.5, 2, 0] },
      { t: 'Rugged, 2 fixed friends', v: [20, 0.7, 1.5, 1.5, 2, 1] }
    ], function (it) { var v = it.v; sN.set(v[0], true); sW.set(v[1], true); sC1.set(v[2], true); sC2.set(v[3], true); tabL.select(v[4]); tabT.select(v[5]); running = true; bRun.textContent = 'Pause'; });

    ctl.appendChild(el('h3', 'demo-title', 'Experiment lab'));
    UI.note(ctl, 'One run proves little. This runs 40 fresh runs of 150 steps with your current settings and reports how often the swarm found the highest hill. Change one thing, run again, and compare.');
    var erow = el('div', 'btnrow'); ctl.appendChild(erow);
    var bExp = UI.button(erow, 'Run 40 swarm trials', 'btn-sun', function () { experiment('swarm'); });
    var bGa = UI.button(erow, 'Run 40 GA trials (same budget)', '', function () { experiment('ga'); });
    UI.button(erow, 'Clear results', '', function () { rows = []; showRows(); });
    UI.note(ctl, 'The GA uses tournament size 2, blend crossover and mutation (rate 0.3, step 0.5), with the same number of evaluations as the swarm. It is there for comparison, not as the best possible GA.', 'fine');

    var rows = [];
    function showRows() {
      resHead.hidden = !rows.length; resBox.innerHTML = '';
      if (!rows.length) return;
      var t = document.createElement('table'); t.className = 'tbl';
      var h = '<thead><tr><th>Landscape</th><th>Method</th><th>Found the highest hill</th><th>Average best (of the maximum)</th></tr></thead><tbody>';
      rows.forEach(function (r) { h += '<tr><td>' + r.land + '</td><td>' + r.method + '</td><td class="n">' + r.ok + '%</td><td class="n">' + r.rel + '%</td></tr>'; });
      t.innerHTML = h + '</tbody>'; resBox.appendChild(t);
    }
    var busy = false;
    function experiment(kindM) {
      if (busy) return; busy = true; bExp.disabled = true; bGa.disabled = true;
      var cfg = { w: sW.get(), c1: sC1.get(), c2: sC2.get(), topo: topo }, n = sN.get(), LL = L, ok = 0, rel = 0, t = 0, T = 40, kn = kind;
      var method = kindM === 'ga' ? 'GA, population ' + n : ['Swarm, whole swarm', 'Swarm, 2 fixed friends', 'Swarm, 3 nearest on the map'][topo] + ' (' + n + ' particles, inertia ' + cfg.w.toFixed(2) + ', c1 ' + cfg.c1.toFixed(1) + ', c2 ' + cfg.c2.toFixed(1) + ')';
      out.textContent = 'Running 40 trials…';
      function chunk() {
        for (var q = 0; q < 4 && t < T; q++, t++) {
          var best;
          if (kindM === 'ga') best = gaTrial(LL, n, 150, 1000 + t);
          else { var sw = makeSwarm(LL, n, mulberry((1000 + t) * 911 + 5)), rr = mulberry((1000 + t) * 7 + 3); for (var s = 0; s < 150; s++) stepSwarm(sw.P, sw.ref, LL, cfg, rr); best = sw.ref.gb.f; }
          if (best > LL.gmax - 0.04) ok++; rel += best / LL.gmax;
        }
        if (t < T) { setTimeout(chunk, 0); return; }
        var name = KINDS.filter(function (k) { return k.id === kn; })[0].name;
        rows = rows.filter(function (r) { return !(r.land === name && r.method === method); });
        rows.push({ land: name, method: method, ok: Math.round(ok / T * 100), rel: Math.round(rel / T * 100) }); if (rows.length > 9) rows.shift();
        showRows(); busy = false; bExp.disabled = false; bGa.disabled = false; setOut();
      }
      setTimeout(chunk, 20);
    }

    function cfgNow() { return { w: sW.get(), c1: sC1.get(), c2: sC2.get(), topo: topo }; }
    function reset() {
      rnd = mulberry(seed * 911 + 5); it = 0; reachedAt = -1; histB = []; histA = [];
      S = makeSwarm(L, sN.get(), rnd); tw = 1; record(); setOut();
    }
    function spread() { var mx = 0, my = 0, P = S.P; P.forEach(function (p) { mx += p.x; my += p.y; }); mx /= P.length; my /= P.length; var s = 0; P.forEach(function (p) { s += Math.hypot(p.x - mx, p.y - my); }); return s / P.length; }
    function record() { var a = 0; S.P.forEach(function (p) { a += L.G(p.x, p.y); }); histB.push(S.ref.gb.f); histA.push(a / S.P.length); if (reachedAt < 0 && S.ref.gb.f > L.gmax - 0.04) reachedAt = it; }
    function step() {
      S.P.forEach(function (p) { p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift(); });
      stepSwarm(S.P, S.ref, L, cfgNow(), rnd); it++; tw = UI.reduce ? 1 : 0; record(); setOut();
    }
    function setOut() {
      if (busy) return;
      var gb = S.ref.gb, sp = spread(), m = 'Step ' + it + '. Best found so far ' + gb.f.toFixed(2) + ' (highest possible ' + L.gmax.toFixed(2) + '). Swarm spread ' + sp.toFixed(2) + '.';
      if (reachedAt >= 0) m += ' The swarm found the highest hill at step ' + reachedAt + '.';
      else if (sp < 0.25 && it > 0) m += ' The swarm has bunched up on a lower hill and has stopped exploring: its best is below the highest possible.';
      out.textContent = m;
    }
    function px(v) { return v / 10 * N; }
    function star(c, x, y, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = '#ffd23c'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke(); }
    function draw() {
      var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(L.heat, 0, 0, N, N);
      var e = tw >= 1 ? 1 : tw, P = S.P; e = e * e * (3 - 2 * e);
      if (topo !== 0) { c.strokeStyle = 'rgba(35,26,82,.22)'; c.lineWidth = 1; P.forEach(function (p, pi) { var g = informer(P, pi, topo, S.ref.gb); if (g.i != null && g.i !== pi) { c.beginPath(); c.moveTo(px(p.x), px(p.y)); c.lineTo(px(P[g.i].x), px(P[g.i].y)); c.stroke(); } }); }
      P.forEach(function (p) {
        var x = p.ox + (p.x - p.ox) * e, y = p.oy + (p.y - p.oy) * e;
        c.beginPath(); p.trail.forEach(function (t, i) { if (i === 0) c.moveTo(px(t[0]), px(t[1])); else c.lineTo(px(t[0]), px(t[1])); }); c.lineTo(px(x), px(y));
        c.strokeStyle = 'rgba(106,61,240,.45)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#6a3df0'; c.strokeStyle = '#231a52'; c.lineWidth = 2; c.beginPath(); c.arc(px(x), px(y), 6, 0, 6.2832); c.fill(); c.stroke();
      });
      if (showTop) { c.setLineDash([6, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 3; c.beginPath(); c.arc(px(L.top[0]), px(L.top[1]), 20, 0, 6.2832); c.stroke(); c.setLineDash([]); c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('highest ground', px(L.top[0]), px(L.top[1]) - 26); }
      star(c, px(S.ref.gb.x), px(S.ref.gb.y), 12);
      UI.chart(ch, { series: [{ data: histA, color: '#6a3df0' }, { data: histB, color: '#e0a100' }], ymax: Math.ceil(L.gmax * 10) / 10 + 0.1, ref: L.gmax, title: 'fitness over steps: gold = best found, purple = swarm average, dashed = highest possible', xmax: Math.max(60, it + 1), xlabel: 'step' });
    }
    var acc = 0;
    var loop = UI.loop(function (dt) {
      if (tw < 1) tw = Math.min(1, tw + dt / tweenT);
      else if (running && !busy) { acc += dt; if (acc > 0.03) { acc = 0; if (it >= 300) { running = false; bRun.textContent = 'Run'; } else step(); } }
      draw();
    });
    tabL.select(0); tabT.select(0); reset(); draw();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); running = false; bRun.textContent = 'Run'; } };
  }
  window.SWARM = window.SWARM || {}; window.SWARM.pso = build;
})();
