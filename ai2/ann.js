/* World 1-3, panels 2 and 3: overfitting of a small neural network over epochs, and cross-validation with epochs as the choice. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el, K = window.KNN, ANN = window.ANN = {};
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function fmtP(p) { return p < 0.0001 ? '< 0.0001' : '= ' + p.toFixed(3); }
  var EPOCHS = 300, LR = 0.005;

  /* ---------- panel 2: overfitting over epochs ---------- */
  ANN.buildOver = function (host) {
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cvL = UI.canvas(view, 640, 300, 'Training loss and validation loss of a neural network over 300 epochs');
    var cvA = UI.canvas(view, 640, 190, 'Training accuracy and validation accuracy over 300 epochs');
    var out = UI.readout(view), verdict = el('p', 'verdict'); view.appendChild(verdict);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#6a3df0"></i>training songs (the network learns from these)</li><li><i style="background:#e8a100"></i>60 validation songs (never used to train)</li>'; view.appendChild(lg);

    ctl.appendChild(el('h3', 'demo-title', 'Watch a network start to memorise'));
    UI.note(ctl, 'A small neural network learns to guess the genre. One epoch means it has seen every training song once. Loss is how wrong it is (lower is better). Press the presets, then drag the epoch slider to stop training at different moments.');
    var sN = UI.slider(ctl, { label: 'Training songs', min: 20, max: 140, step: 4, value: 40, onInput: recompute });
    var sM = UI.slider(ctl, { label: 'Useless extra features', min: 0, max: 20, value: 10, onInput: recompute });
    var sH = UI.slider(ctl, { label: 'Hidden units (network size)', min: 1, max: 64, value: 32, onInput: recompute });
    var sW = UI.slider(ctl, { label: 'Weight decay (keeps weights small)', min: 0, max: 0.1, step: 0.01, value: 0, fmt: function (v) { return v.toFixed(2); }, onInput: recompute });
    var sE = UI.slider(ctl, { label: 'Stop training at epoch', min: 0, max: EPOCHS, step: 1, value: EPOCHS, onInput: function () { draw(); } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    UI.button(row, 'Train again (new random start)', '', function () { seed++; recompute(); });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Overfit it', v: [40, 10, 32, 0, 'end'] }, { t: 'Fix 1: stop early', v: [40, 10, 32, 0, 'best'] },
      { t: 'Fix 2: smaller network', v: [40, 10, 3, 0, 'end'] }, { t: 'Fix 3: more songs', v: [140, 10, 32, 0, 'end'] },
      { t: 'Fix 4: weight decay', v: [40, 10, 32, 0.03, 'end'] }, { t: 'Fix 5: remove useless features', v: [40, 0, 32, 0, 'end'] }
    ], function (it) { var v = it.v; sN.set(v[0], true); sM.set(v[1], true); sH.set(v[2], true); sW.set(v[3], true); recompute(); sE.set(v[4] === 'best' ? best : EPOCHS); });
    UI.note(ctl, 'Careful: choosing the stopping epoch from these 60 songs uses them to make a decision, so they are no longer a fair final test. Panel 3 shows how to choose the number of epochs honestly. Learning rate is fixed at ' + LR + '. Each song also has extra features that tell nothing about its genre.', 'fine');

    var seed = 1, R = null, best = 0, reveal = 1;
    function recompute() {
      var t0 = Date.now();
      R = K.trainNet({ train: K.pool.slice(0, sN.get()), val: K.test, D: 2 + sM.get(), H: sH.get(), epochs: EPOCHS, lr: LR, wd: sW.get(), seed: seed, every: true });
      best = 0; for (var e = 1; e <= EPOCHS; e++) if (R.vaL[e] < R.vaL[best]) best = e;
      reveal = UI.reduce ? 1 : 0; sE.set(EPOCHS, true); draw();
    }
    var W = 640, l = 52, r = 14;
    function chart(cv, H, tr, va, opt) {
      var c = cv.getContext('2d'), t = 24, b = 34, upto = Math.max(1, Math.round(reveal * EPOCHS)), cur = sE.get();
      function X(e) { return l + e / EPOCHS * (W - l - r); }
      function Y(v) { return H - b - (v - opt.lo) / (opt.hi - opt.lo) * (H - b - t); }
      c.clearRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      c.font = '700 12px Nunito,system-ui,sans-serif'; c.fillStyle = '#231a52'; c.strokeStyle = 'rgba(35,26,82,.15)'; c.lineWidth = 1; c.textAlign = 'right';
      opt.ticks.forEach(function (v) { c.beginPath(); c.moveTo(l, Y(v)); c.lineTo(W - r, Y(v)); c.stroke(); c.fillText(opt.fmt(v), l - 6, Y(v) + 4); });
      c.textAlign = 'left'; c.fillText(opt.title, l + 4, 15);
      c.textAlign = 'center'; [0, 50, 100, 150, 200, 250, 300].forEach(function (e) { c.fillText(String(e), X(e), H - b + 16); }); c.fillText('epochs of training', (l + W - r) / 2, H - 6);
      if (opt.guess != null) { c.setLineDash([5, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(l, Y(opt.guess)); c.lineTo(W - r, Y(opt.guess)); c.stroke(); c.setLineDash([]); c.textAlign = 'right'; c.fillText('guessing', W - r - 4, Y(opt.guess) - 5); }
      /* gap shading (validation worse than training) */
      if (opt.shade) { c.beginPath(); for (var e = 0; e <= upto; e++) c.lineTo(X(e), Y(Math.min(opt.hi, tr[e]))); for (e = upto; e >= 0; e--) c.lineTo(X(e), Y(Math.min(opt.hi, va[e]))); c.closePath(); c.fillStyle = 'rgba(232,54,93,.15)'; c.fill(); }
      function line(a, col) { c.beginPath(); for (var e2 = 0; e2 <= upto; e2++) { var y = Y(Math.max(opt.lo, Math.min(opt.hi, a[e2]))); if (e2 === 0) c.moveTo(X(e2), y); else c.lineTo(X(e2), y); } c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
      line(tr, '#6a3df0'); line(va, '#e8a100');
      if (reveal >= 1) { /* best epoch marker */
        c.setLineDash([3, 4]); c.strokeStyle = '#16a06a'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(best), t); c.lineTo(X(best), H - b); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#16a06a'; c.textAlign = best > EPOCHS * 0.6 ? 'right' : 'left'; if (!opt.guess) c.fillText('lowest validation loss: epoch ' + best, X(best) + (best > EPOCHS * 0.6 ? -5 : 5), t + 12);
        c.fillStyle = '#231a52'; c.setLineDash([4, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(X(cur), t); c.lineTo(X(cur), H - b); c.stroke(); c.setLineDash([]);
        [[tr, '#6a3df0'], [va, '#e8a100']].forEach(function (p) { c.beginPath(); c.arc(X(cur), Y(Math.max(opt.lo, Math.min(opt.hi, p[0][cur]))), 6, 0, 6.2832); c.fillStyle = p[1]; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke(); });
      }
    }
    function draw() {
      if (!R) return;
      var hiL = 1.6; for (var e = 0; e <= EPOCHS; e++) hiL = Math.max(hiL, R.vaL[e]); hiL = Math.min(4, Math.ceil(hiL * 2) / 2);
      var ticks = []; for (var v = 0; v <= hiL + 1e-9; v += hiL > 2.5 ? 1 : 0.5) ticks.push(v);
      chart(cvL, 300, R.trL, R.vaL, { lo: 0, hi: hiL, ticks: ticks, fmt: function (x) { return x.toFixed(1); }, title: 'Loss (lower is better)', shade: true });
      chart(cvA, 190, R.trA, R.vaA, { lo: 0, hi: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: function (x) { return Math.round(x * 100) + '%'; }, title: 'Accuracy', guess: 0.25 });
      var c = sE.get(), n = sN.get();
      out.textContent = 'At epoch ' + c + ': training loss ' + R.trL[c].toFixed(2) + ', validation loss ' + R.vaL[c].toFixed(2) + '. Training accuracy ' + pct(R.trA[c], 0) + ', validation accuracy ' + pct(R.vaA[c], 0) + '. (' + n + ' training songs, ' + sM.get() + ' useless features, ' + sH.get() + ' hidden units.)';
      var rise = R.vaL[c] - R.vaL[best];
      if (c <= 25 && R.trL[c] > 0.9) { verdict.className = 'verdict'; verdict.textContent = 'The network has barely started. Both losses are high. That is underfitting, and it is normal at the start of training. Keep dragging the epoch slider to the right.'; }
      else if (c > best + 5 && rise > 0.15) { verdict.className = 'verdict warn'; verdict.textContent = 'Overfitting. Since epoch ' + best + ' the training loss has kept falling (to ' + R.trL[c].toFixed(2) + ') but the validation loss has risen from ' + R.vaL[best].toFixed(2) + ' to ' + R.vaL[c].toFixed(2) + '. The network is now memorising the ' + n + ' training songs, noise included, instead of learning the genres.'; }
      else if (Math.abs(c - best) <= 8) { verdict.className = 'verdict good'; verdict.textContent = 'A good place to stop. Validation loss is at its lowest. Training longer only makes the network better at the training songs, not at new ones.'; }
      else { verdict.className = 'verdict'; verdict.textContent = 'Healthy so far: the validation loss is close to its best (epoch ' + best + '), and training and validation are moving together.'; }
      var accRise = R.vaA[best] - R.vaA[EPOCHS];
      if (c === EPOCHS && rise > 0.15 && accRise < 0.04) verdict.textContent += ' Notice that validation accuracy has hardly moved even though the loss rose: the network is becoming over-confident in its wrong answers. That is why we watch loss, not only accuracy.';
    }
    recompute();
    var loop = UI.loop(function (dt) { if (reveal < 1) { reveal = Math.min(1, reveal + dt / 1.8); draw(); } });
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); } };
  };

  /* ---------- panel 3: cross-validation, choosing the number of epochs ---------- */
  ANN.buildCV = function (host) {
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var bar = el('div', 'foldbar'); bar.setAttribute('aria-hidden', 'true'); view.appendChild(bar);
    var cells = []; for (var i = 0; i < 10; i++) { var c0 = el('div', 'fcell'); bar.appendChild(c0); cells.push(c0); }
    var status = UI.readout(view); status.textContent = 'Press Run. Each seed shuffles the 200 songs into 10 folds. A fresh network is trained on 9 folds and tested on the fold left out, ten times per seed.';
    var cv = UI.canvas(view, 640, 300, 'Accuracy of the two training lengths for each seed, joined by a line per seed');
    var tbWrap = el('div', 'scroll-x'), tb = document.createElement('table'); tb.className = 'tbl'; tbWrap.appendChild(tb); view.appendChild(tbWrap);
    var res = el('div', 'res'), verdict = el('p', 'verdict'); verdict.hidden = true; view.appendChild(res); view.appendChild(verdict);

    ctl.appendChild(el('h3', 'demo-title', 'How many epochs? Let cross-validation decide'));
    UI.note(ctl, 'Compare two ways of training the same network: A stops after fewer epochs, B trains longer. Each fold trains a new network from scratch and both A and B are measured on the same fold. Then a statistical test asks whether the gap is bigger than the luck of the split.');
    var sA = UI.slider(ctl, { label: 'A: stop after epochs', min: 5, max: 300, step: 5, value: 100 });
    var sB = UI.slider(ctl, { label: 'B: stop after epochs', min: 5, max: 300, step: 5, value: 300 });
    var sH = UI.slider(ctl, { label: 'Hidden units', min: 1, max: 32, value: 16 });
    var sM = UI.slider(ctl, { label: 'Useless extra features', min: 0, max: 20, value: 10 });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run 10 folds x 5 seeds', 'btn-sun', function () { run(); });
    UI.button(row, '5 different seeds', '', function () { seedBase += 5; run(); });
    UI.presets(ctl, 'TRY THIS', [
      { t: '10 against 100 epochs (a clear gap)', v: [10, 100, 16, 10] }, { t: '100 against 300 epochs', v: [100, 300, 16, 10] }, { t: 'No useless features: 100 against 300', v: [100, 300, 16, 0] }
    ], function (it) { sA.set(it.v[0], true); sB.set(it.v[1], true); sH.set(it.v[2], true); sM.set(it.v[3], true); run(); });
    UI.note(ctl, 'A run really trains 50 networks, so it takes a few seconds. A and B come from the same training run, A is simply the network as it was after fewer epochs, so the comparison is fair.', 'fine');

    var seedBase = 0, token = 0, rows = [], aF = [], bF = [], ea, eb;
    function setTable() {
      var h = '<thead><tr><th>Seed</th><th>A (' + ea + ' epochs)</th><th>B (' + eb + ' epochs)</th><th>B minus A</th></tr></thead><tbody>';
      rows.forEach(function (r) { var d = (r.b - r.a) * 100; h += '<tr><td class="n">' + r.seed + '</td><td class="n">' + pct(r.a) + '</td><td class="n">' + pct(r.b) + '</td><td class="n">' + (d > 0 ? '+' : '') + d.toFixed(1) + ' pts</td></tr>'; });
      tb.innerHTML = h + '</tbody>';
    }
    function plot() {
      var c = cv.getContext('2d'), w = 640, h = 300, l = 52, r = 20, t = 30, b = 34, XA = 190, XB = 450;
      c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      var vals = []; rows.forEach(function (q) { vals.push(q.a, q.b); }); if (!vals.length) vals = [0.5, 0.8];
      var lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 0.04) * 20) / 20), hi = Math.min(1, Math.ceil((Math.max.apply(null, vals) + 0.04) * 20) / 20);
      if (hi - lo < 0.1) { hi = Math.min(1, lo + 0.1); }
      function Y(v) { return h - b - (v - lo) / (hi - lo) * (h - b - t); }
      c.font = '700 12px Nunito,system-ui,sans-serif'; c.fillStyle = '#231a52'; c.strokeStyle = 'rgba(35,26,82,.15)'; c.lineWidth = 1; c.textAlign = 'right';
      var stp = (hi - lo) > 0.3 ? 0.1 : 0.05; for (var v = Math.ceil(lo / stp) * stp; v <= hi + 1e-9; v += stp) { c.beginPath(); c.moveTo(l, Y(v)); c.lineTo(w - r, Y(v)); c.stroke(); c.fillText(Math.round(v * 100) + '%', l - 6, Y(v) + 4); }
      c.textAlign = 'left'; c.fillText('accuracy of each seed (average over its 10 folds)', l + 4, 16);
      c.textAlign = 'center'; c.fillText('A: ' + ea + ' epochs', XA, h - 10); c.fillText('B: ' + eb + ' epochs', XB, h - 10);
      rows.forEach(function (q) { c.beginPath(); c.moveTo(XA, Y(q.a)); c.lineTo(XB, Y(q.b)); c.strokeStyle = q.b > q.a ? '#16a06a' : q.b < q.a ? '#e8365d' : '#8a84b0'; c.lineWidth = 2; c.stroke(); });
      rows.forEach(function (q) { [[XA, q.a, '#6a3df0'], [XB, q.b, '#e8a100']].forEach(function (p) { c.beginPath(); c.arc(p[0], Y(p[1]), 6, 0, 6.2832); c.fillStyle = p[2]; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke(); }); });
      if (rows.length) [[XA, K.mean(rows.map(function (q) { return q.a; }))], [XB, K.mean(rows.map(function (q) { return q.b; }))]].forEach(function (p) {
        c.beginPath(); c.moveTo(p[0] - 44, Y(p[1])); c.lineTo(p[0] + 44, Y(p[1])); c.lineWidth = 4; c.strokeStyle = '#231a52'; c.stroke();
        c.textAlign = 'left'; c.fillStyle = '#231a52'; c.fillText('mean ' + pct(p[1]), p[0] + 50, Y(p[1]) + 4);
      });
    }
    function finish() {
      var a = rows.map(function (q) { return q.a; }), b = rows.map(function (q) { return q.b; }), d = rows.map(function (q) { return q.b - q.a; });
      var dd = bF.map(function (v, i) { return v - aF[i]; }), pt = K.pairedT(d), ct = K.correctedT(dd, 1 / 9);
      var wins = d.filter(function (v) { return v > 1e-9; }).length, losses = d.filter(function (v) { return v < -1e-9; }).length, S = rows.length;
      res.innerHTML = '';
      [
        'A (' + ea + ' epochs): mean accuracy ' + pct(K.mean(a)) + ', sd ' + pct(K.sd(a)) + ' across seeds. B (' + eb + ' epochs): ' + pct(K.mean(b)) + ', sd ' + pct(K.sd(b)) + '.',
        'Single folds are noisy. Network A scored anywhere from ' + pct(Math.min.apply(null, aF), 0) + ' to ' + pct(Math.max.apply(null, aF), 0) + ' on individual folds of 20 songs. One split could tell almost any story.',
        'B beat A on ' + wins + ' of ' + S + ' seeds, A beat B on ' + losses + '.',
        'Paired t-test on the ' + S + ' seed means: difference ' + (K.mean(d) * 100).toFixed(1) + ' points, t(' + pt.df + ') = ' + (isFinite(pt.t) ? pt.t.toFixed(2) : 'very large') + ', p ' + fmtP(pt.p) + '.',
        'Corrected resampled t-test on all ' + dd.length + ' folds (allows for overlapping training sets): t(' + ct.df + ') = ' + (isFinite(ct.t) ? ct.t.toFixed(2) : 'very large') + ', p ' + fmtP(ct.p) + '.'
      ].forEach(function (t) { res.appendChild(el('p', 'demo-note', t)); });
      var better = K.mean(d) > 0 ? 'B (' + eb + ' epochs)' : 'A (' + ea + ' epochs)', diff = Math.abs(K.mean(d) * 100).toFixed(1);
      verdict.hidden = false;
      if (wins + losses === 0) { verdict.className = 'verdict'; verdict.textContent = 'A and B are the same network stopped at the same epoch, so every difference is zero. Choose different epochs.'; }
      else if (ct.p < 0.05) { verdict.className = 'verdict good'; verdict.textContent = 'Reliable. ' + better + ' is better by about ' + diff + ' points, and even the strict test agrees.'; }
      else if (pt.p < 0.05) { verdict.className = 'verdict warn'; verdict.textContent = 'Be careful. The simple test says the gap is real (p ' + fmtP(pt.p) + '), but the stricter test does not (p ' + fmtP(ct.p) + '). Repeated cross-validation reuses the same songs, which makes the simple test too confident. Call it promising, not proven.'; }
      else { verdict.className = 'verdict'; verdict.textContent = 'No reliable difference. The gap you see is about the size of the noise from different splits and different random starts.'; }
    }
    function run() {
      var my = ++token; ea = sA.get(); eb = sB.get(); var H = sH.get(), D = 2 + sM.get(), E = Math.max(ea, eb);
      rows = []; aF = []; bF = []; verdict.hidden = true; res.innerHTML = ''; setTable(); plot(); bRun.disabled = true;
      cells.forEach(function (c) { c.className = 'fcell'; });
      var s = 0, f = 0, folds = null, sa = [], sb = [];
      function tick() {
        if (my !== token) return;
        if (f === 0) { folds = K.folds(seedBase + s + 1); sa = []; sb = []; cells.forEach(function (c) { c.className = 'fcell'; }); }
        var inF = {}; folds[f].forEach(function (id) { inF[id] = true; });
        var train = []; for (var q = 0; q < K.N; q++) if (!inF[q]) train.push(q);
        var rr = K.trainNet({ train: train, val: folds[f], D: D, H: H, epochs: E, lr: LR, seed: (seedBase + s + 1) * 100 + f, every: false, at: [ea, eb] });
        var acc = [rr.at[ea], rr.at[eb]]; sa.push(acc[0]); sb.push(acc[1]); aF.push(acc[0]); bF.push(acc[1]);
        cells.forEach(function (c, j) { c.className = 'fcell' + (j < f ? ' done' : j === f ? ' act' : ''); });
        status.textContent = 'Seed ' + (seedBase + s + 1) + ' (' + (s + 1) + ' of 5), fold ' + (f + 1) + ' of 10. This fold: A ' + pct(acc[0], 0) + ', B ' + pct(acc[1], 0) + '.';
        f++;
        if (f === 10) {
          cells.forEach(function (c) { c.className = 'fcell done'; });
          rows.push({ seed: seedBase + s + 1, a: K.mean(sa), b: K.mean(sb) }); setTable(); plot(); f = 0; s++;
          if (s === 5) { status.textContent = 'Done: 5 seeds x 10 folds = 50 test results per network. Read the numbers below.'; bRun.disabled = false; finish(); return; }
        }
        setTimeout(tick, UI.reduce ? 0 : 20);
      }
      setTimeout(tick, 30);
    }
    ea = sA.get(); eb = sB.get(); setTable(); plot();
    return { resume: function () {}, pause: function () { token++; bRun.disabled = false; } };
  };
})();
