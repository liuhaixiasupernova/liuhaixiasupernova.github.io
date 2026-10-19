/* KNN maths for world 1-3: a made-up music collection, k-nearest-neighbours, cross-validation and t-tests. No dependencies. */
(function () {
  'use strict';
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  var K = window.KNN = {};
  /* four genres, two informative features (tempo in BPM, brightness 0..1) */
  K.GENRES = [
    { name: 'Classical', color: '#2e9e5b', soft: '#cdeed9', shape: 'circle', mean: [75, 0.25], sd: [18, 0.12] },
    { name: 'Jazz', color: '#e8a100', soft: '#ffe7a8', shape: 'square', mean: [105, 0.45], sd: [18, 0.12] },
    { name: 'Hip-hop', color: '#e8365d', soft: '#ffc9d5', shape: 'triangle', mean: [95, 0.70], sd: [18, 0.12] },
    { name: 'Metal', color: '#6a3df0', soft: '#d9ccff', shape: 'diamond', mean: [150, 0.85], sd: [18, 0.12] }
  ];
  var PER = 50, NOISE = 20, N = PER * 4;
  K.N = N; K.NOISE = NOISE;

  /* the song bank: row i has features [tempo, brightness, noise1..noise20] and a genre label */
  var rnd0 = mulberry(2026), X = [], Y = [];
  for (var g = 0; g < 4; g++) {
    for (var s = 0; s < PER; s++) {
      var G = K.GENRES[g], f = new Float64Array(2 + NOISE);
      f[0] = Math.max(40, Math.min(200, G.mean[0] + G.sd[0] * gauss(rnd0)));
      f[1] = Math.max(0.02, Math.min(0.98, G.mean[1] + G.sd[1] * gauss(rnd0)));
      for (var q = 0; q < NOISE; q++) f[2 + q] = gauss(rnd0);
      X.push(f); Y.push(g);
    }
  }
  K.X = X; K.Y = Y;

  /* fixed hold-out for the first two panels: 15 test songs per genre, 35 training songs per genre dealt round-robin */
  var rs = mulberry(99), byG = [[], [], [], []];
  for (var i = 0; i < N; i++) byG[Y[i]].push(i);
  byG = byG.map(function (a) { return shuffle(a, rs); });
  K.test = []; byG.forEach(function (a) { K.test = K.test.concat(a.slice(0, 15)); });
  K.pool = []; for (var r = 0; r < 35; r++) for (var g2 = 0; g2 < 4; g2++) K.pool.push(byG[g2][15 + r]);

  /* model = scaled copy of the chosen training rows. D = number of features used, scale = z-score or not */
  K.model = function (idx, D, scale) {
    var mu = new Float64Array(D), sd = new Float64Array(D), n = idx.length, j, t;
    for (j = 0; j < D; j++) mu[j] = 0, sd[j] = 1;
    if (scale) {
      for (j = 0; j < D; j++) { var m = 0; for (t = 0; t < n; t++) m += X[idx[t]][j]; m /= n; var v = 0; for (t = 0; t < n; t++) { var d = X[idx[t]][j] - m; v += d * d; } mu[j] = m; sd[j] = Math.sqrt(v / n) || 1; }
    }
    var Z = idx.map(function (id) { var z = new Float64Array(D); for (var k = 0; k < D; k++) z[k] = (X[id][k] - mu[k]) / sd[k]; return z; });
    return { Z: Z, y: idx.map(function (id) { return Y[id]; }), id: idx, mu: mu, sd: sd, D: D };
  };
  K.scaled = function (model, f) { var z = new Float64Array(model.D); for (var k = 0; k < model.D; k++) z[k] = (f[k] - model.mu[k]) / model.sd[k]; return z; };
  /* neighbours of a (scaled) point, nearest first */
  K.neighbours = function (model, z, skipSelf) {
    var out = [], D = model.D;
    for (var i = 0; i < model.Z.length; i++) {
      var d = 0, a = model.Z[i];
      for (var k = 0; k < D; k++) { var e = a[k] - z[k]; d += e * e; }
      out.push({ i: i, d: Math.sqrt(d) });
    }
    out.sort(function (p, q) { return p.d - q.d; });
    return out;
  };
  K.vote = function (model, nb, k) {
    var c = [0, 0, 0, 0], first = [99, 99, 99, 99];
    for (var t = 0; t < k && t < nb.length; t++) { var y = model.y[nb[t].i]; c[y]++; if (first[y] === 99) first[y] = t; }
    var best = 0; for (var g = 1; g < 4; g++) if (c[g] > c[best] || (c[g] === c[best] && first[g] < first[best])) best = g;
    return { label: best, counts: c };
  };
  /* accuracy at several k at once: rows to classify, a model, D features, list of k */
  K.accuracy = function (model, rows, ks) {
    var hit = ks.map(function () { return 0; });
    rows.forEach(function (id) {
      var nb = K.neighbours(model, K.scaled(model, X[id]));
      ks.forEach(function (k, j) { if (K.vote(model, nb, k).label === Y[id]) hit[j]++; });
    });
    return hit.map(function (h) { return h / rows.length; });
  };
  /* training accuracy: each training song is allowed to be its own neighbour, as in a naive evaluation */
  K.trainAccuracy = function (model, ks) { return K.accuracy(model, model.id, ks); };

  /* ten stratified folds for a seed: 20 songs per fold, 5 per genre */
  K.folds = function (seed) {
    var rnd = mulberry(seed * 7919 + 3), folds = []; for (var f = 0; f < 10; f++) folds.push([]);
    for (var g = 0; g < 4; g++) { var ids = []; for (var i = 0; i < N; i++) if (Y[i] === g) ids.push(i); shuffle(ids, rnd).forEach(function (id, j) { folds[j % 10].push(id); }); }
    return folds;
  };
  K.foldAccuracy = function (fold, D, ks) {
    var inFold = {}; fold.forEach(function (id) { inFold[id] = true; });
    var train = []; for (var i = 0; i < N; i++) if (!inFold[i]) train.push(i);
    return K.accuracy(K.model(train, D, true), fold, ks);
  };

  /* statistics */
  function lgamma(z) { var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], y = z, t = z + 5.5; t -= (z + 0.5) * Math.log(t); var s = 1.000000000190015; for (var j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / z); }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, h, aa, del;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; h = d;
    for (var m = 1; m <= 300; m++) {
      var m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  K.pTwoSided = function (t, df) { return ibeta(df / (df + t * t), df / 2, 0.5); };
  K.mean = function (a) { var s = 0; a.forEach(function (v) { s += v; }); return s / a.length; };
  K.sd = function (a) { var m = K.mean(a), s = 0; a.forEach(function (v) { s += (v - m) * (v - m); }); return Math.sqrt(s / (a.length - 1)); };
  /* paired t-test on differences d */
  K.pairedT = function (d) {
    var n = d.length, m = K.mean(d), s = K.sd(d);
    if (!(s > 0)) return { t: m === 0 ? 0 : Infinity, df: n - 1, p: m === 0 ? 1 : 0, mean: m };
    var t = m / (s / Math.sqrt(n)); return { t: t, df: n - 1, p: K.pTwoSided(t, n - 1), mean: m };
  };
  /* corrected resampled t-test (Nadeau and Bengio, 2003) for J differences from repeated k-fold CV: ratio = test/train size */
  K.correctedT = function (d, ratio) {
    var J = d.length, m = K.mean(d), s = K.sd(d);
    if (!(s > 0)) return { t: m === 0 ? 0 : Infinity, df: J - 1, p: m === 0 ? 1 : 0, mean: m };
    var t = m / Math.sqrt((1 / J + ratio) * s * s); return { t: t, df: J - 1, p: K.pTwoSided(t, J - 1), mean: m };
  };
})();
