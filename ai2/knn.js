/* World 1-3, panels A and B: how KNN decides, and overfitting. Panel C and the quiz are in knn-cv.js */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el, K = window.KNN;
  var W = 560, H = 420, L = 46, R = 10, T = 10, B = 36, BPM0 = 40, BPM1 = 200;
  function tx(b) { return L + (b - BPM0) / (BPM1 - BPM0) * (W - L - R); }
  function ty(v) { return H - B - v * (H - B - T); }
  function shape(c, kind, x, y, r, fill) {
    c.beginPath();
    if (kind === 'circle') c.arc(x, y, r, 0, 6.2832);
    else if (kind === 'square') c.rect(x - r, y - r, 2 * r, 2 * r);
    else if (kind === 'triangle') { c.moveTo(x, y - r - 1); c.lineTo(x + r + 1, y + r); c.lineTo(x - r - 1, y + r); c.closePath(); }
    else { c.moveTo(x, y - r - 2); c.lineTo(x + r + 2, y); c.lineTo(x, y + r + 2); c.lineTo(x - r - 2, y); c.closePath(); }
    c.fillStyle = fill; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke();
  }
  function star(c, x, y, r, fill) {
    c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 3; c.strokeStyle = '#231a52'; c.stroke();
  }
  function legend(host) {
    var lg = el('ul', 'legend');
    K.GENRES.forEach(function (g) { var s = { circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond' }[g.shape]; lg.innerHTML += '<li><i style="background:' + g.color + '"></i>' + g.name + ' (' + s + ')</li>'; });
    host.appendChild(lg);
  }

  /* ---------- A: how KNN decides ---------- */
  function buildA(host) {
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, W, H, 'Songs plotted by tempo and brightness, coloured by genre. Click to place a mystery song and see its nearest neighbours.');
    cv.tabIndex = 0; cv.style.cursor = 'crosshair';
    var out = UI.readout(view); legend(view);
    var reg = document.createElement('canvas'); reg.width = W; reg.height = H;
    var my = { bpm: 100, br: 0.55, truth: null }, model, nb = [], ringT = 1, showReg = true, scale = true, k = 5, per = 20;

    ctl.appendChild(el('h3', 'demo-title', 'How a song gets its genre'));
    UI.note(ctl, 'Every dot is a song with a known genre. Click the picture to drop a mystery song. KNN finds the k closest songs and lets them vote. Use arrow keys after clicking the picture to nudge it.');
    var sK = UI.slider(ctl, { label: 'k (number of neighbours)', min: 1, max: 25, value: 5, onInput: function (v) { k = v; refresh(false); } });
    var sN = UI.slider(ctl, { label: 'Training songs per genre', min: 4, max: 35, value: 20, onInput: function (v) { per = v; refresh(true); } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var tReg = UI.toggle(row, 'Show decision regions', true, function (v) { showReg = v; });
    var tSc = UI.toggle(row, 'Scale the features', true, function (v) { scale = v; refresh(true); });
    var row2 = el('div', 'btnrow'); ctl.appendChild(row2);
    UI.button(row2, 'Pick a test song', 'btn-sun', function () {
      var id = K.test[Math.floor(Math.random() * K.test.length)]; my = { bpm: K.X[id][0], br: K.X[id][1], truth: K.Y[id] }; refresh(false);
    });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'k = 1 (jagged)', v: [1, 20, true] }, { t: 'k = 25 (smooth)', v: [25, 20, true] },
      { t: 'Scaling off', v: [5, 20, false] }, { t: 'Only 4 songs per genre', v: [3, 4, true] }
    ], function (it) {
      var v = it.v; k = v[0]; sK.set(v[0], true); per = v[1]; sN.set(v[1], true); scale = v[2]; tSc.setAttribute('aria-pressed', String(v[2])); refresh(true);
    });

    function refresh(rebuild) {
      if (rebuild || !model) { model = K.model(K.pool.slice(0, per * 4), 2, scale); paintRegions(); }
      nb = K.neighbours(model, K.scaled(model, [my.bpm, my.br])); ringT = UI.reduce ? 1 : 0; setOut();
    }
    function paintRegions() {
      var c = reg.getContext('2d'), GX = 56, GY = 42, cw = (W - L - R) / GX, chh = (H - B - T) / GY;
      c.clearRect(0, 0, W, H);
      for (var j = 0; j < GY; j++) for (var i = 0; i < GX; i++) {
        var bpm = BPM0 + (i + 0.5) / GX * (BPM1 - BPM0), br = 1 - (j + 0.5) / GY, z = K.scaled(model, [bpm, br]);
        c.fillStyle = K.GENRES[K.vote(model, K.neighbours(model, z), k).label].soft; c.fillRect(L + i * cw, T + j * chh, cw + 0.6, chh + 0.6);
      }
    }
    var lastK = -1;
    function setOut() {
      var v = K.vote(model, nb, k), parts = [];
      v.counts.forEach(function (n, g) { if (n) parts.push(K.GENRES[g].name + ' ' + n); });
      var m = 'k = ' + k + '. Votes: ' + parts.join(', ') + '. Prediction: ' + K.GENRES[v.label].name + '.';
      if (my.truth != null) m += ' This test song really is ' + K.GENRES[my.truth].name + ': ' + (my.truth === v.label ? 'correct.' : 'wrong.');
      if (!scale) m += ' Features are NOT scaled, so tempo (numbers around 100) swamps brightness (0 to 1).';
      out.textContent = m;
    }
    function draw() {
      if (k !== lastK) { lastK = k; if (model) paintRegions(); }
      var c = cv.getContext('2d'); c.clearRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      if (showReg) c.drawImage(reg, 0, 0);
      c.strokeStyle = '#231a52'; c.lineWidth = 2; c.strokeRect(L, T, W - L - R, H - B - T);
      c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif'; c.textAlign = 'center';
      [50, 100, 150, 200].forEach(function (b) { c.fillText(String(b), tx(b), H - B + 16); });
      c.fillText('Tempo (beats per minute)', (L + W - R) / 2, H - 6);
      c.textAlign = 'right'; [0, 0.5, 1].forEach(function (v) { c.fillText(String(v), L - 6, ty(v) + 4); });
      c.save(); c.translate(12, (T + H - B) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText('Brightness', 0, 0); c.restore();
      var e = ringT >= 1 ? 1 : ringT; e = 1 - (1 - e) * (1 - e);
      var mx = tx(my.bpm), myy = ty(my.br), r = nb[k - 1].d * e;
      var rx = r * model.sd[0] * (W - L - R) / (BPM1 - BPM0), ry = r * model.sd[1] * (H - B - T);
      c.save(); c.beginPath(); c.rect(L, T, W - L - R, H - B - T); c.clip();
      c.beginPath(); c.ellipse(mx, myy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, 6.2832); c.fillStyle = 'rgba(35,26,82,.08)'; c.fill(); c.setLineDash([6, 4]); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke(); c.setLineDash([]);
      c.restore();
      var vote = K.vote(model, nb, k);
      for (var q = 0; q < k && q < nb.length; q++) { var id = model.id[nb[q].i]; c.beginPath(); c.moveTo(mx, myy); c.lineTo(tx(K.X[id][0]), ty(K.X[id][1])); c.strokeStyle = 'rgba(35,26,82,.55)'; c.lineWidth = 1.5; c.stroke(); }
      model.id.forEach(function (id, i) { var G = K.GENRES[K.Y[id]]; shape(c, G.shape, tx(K.X[id][0]), ty(K.X[id][1]), 5.5, G.color); });
      for (q = 0; q < k && q < nb.length; q++) { id = model.id[nb[q].i]; c.beginPath(); c.arc(tx(K.X[id][0]), ty(K.X[id][1]), 11, 0, 6.2832); c.lineWidth = 3; c.strokeStyle = '#231a52'; c.stroke(); }
      star(c, mx, myy, 14, K.GENRES[vote.label].color);
    }
    function setMy(e) {
      var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * H / rc.height;
      my = { bpm: Math.max(BPM0, Math.min(BPM1, BPM0 + (x - L) / (W - L - R) * (BPM1 - BPM0))), br: Math.max(0, Math.min(1, (H - B - y) / (H - B - T))), truth: null };
      refresh(false);
    }
    cv.addEventListener('pointerdown', function (e) { cv.focus(); setMy(e); });
    cv.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, 0.03], ArrowDown: [0, -0.03] }[e.key]; if (!d) return; e.preventDefault();
      my = { bpm: Math.max(BPM0, Math.min(BPM1, my.bpm + d[0])), br: Math.max(0, Math.min(1, my.br + d[1])), truth: null }; refresh(false);
    });
    refresh(true);
    var loop = UI.loop(function (dt) { if (ringT < 1) ringT = Math.min(1, ringT + dt / 0.45); draw(); });
    draw();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); } };
  }

  /* ---------- B: overfitting ---------- */
  function buildB(host) {
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, 640, 320, 'Training accuracy and test accuracy of KNN for every k from 1 to 30');
    var out = UI.readout(view), verdict = el('p', 'verdict'); view.appendChild(verdict);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#6a3df0"></i>accuracy on the training songs</li><li><i style="background:#e8a100"></i>accuracy on 60 songs the model never saw</li>'; view.appendChild(lg);

    ctl.appendChild(el('h3', 'demo-title', 'Does it memorise or understand?'));
    UI.note(ctl, 'Training accuracy asks "can you repeat what you were shown?". Test accuracy asks "can you handle new songs?". The gap between them is the warning sign. Each song also carries extra noise features that tell nothing about genre.');
    var sK = UI.slider(ctl, { label: 'k (number of neighbours)', min: 1, max: 30, value: 1, onInput: function () { draw(); } });
    var sN = UI.slider(ctl, { label: 'Training songs', min: 20, max: 140, step: 4, value: 40, onInput: recompute });
    var sM = UI.slider(ctl, { label: 'Useless extra features', min: 0, max: 20, value: 8, onInput: recompute });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Overfit it', v: [1, 40, 8] }, { t: 'Fix 1: larger k', v: [15, 40, 8] },
      { t: 'Fix 2: remove useless features', v: [1, 40, 0] }, { t: 'Fix 3: more songs', v: [1, 140, 8] }, { t: 'All three fixes', v: [11, 140, 0] }
    ], function (it) { var v = it.v; sK.set(v[0], true); sN.set(v[1], true); sM.set(v[2], true); recompute(); });
    UI.note(ctl, 'Careful: picking the k with the best test score would be cheating, because the test songs would then help choose the model. Panel 3 shows the honest way.', 'fine');

    var tr = [], te = [], reveal = 1, KS = []; for (var i = 1; i <= 30; i++) KS.push(i);
    function recompute() {
      var mdl = K.model(K.pool.slice(0, sN.get()), 2 + sM.get(), true);
      tr = K.trainAccuracy(mdl, KS); te = K.accuracy(mdl, K.test, KS); reveal = UI.reduce ? 1 : 0; draw();
    }
    var W2 = 640, H2 = 320, l = 44, r = 14, t = 14, b = 34;
    function X(k) { return l + (k - 1) / 29 * (W2 - l - r); }
    function Y(v) { return H2 - b - v * (H2 - b - t); }
    function draw() {
      var c = cv.getContext('2d'); c.clearRect(0, 0, W2, H2); c.fillStyle = '#fff'; c.fillRect(0, 0, W2, H2);
      c.strokeStyle = 'rgba(35,26,82,.15)'; c.lineWidth = 1; [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { c.beginPath(); c.moveTo(l, Y(v)); c.lineTo(W2 - r, Y(v)); c.stroke(); });
      c.setLineDash([5, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 2; c.beginPath(); c.moveTo(l, Y(0.25)); c.lineTo(W2 - r, Y(0.25)); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif'; c.textAlign = 'right';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { c.fillText(Math.round(v * 100) + '%', l - 6, Y(v) + 4); });
      c.textAlign = 'left'; c.fillText('guessing = 25%', l + 6, Y(0.25) - 6);
      c.textAlign = 'center'; [1, 5, 10, 15, 20, 25, 30].forEach(function (k) { c.fillText(String(k), X(k), H2 - b + 16); }); c.fillText('k (number of neighbours)', (l + W2 - r) / 2, H2 - 6);
      var upto = Math.max(1, Math.round(reveal * 30));
      c.beginPath(); for (var k = 1; k <= upto; k++) c.lineTo(X(k), Y(tr[k - 1])); for (k = upto; k >= 1; k--) c.lineTo(X(k), Y(te[k - 1])); c.closePath(); c.fillStyle = 'rgba(232,54,93,.15)'; c.fill();
      function line(a, col) { c.beginPath(); for (var k2 = 1; k2 <= upto; k2++) { if (k2 === 1) c.moveTo(X(k2), Y(a[k2 - 1])); else c.lineTo(X(k2), Y(a[k2 - 1])); } c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
      line(tr, '#6a3df0'); line(te, '#e8a100');
      var kk = sK.get(); c.setLineDash([4, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(kk), t); c.lineTo(X(kk), H2 - b); c.stroke(); c.setLineDash([]);
      [[tr, '#6a3df0'], [te, '#e8a100']].forEach(function (p) { c.beginPath(); c.arc(X(kk), Y(p[0][kk - 1]), 7, 0, 6.2832); c.fillStyle = p[1]; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke(); });
      var a = tr[kk - 1], bb = te[kk - 1], gap = a - bb, n = sN.get();
      out.textContent = 'k = ' + kk + ' with ' + n + ' training songs and ' + sM.get() + ' useless features. Training accuracy ' + Math.round(a * 100) + '%. Test accuracy ' + Math.round(bb * 100) + '%. Gap ' + Math.round(gap * 100) + ' points.';
      if (kk * 2 > n) { verdict.className = 'verdict'; verdict.textContent = 'k is now a large share of all the training songs. The vote is almost the whole collection, so the model can no longer see local structure. That is underfitting: both numbers are low.'; }
      else if (gap >= 0.15) { verdict.className = 'verdict warn'; verdict.textContent = 'Overfitting. The model does far better on songs it has seen than on new ones. With k = 1 each training song is its own nearest neighbour, so training accuracy is meaningless.'; }
      else if (bb >= 0.7) { verdict.className = 'verdict good'; verdict.textContent = 'A healthy fit. Training and test accuracy are close, and the test accuracy is decent.'; }
      else { verdict.className = 'verdict'; verdict.textContent = 'The gap is small but accuracy is low. Look for what is hurting: useless features or too little data.'; }
    }
    recompute();
    var loop = UI.loop(function (dt) { if (reveal < 1) { reveal = Math.min(1, reveal + dt / 0.6); draw(); } });
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); } };
  }

  K.buildA = buildA; K.buildB = buildB;
})();
