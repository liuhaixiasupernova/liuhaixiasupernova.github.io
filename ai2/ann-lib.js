/* A small neural network (one hidden layer, tanh, softmax, Adam) trained epoch by epoch on the same music songs as KNN.
   Used by world 1-3 for overfitting and for cross-validation. No dependencies except knn-lib.js. */
(function () {
  'use strict';
  var K = window.KNN, X = K.X, Y = K.Y;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* o: { train:[song ids], val:[song ids], D, H, epochs, lr, wd, seed, every:true|false, at:[epochs to record accuracy at] }
     returns { trL, vaL, trA, vaA } arrays with index e = after e epochs (index 0 = before training) when o.every is true,
     or { at:{epoch:validationAccuracy} } when only checkpoints are wanted. wd = weight decay (L2 strength). */
  K.trainNet = function (o) {
    var D = o.D, H = o.H, C = 4, E = o.epochs, lr = o.lr || 0.02, wd = o.wd || 0, rnd = mulberry(o.seed * 104729 + 17);
    var n = o.train.length, m = o.val.length, i, j, k, e;
    /* scale with training statistics */
    var mu = new Float64Array(D), sd = new Float64Array(D);
    for (j = 0; j < D; j++) { var s = 0; for (i = 0; i < n; i++) s += X[o.train[i]][j]; s /= n; var v = 0; for (i = 0; i < n; i++) { var d = X[o.train[i]][j] - s; v += d * d; } mu[j] = s; sd[j] = Math.sqrt(v / n) || 1; }
    function prep(ids) { var Z = new Float64Array(ids.length * D), y = new Int8Array(ids.length); ids.forEach(function (id, r) { for (var q = 0; q < D; q++) Z[r * D + q] = (X[id][q] - mu[q]) / sd[q]; y[r] = Y[id]; }); return { Z: Z, y: y, n: ids.length }; }
    var T = prep(o.train), V = prep(o.val);
    var W1 = new Float64Array(D * H), b1 = new Float64Array(H), W2 = new Float64Array(H * C), b2 = new Float64Array(C);
    var s1 = Math.sqrt(1 / D), s2 = Math.sqrt(1 / H);
    for (i = 0; i < W1.length; i++) W1[i] = gauss(rnd) * s1; for (i = 0; i < W2.length; i++) W2[i] = gauss(rnd) * s2;
    var P = [W1, b1, W2, b2], M = P.map(function (a) { return new Float64Array(a.length); }), Vv = P.map(function (a) { return new Float64Array(a.length); }), G = P.map(function (a) { return new Float64Array(a.length); });
    var hid = new Float64Array(H), out = new Float64Array(C), dh = new Float64Array(H);
    function evalSet(S, grad) {
      var loss = 0, hit = 0;
      if (grad) G.forEach(function (g) { g.fill(0); });
      for (var r = 0; r < S.n; r++) {
        var zo = r * D, q, c;
        for (q = 0; q < H; q++) { var a = b1[q]; for (c = 0; c < D; c++) a += S.Z[zo + c] * W1[c * H + q]; hid[q] = Math.tanh(a); }
        var mx = -1e9, best = 0; for (c = 0; c < C; c++) { var z = b2[c]; for (q = 0; q < H; q++) z += hid[q] * W2[q * C + c]; out[c] = z; if (z > mx) { mx = z; best = c; } }
        var sum = 0; for (c = 0; c < C; c++) { out[c] = Math.exp(out[c] - mx); sum += out[c]; }
        for (c = 0; c < C; c++) out[c] /= sum;
        loss -= Math.log(Math.max(out[S.y[r]], 1e-12)); if (best === S.y[r]) hit++;
        if (grad) {
          for (c = 0; c < C; c++) out[c] -= (c === S.y[r] ? 1 : 0);
          for (q = 0; q < H; q++) { var dd = 0; for (c = 0; c < C; c++) { G[2][q * C + c] += hid[q] * out[c]; dd += out[c] * W2[q * C + c]; } dh[q] = dd * (1 - hid[q] * hid[q]); }
          for (c = 0; c < C; c++) G[3][c] += out[c];
          for (q = 0; q < H; q++) { G[1][q] += dh[q]; for (c = 0; c < D; c++) G[0][c * H + q] += S.Z[zo + c] * dh[q]; }
        }
      }
      return { loss: loss / S.n, acc: hit / S.n };
    }
    var res = { trL: [], vaL: [], trA: [], vaA: [], at: {} }, want = {}; (o.at || []).forEach(function (a) { want[a] = true; });
    function record(ep) {
      if (o.every) { var a = evalSet(T, false), b = evalSet(V, false); res.trL.push(a.loss); res.trA.push(a.acc); res.vaL.push(b.loss); res.vaA.push(b.acc); }
      else if (want[ep]) res.at[ep] = evalSet(V, false).acc;
    }
    record(0);
    var b1c = 0.9, b2c = 0.999;
    for (e = 1; e <= E; e++) {
      evalSet(T, true);
      for (var p = 0; p < 4; p++) {
        var g = G[p], w = P[p], mm = M[p], vv = Vv[p], isW = (p === 0 || p === 2);
        var c1 = 1 - Math.pow(b1c, e), c2 = 1 - Math.pow(b2c, e);
        for (i = 0; i < w.length; i++) {
          var gi = g[i] / n + (isW ? wd * w[i] : 0);
          mm[i] = b1c * mm[i] + (1 - b1c) * gi; vv[i] = b2c * vv[i] + (1 - b2c) * gi * gi;
          w[i] -= lr * (mm[i] / c1) / (Math.sqrt(vv[i] / c2) + 1e-8);
        }
      }
      record(e);
    }
    return res;
  };
})();
