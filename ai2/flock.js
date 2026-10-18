/* World 1-2, demo 2: flocking. Decentralised control, local interaction and emergence made visible. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var W = 640, H = 400, COLS = ['#e8365d', '#2e9e5b', '#6a3df0', '#e8a100', '#0b8fd6', '#d6336c', '#0b7a5a', '#f08c00'];
  function wrap(d, L) { if (d > L / 2) return d - L; if (d < -L / 2) return d + L; return d; }

  function build(host) {
    var seed = 3, rnd, A = [], running = true, it = 0, orderHist = [], groups = 0, order = 0, comp = [], clock = 0;
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, W, H, 'Many small agents moving around a wrapping arena; coloured by the group they belong to');
    var ch = UI.canvas(view, 640, 140, 'Order of the flock over time');
    var out = UI.readout(view), say = el('p', 'verdict'); view.appendChild(say);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#e8365d"></i>one colour = one connected group</li><li><i style="background:#231a52"></i>the outlined agent shows what a single agent can see</li>'; view.appendChild(lg);

    ctl.appendChild(el('h3', 'demo-title', 'Flocking lab'));
    UI.note(ctl, 'Every agent follows the same three local rules, using only the neighbours inside its small circle of vision: do not crowd them (separation), head the way they head (alignment), drift toward them (cohesion). Nobody leads. Nobody sees the whole flock. Watch what appears.');
    var sN = UI.slider(ctl, { label: 'Number of agents', min: 10, max: 120, value: 70, onInput: function () { reset(); } });
    var sR = UI.slider(ctl, { label: 'How far each agent can see', min: 10, max: 160, value: 70, fmt: function (v) { return v + ' px'; } });
    var sS = UI.slider(ctl, { label: 'Separation: keep clear of neighbours', min: 0, max: 3, step: 0.1, value: 1.5, fmt: function (v) { return v.toFixed(1); } });
    var sA = UI.slider(ctl, { label: 'Alignment: match neighbours\' heading', min: 0, max: 3, step: 0.1, value: 1.2, fmt: function (v) { return v.toFixed(1); } });
    var sC = UI.slider(ctl, { label: 'Cohesion: move toward neighbours', min: 0, max: 3, step: 0.1, value: 0.8, fmt: function (v) { return v.toFixed(1); } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Pause', 'btn-sun', function () { running = !running; bRun.textContent = running ? 'Pause' : 'Run'; });
    UI.button(row, 'Scatter again', '', function () { seed++; reset(); });
    UI.button(row, 'Remove 20 agents', '', function () { for (var k = 0; k < 20 && A.length > 6; k++) A.splice(Math.floor(rnd() * A.length), 1); sN.set(A.length, true); });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'The full flock', v: [70, 70, 1.5, 1.2, 0.8] },
      { t: 'No rules at all', v: [70, 70, 0, 0, 0] },
      { t: 'Alignment only', v: [70, 70, 0, 2, 0] },
      { t: 'Cohesion only', v: [70, 70, 0, 0, 2] },
      { t: 'Separation only', v: [70, 70, 2.5, 0, 0] },
      { t: 'Very short-sighted', v: [70, 14, 1.5, 1.2, 0.8] },
      { t: 'Far-sighted', v: [70, 160, 1.5, 1.2, 0.8] }
    ], function (it) { var v = it.v; sN.set(v[0], true); sR.set(v[1], true); sS.set(v[2], true); sA.set(v[3], true); sC.set(v[4], true); reset(); running = true; bRun.textContent = 'Pause'; });

    function reset() {
      rnd = mulberry(seed * 77 + 5); A = []; it = 0; orderHist = [];
      for (var i = 0; i < sN.get(); i++) { var a = rnd() * 6.2832; A.push({ x: rnd() * W, y: rnd() * H, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 }); }
      measure(); setOut();
    }
    function step() {
      var R = sR.get(), R2 = R * R, sepR = R * 0.4, sp = 1.8, wS = sS.get(), wA = sA.get(), wC = sC.get(), n = A.length, i, j;
      var nx = new Array(n), ny = new Array(n);
      for (i = 0; i < n; i++) {
        var a = A[i], cnt = 0, avx = 0, avy = 0, cx = 0, cy = 0, sx = 0, sy = 0;
        for (j = 0; j < n; j++) {
          if (j === i) continue; var b = A[j], dx = wrap(b.x - a.x, W), dy = wrap(b.y - a.y, H), d2 = dx * dx + dy * dy;
          if (d2 > R2) continue; var d = Math.sqrt(d2) || 0.01; cnt++; avx += b.vx; avy += b.vy; cx += dx; cy += dy;
          if (d < sepR) { var k = (1 - d / sepR); sx -= dx / d * k; sy -= dy / d * k; }
        }
        var vx = a.vx, vy = a.vy;
        if (cnt) { vx += wA * 0.12 * (avx / cnt - a.vx) + wC * 0.012 * (cx / cnt) + wS * 0.35 * sx; vy += wA * 0.12 * (avy / cnt - a.vy) + wC * 0.012 * (cy / cnt) + wS * 0.35 * sy; }
        vx += (rnd() - 0.5) * 0.12; vy += (rnd() - 0.5) * 0.12;
        var s = Math.hypot(vx, vy) || 1, tgt = Math.max(1.0, Math.min(sp, s)); nx[i] = vx / s * tgt; ny[i] = vy / s * tgt;
      }
      for (i = 0; i < n; i++) { var p = A[i]; p.vx = nx[i]; p.vy = ny[i]; p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H; }
      it++;
    }
    function measure() {
      var n = A.length, i, j, sx = 0, sy = 0, R2 = sR.get() * sR.get(), par = [];
      for (i = 0; i < n; i++) { var s = Math.hypot(A[i].vx, A[i].vy) || 1; sx += A[i].vx / s; sy += A[i].vy / s; par.push(i); }
      order = Math.hypot(sx, sy) / n;
      function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) { var dx = wrap(A[j].x - A[i].x, W), dy = wrap(A[j].y - A[i].y, H); if (dx * dx + dy * dy <= R2) par[find(i)] = find(j); }
      var sizes = {}; for (i = 0; i < n; i++) { var r = find(i); sizes[r] = (sizes[r] || 0) + 1; }
      var big = Object.keys(sizes).filter(function (k) { return sizes[k] >= 3; }); groups = big.length;
      comp = new Array(n); for (i = 0; i < n; i++) { var idx = big.indexOf(String(find(i))); comp[i] = idx; }
      orderHist.push(order); if (orderHist.length > 200) orderHist.shift();
    }
    function setOut() {
      out.textContent = 'Order ' + order.toFixed(2) + ' (1 means every agent heads the same way, near 0 means random directions). Clusters of 3 or more agents in sight of each other: ' + groups + '. Agents: ' + A.length + '.';
      var m, cls = 'verdict';
      if (it < 40) m = 'The agents have just been scattered at random. Watch the order number.';
      else if (order > 0.85 && groups <= 3) { m = 'Emergence: one coordinated flock. No agent knew the global plan, and none was in charge.'; cls = 'verdict good'; }
      else if (order > 0.85) { m = 'Several well-ordered flocks have formed, each with its own heading.'; cls = 'verdict good'; }
      else if (order > 0.5) m = 'Partial order: neighbours agree locally but the whole arena does not.';
      else if (sR.get() < 30) m = 'Each agent can see almost nobody, so there is nothing to coordinate with and no group behaviour appears.';
      else if (sA.get() < 0.3) m = 'No agent is trying to match its neighbours\' heading, so even close neighbours point every which way. Try the alignment rule.';
      else m = 'Little order. The rules are in balance badly: try a different mix.';
      say.className = cls; say.textContent = m;
    }
    function draw() {
      var c = cv.getContext('2d'); c.fillStyle = '#e4f6ff'; c.fillRect(0, 0, W, H);
      var R = sR.get(), i;
      if (A.length) { var a0 = A[0]; c.beginPath(); c.arc(a0.x, a0.y, R, 0, 6.2832); c.fillStyle = 'rgba(255,210,60,.20)'; c.fill(); c.setLineDash([6, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
        c.strokeStyle = 'rgba(35,26,82,.55)'; c.lineWidth = 1.5; for (i = 1; i < A.length; i++) { var dx = wrap(A[i].x - a0.x, W), dy = wrap(A[i].y - a0.y, H); if (dx * dx + dy * dy <= R * R) { c.beginPath(); c.moveTo(a0.x, a0.y); c.lineTo(a0.x + dx, a0.y + dy); c.stroke(); } } }
      for (i = 0; i < A.length; i++) {
        var p = A[i], ang = Math.atan2(p.vy, p.vx), col = comp[i] >= 0 ? COLS[comp[i] % COLS.length] : '#8a84b0';
        c.save(); c.translate(p.x, p.y); c.rotate(ang); c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, 5.5); c.lineTo(-3, 0); c.lineTo(-6, -5.5); c.closePath();
        c.fillStyle = col; c.fill(); c.lineWidth = i === 0 ? 3 : 1.5; c.strokeStyle = '#231a52'; c.stroke(); c.restore();
      }
      UI.chart(ch, { series: [{ data: orderHist, color: '#2e9e5b' }], ymax: 1, title: 'order over time (1 = everyone heads the same way)', xmax: 200, xlabel: 'time' });
    }
    var loop = UI.loop(function (dt) {
      if (running) { clock += dt; if (clock > 0.025) { clock = 0; step(); step(); if (it % 6 === 0) { measure(); setOut(); } } }
      draw();
    });
    reset(); draw();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); } };
  }
  window.SWARM = window.SWARM || {}; window.SWARM.flock = build;
})();
