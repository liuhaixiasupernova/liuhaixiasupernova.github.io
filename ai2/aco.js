/* World 1-2, demo 3: ant colony optimisation on a small travelling-salesman map.
   Shows: interaction through the environment (pheromone), solutions built move by move, and the transition rule at each city. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var W = 640, H = 400, N = 12;

  /* ---------- pure helpers (also used by the tests) ---------- */
  function makeCities(seed) {
    var r = mulberry(seed * 131 + 7), P = [], tries = 0;
    while (P.length < N && tries++ < 5000) {
      var p = [40 + r() * (W - 80), 40 + r() * (H - 80)], ok = true;
      for (var i = 0; i < P.length; i++) if (Math.hypot(P[i][0] - p[0], P[i][1] - p[1]) < 56) { ok = false; break; }
      if (ok) P.push(p);
    }
    return P;
  }
  function distMatrix(P) { return P.map(function (a) { return P.map(function (b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }); }); }
  function tourLen(D, t) { var s = 0; for (var i = 0; i < t.length; i++) s += D[t[i]][t[(i + 1) % t.length]]; return s; }
  /* exact optimum by Held-Karp dynamic programming, start city 0 */
  function heldKarp(D) {
    var n = D.length, full = 1 << (n - 1), INF = 1e18, dp = [], par = [], S, j, k;
    for (S = 0; S < full; S++) { dp.push(new Array(n - 1).fill(INF)); par.push(new Array(n - 1).fill(-1)); }
    for (j = 0; j < n - 1; j++) dp[1 << j][j] = D[0][j + 1];
    for (S = 1; S < full; S++) for (j = 0; j < n - 1; j++) {
      if (!(S & (1 << j)) || dp[S][j] >= INF) continue;
      for (k = 0; k < n - 1; k++) { if (S & (1 << k)) continue; var T = S | (1 << k), v = dp[S][j] + D[j + 1][k + 1]; if (v < dp[T][k]) { dp[T][k] = v; par[T][k] = j; } }
    }
    var best = INF, bj = -1; for (j = 0; j < n - 1; j++) { var v2 = dp[full - 1][j] + D[j + 1][0]; if (v2 < best) { best = v2; bj = j; } }
    var tour = [], S2 = full - 1, c = bj; while (c >= 0) { tour.push(c + 1); var pc = par[S2][c]; S2 ^= (1 << c); c = pc; }
    tour.push(0); tour.reverse(); return { len: best, tour: tour };
  }
  function nearestNeighbour(D, s) { var n = D.length, seen = {}, t = [s], c = s; seen[s] = 1; while (t.length < n) { var b = -1; for (var j = 0; j < n; j++) if (!seen[j] && (b < 0 || D[c][j] < D[c][b])) b = j; seen[b] = 1; t.push(b); c = b; } return t; }
  /* the transition rule: for an ant standing at city c with some cities already visited */
  function transition(D, tau, c, visited, alpha, beta) {
    var rows = [], tot = 0, j;
    for (j = 0; j < D.length; j++) { if (visited[j]) continue; var eta = 1 / D[c][j], w = Math.pow(tau[c][j], alpha) * Math.pow(eta, beta); rows.push({ j: j, d: D[c][j], tau: tau[c][j], eta: eta, w: w }); tot += w; }
    rows.forEach(function (r) { r.p = tot > 0 ? r.w / tot : 1 / rows.length; });
    return rows;
  }
  function pickRow(rows, u) { var acc = 0; for (var i = 0; i < rows.length; i++) { acc += rows[i].p; if (u < acc) return rows[i]; } return rows[rows.length - 1]; }
  function buildTour(D, tau, start, alpha, beta, rnd) {
    var visited = {}, t = [start], c = start; visited[start] = 1;
    while (t.length < D.length) { var row = pickRow(transition(D, tau, c, visited, alpha, beta), rnd()); visited[row.j] = 1; t.push(row.j); c = row.j; }
    return t;
  }
  window.SWARM = window.SWARM || {};
  window.SWARM.acoLib = { N: N, makeCities: makeCities, distMatrix: distMatrix, tourLen: tourLen, heldKarp: heldKarp, nearestNeighbour: nearestNeighbour, transition: transition, buildTour: buildTour };

  /* ---------- the demo ---------- */
  function build(host) {
    var seed = 4, P, D, opt, nn, nnLen, tau, best, bestLen, iter, running = false, hist = [], histBest = [], rnd = mulberry(9), clock = 0, showT = true;
    var walk = null; /* the single ant we follow move by move */
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, W, H, 'Twelve cities joined by roads. Thicker roads carry more pheromone. The dashed line is the best tour found so far.');
    var ch = UI.canvas(view, 640, 140, 'How much longer than the best possible tour the colony\'s best tour is');
    var out = UI.readout(view), say = el('p', 'verdict'); view.appendChild(say);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#6a3df0"></i>road thickness = pheromone (the shared memory in the environment)</li><li><i style="background:#e8a100"></i>dashed = best tour so far</li><li><i style="background:#e8365d"></i>red ant = the one you step through below</li>'; view.appendChild(lg);
    var insp = el('div', 'scroll-x'); view.appendChild(insp);

    ctl.appendChild(el('h3', 'demo-title', 'Ant colony on a map (TSP)'));
    UI.note(ctl, 'Problem: visit all 12 cities once and come home, as short as possible. Each ant builds a whole tour by itself, choosing the next city at every step. No ant knows the map as a whole, and no ant talks to another. They only read and write pheromone on the roads.');
    var sM = UI.slider(ctl, { label: 'Ants per round', min: 1, max: 30, value: 10 });
    var sA = UI.slider(ctl, { label: 'alpha: how much to trust pheromone', min: 0, max: 4, step: 0.1, value: 1, fmt: function (v) { return v.toFixed(1); }, onInput: function () { refreshWalk(); } });
    var sB = UI.slider(ctl, { label: 'beta: how much to prefer short roads', min: 0, max: 6, step: 0.1, value: 3, fmt: function (v) { return v.toFixed(1); }, onInput: function () { refreshWalk(); } });
    var sR = UI.slider(ctl, { label: 'rho: evaporation per round', min: 0, max: 0.9, step: 0.05, value: 0.3, fmt: function (v) { return Math.round(v * 100) + '%'; } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run', 'btn-sun', function () { running = !running; bRun.textContent = running ? 'Pause' : 'Run'; });
    UI.button(row, 'One round', '', function () { round(); drawAll(); });
    UI.button(row, 'Reset pheromone', '', function () { resetTau(); drawAll(); });
    UI.button(row, 'New map', '', function () { seed++; newMap(); drawAll(); });
    UI.toggle(row, 'Show pheromone', true, function (v) { showT = v; });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Balanced colony', v: [10, 1, 3, 0.3] },
      { t: 'Ignore pheromone (alpha 0)', v: [10, 0, 3, 0.3] },
      { t: 'Ignore distance (beta 0)', v: [10, 1, 0, 0.3] },
      { t: 'No evaporation', v: [10, 1, 3, 0] },
      { t: 'Evaporates very fast', v: [10, 1, 3, 0.9] },
      { t: 'Only 1 ant', v: [1, 1, 3, 0.3] },
      { t: 'Pheromone dominates', v: [10, 3, 1, 0.3] }
    ], function (it) { var v = it.v; sM.set(v[0], true); sA.set(v[1], true); sB.set(v[2], true); sR.set(v[3], true); resetTau(); refreshWalk(); running = true; bRun.textContent = 'Pause'; });

    ctl.appendChild(el('h3', 'demo-title', 'Watch one ant decide'));
    UI.note(ctl, 'This ant stands at a city and has to pick the next one. Its chance of going to each unvisited city is proportional to (pheromone)^alpha x (1/distance)^beta. Press the button to let it move, and read the table.');
    var row2 = el('div', 'btnrow'); ctl.appendChild(row2);
    UI.button(row2, 'Ant moves one step', 'btn-sun', function () { stepWalk(); });
    UI.button(row2, 'New ant', '', function () { newWalk(); });

    function resetTau() { tau = D.map(function (r) { return r.map(function () { return 1; }); }); best = null; bestLen = Infinity; iter = 0; hist = []; histBest = []; }
    function newMap() {
      P = makeCities(seed); D = distMatrix(P); opt = heldKarp(D); nn = nearestNeighbour(D, 0); nnLen = tourLen(D, nn);
      resetTau(); newWalk();
    }
    function newWalk() { var s = Math.floor(rnd() * N); walk = { path: [s], visited: {}, rows: null, last: null, done: false }; walk.visited[s] = 1; refreshWalk(); }
    function refreshWalk() {
      if (!walk) return;
      walk.rows = walk.done ? null : transition(D, tau, walk.path[walk.path.length - 1], walk.visited, sA.get(), sB.get());
      renderInsp();
    }
    function stepWalk() {
      if (walk.done) { newWalk(); return; }
      var pick = pickRow(walk.rows, rnd());
      walk.last = { from: walk.path[walk.path.length - 1], rows: walk.rows, to: pick.j };
      walk.visited[pick.j] = 1; walk.path.push(pick.j);
      if (walk.path.length === N) walk.done = true;
      refreshWalk();
    }
    function renderInsp() {
      insp.innerHTML = '';
      var show = walk.done ? walk.last : { from: walk.path[walk.path.length - 1], rows: walk.rows, to: null };
      var cap = el('p', 'note');
      if (walk.done) cap.textContent = 'The ant has visited all 12 cities and returns to city ' + (walk.path[0] + 1) + '. Tour length ' + Math.round(tourLen(D, walk.path)) + ' (best possible ' + Math.round(opt.len) + '). Below: its final choice. Press the button for a new ant.';
      else cap.textContent = 'The ant is at city ' + (show.from + 1) + '. Visited so far: ' + walk.path.map(function (c) { return c + 1; }).join(' > ') + '. Its choices now:';
      insp.appendChild(cap);
      var t = document.createElement('table'); t.className = 'tbl';
      t.innerHTML = '<thead><tr><th>Go to city</th><th>distance</th><th>pheromone</th><th>1/distance</th><th>pheromone^alpha x (1/distance)^beta</th><th>chance</th></tr></thead>';
      var tb = document.createElement('tbody');
      show.rows.forEach(function (r) {
        var tr = document.createElement('tr'); if (r.j === show.to) tr.style.background = '#fff3c4';
        tr.innerHTML = '<td>' + (r.j + 1) + (r.j === show.to ? ' (chosen)' : '') + '</td><td>' + r.d.toFixed(0) + '</td><td>' + r.tau.toFixed(2) + '</td><td>' + r.eta.toFixed(4) + '</td><td>' + (r.w < 0.001 ? r.w.toExponential(1) : r.w.toFixed(4)) + '</td><td><b>' + Math.round(r.p * 100) + '%</b></td>';
        tb.appendChild(tr);
      });
      t.appendChild(tb); insp.appendChild(t);
    }

    function round() {
      var m = sM.get(), al = sA.get(), be = sB.get(), rho = sR.get(), tours = [], i, j, rb = Infinity;
      for (i = 0; i < m; i++) { var t = buildTour(D, tau, Math.floor(rnd() * N), al, be, rnd), L = tourLen(D, t); tours.push({ t: t, L: L }); if (L < rb) rb = L; if (L < bestLen - 1e-9) { bestLen = L; best = t.slice(); } }
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) tau[i][j] *= (1 - rho);
      var Q = nnLen; /* deposit Q/L: shorter tour, more pheromone */
      tours.forEach(function (o) { var d = Q / o.L; for (var k = 0; k < N; k++) { var a = o.t[k], b = o.t[(k + 1) % N]; tau[a][b] += d; tau[b][a] += d; } });
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) if (i !== j && tau[i][j] < 1e-6) tau[i][j] = 1e-6;
      iter++; hist.push((rb / opt.len - 1) * 100); histBest.push((bestLen / opt.len - 1) * 100);
      refreshWalk();
    }
    function status() {
      if (!iter) { out.textContent = 'Best possible tour (found exactly by a computer check): ' + Math.round(opt.len) + '. Greedy "always go to the nearest city" gives ' + Math.round(nnLen) + ' (' + Math.round((nnLen / opt.len - 1) * 100) + '% longer). The colony has not started.'; say.className = 'verdict'; say.textContent = 'Press Run, or try a preset.'; return; }
      var ex = (bestLen / opt.len - 1) * 100;
      out.textContent = 'Round ' + iter + '. Best tour so far: ' + Math.round(bestLen) + ' (' + (ex < 0.05 ? 'the best possible' : ex.toFixed(1) + '% longer than the best possible, ' + Math.round(opt.len)) + '). Greedy nearest-city: ' + Math.round(nnLen) + '.';
      var cls = 'verdict', m;
      if (ex < 0.05 && sA.get() === 0) { m = 'The best possible tour turned up, by sampling many tours guided by distance alone. With alpha = 0 nothing is learned between rounds. On this small map that can be enough; the balanced colony usually gets there more reliably, and the gap grows on bigger maps. Try several maps.'; cls = 'verdict warn'; }
      else if (ex < 0.05) { m = 'The colony found the best possible tour. Nobody planned it: each ant built one tour with local choices, and the shared pheromone carried the good pieces forward.'; cls = 'verdict good'; }
      else if (iter < 8) m = 'Early rounds: the pheromone is nearly even, so ants mostly follow short roads (the 1/distance part).';
      else if (sA.get() === 0) m = 'With alpha = 0 the ants ignore pheromone, so they never learn from each other. Each round is an independent guess.';
      else if (sB.get() === 0 && ex > 3) m = 'With beta = 0 only pheromone guides the ants. At the start it is even everywhere, so early choices are random and may lock in.';
      else if (sR.get() === 0 && iter > 30) m = 'No evaporation: early pheromone never fades, so a mediocre early tour can keep attracting ants (stagnation).';
      else if (sR.get() >= 0.85) m = 'Pheromone fades almost as fast as it is laid, so the colony has hardly any memory.';
      else if (ex > 3) m = 'Still improving. The colony is ' + ex.toFixed(0) + '% above the best possible.'; else m = 'Very close to the best. A few more rounds may close the gap.';
      say.className = cls; say.textContent = m;
    }
    function drawAll() { draw(); status(); }
    function draw() {
      var c = cv.getContext('2d'), i, j, mx = 0; c.fillStyle = '#f4fbff'; c.fillRect(0, 0, W, H);
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) if (tau[i][j] > mx) mx = tau[i][j];
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
        var f = showT ? tau[i][j] / mx : 0.12; c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]);
        c.strokeStyle = 'rgba(106,61,240,' + (0.08 + 0.8 * f).toFixed(2) + ')'; c.lineWidth = 1 + 9 * f * f; c.stroke();
      }
      if (best) { c.setLineDash([8, 6]); c.strokeStyle = '#e8a100'; c.lineWidth = 3; c.beginPath(); best.forEach(function (k, n) { if (n === 0) c.moveTo(P[k][0], P[k][1]); else c.lineTo(P[k][0], P[k][1]); }); c.lineTo(P[best[0]][0], P[best[0]][1]); c.stroke(); c.setLineDash([]); }
      if (walk) { c.strokeStyle = '#e8365d'; c.lineWidth = 4; c.beginPath(); walk.path.forEach(function (k, n) { if (n === 0) c.moveTo(P[k][0], P[k][1]); else c.lineTo(P[k][0], P[k][1]); }); if (walk.done) c.lineTo(P[walk.path[0]][0], P[walk.path[0]][1]); c.stroke(); }
      c.font = '800 14px Nunito,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (i = 0; i < N; i++) {
        var cur = walk && !walk.done && walk.path[walk.path.length - 1] === i;
        c.beginPath(); c.arc(P[i][0], P[i][1], 15, 0, 6.2832); c.fillStyle = cur ? '#e8365d' : '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#231a52'; c.stroke();
        c.fillStyle = cur ? '#fff' : '#231a52'; c.fillText(String(i + 1), P[i][0], P[i][1] + 1);
      }
      var ymax = Math.max(10, Math.ceil(Math.max.apply(null, hist.concat([1])) / 10) * 10);
      UI.chart(ch, { series: [{ data: hist, color: '#9aa0c8' }, { data: histBest, color: '#6a3df0' }], ymax: ymax, title: '% longer than best possible (purple: best so far, grey: this round)', xmax: Math.max(40, hist.length), xlabel: 'round' });
    }
    var loop = UI.loop(function (dt) {
      if (running) { clock += dt; if (clock > 0.12) { clock = 0; round(); } }
      drawAll();
    });
    newMap(); drawAll();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); } };
  }
  window.SWARM.aco = build;
})();
