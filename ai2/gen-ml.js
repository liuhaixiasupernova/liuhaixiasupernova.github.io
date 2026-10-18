/* Practice Lab generators: parameter sweeping, fitting curves, CNNs, MLPs, learning types, KNN and evaluation. */
(function () {
  'use strict';
  var PR = window.PRACTICE, f2 = PR.fmt;
  function grid(m, hl) {
    return '<table class="pq-grid">' + m.map(function (row, i) { return '<tr>' + row.map(function (v, j) { return '<td' + (hl && hl[i + ',' + j] ? ' class="hl"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  function pre(v) { return +(+v).toPrecision(3); }

  /* ---------- fitting curves ---------- */
  PR.family({
    id: 'fit', label: 'Training and overfitting', world: 'World 1-3 Predict', tip: 'World 1-3 Predict, panel 2 (Overfitting): compare training and test accuracy as you change k and the number of useless features.',
    blurb: 'Read training and validation curves and fix the problem.',
    forms: [{ id: 'curves', marks: 10, gen: function (r) {
      var kind = r.pick(['over', 'over', 'under', 'good']), E = 60, tr = [], va = [], i, E0 = r.int(14, 28);
      for (i = 0; i < E; i++) {
        var e = i;
        if (kind === 'over') { tr.push(0.05 + 0.85 * Math.exp(-e / 12) + 0.01 * r.gauss()); va.push(0.28 + 0.6 * Math.exp(-e / 9) + (e > E0 ? Math.pow(e - E0, 1.25) * 0.012 : 0) + 0.012 * r.gauss()); }
        else if (kind === 'under') { tr.push(0.62 - 0.1 * (1 - Math.exp(-e / 15)) + 0.01 * r.gauss()); va.push(0.64 - 0.1 * (1 - Math.exp(-e / 15)) + 0.012 * r.gauss()); }
        else { tr.push(0.1 + 0.8 * Math.exp(-e / 10) + 0.008 * r.gauss()); va.push(0.14 + 0.8 * Math.exp(-e / 10) + 0.012 * r.gauss()); }
      }
      var best = 0; var sm = []; for (i = 0; i < E; i++) { var a = 0, c = 0; for (var k = Math.max(0, i - 2); k <= Math.min(E - 1, i + 2); k++) { a += va[k]; c++; } sm.push(a / c); }
      for (i = 1; i < E; i++) if (sm[i] < sm[best]) best = i;
      var diag = { over: 'Overfitting: the model keeps fitting the training data but gets worse on unseen data', under: 'Underfitting: the model is too simple or too little trained to capture the pattern, so both errors stay high', good: 'A good fit: both errors fall and stay close together' };
      var dopts = Object.keys(diag).map(function (k) { return { s: diag[k], c: k === kind }; });
      dopts.push({ s: 'Data leakage: test data was used for training', c: false });
      var fix = {
        over: { good: ['Stop training early, near the lowest validation error', 'Collect more training data', 'Use regularisation (for example weight decay or dropout)', 'Use a smaller model'], bad: ['Train for many more epochs', 'Make the model much bigger', 'Drop the validation set so that you cannot see the problem'] },
        under: { good: ['Use a more flexible model (more layers or units)', 'Train for more epochs', 'Add informative features'], bad: ['Add strong regularisation', 'Stop training earlier', 'Remove most of the features'] },
        good: { good: ['Keep this setup and evaluate once on a separate, untouched test set', 'Report the validation or test error, not the training error', 'Repeat with several random seeds to check it is stable'], bad: ['Report the training error as the final result', 'Tune further using the test set', 'Train for twice as long without checking'] }
      }[kind];
      var all = fix.good.concat(fix.bad), parts = [{ kind: 'mcq', weight: 0.3, ask: 'What best describes this training run?', opts: dopts.map(function (x) { return x.s; }), a: dopts.findIndex(function (x) { return x.c; }) }];
      if (kind === 'over') parts.push({ kind: 'num', weight: 0.3, ask: 'At about which epoch is the validation error lowest? (within 6 epochs)', fields: [{ label: 'Epoch', ans: best, tol: 6, dp: 0 }] });
      else parts.push({ kind: 'num', weight: 0.3, ask: 'Roughly how large is the gap between validation and training error at the last epoch? (within 0.06)', fields: [{ label: 'Gap', ans: va[E - 1] - tr[E - 1], tol: 0.06, dp: 2 }] });
      parts.push({ kind: 'multi', weight: 0.4, ask: kind === 'good' ? 'Which actions are sound next?' : 'Which changes are likely to help?', opts: all, a: [0, 1, 2].concat(kind === 'over' ? [3] : []).filter(function (x) { return x < fix.good.length; }) });
      return {
        html: 'A model is trained for 60 epochs. The graph shows its error on the training set and on a separate validation set after every epoch (lower is better).',
        fig: function (h) { PR.plot(h, { series: [{ name: 'training error', data: tr, color: '#e8365d' }, { name: 'validation error', data: va, color: '#2563eb' }], xmax: 60, ymin: 0, ymax: 1, ystep: 0.2, xlabel: 'epoch', ylabel: 'error', alt: 'Training and validation error against epoch' }); },
        parts: parts,
        reason: ['Compare the two curves: is validation error rising while training error falls (a growing gap), or are both high?', 'Link the pattern to model capacity, training length or data size.', 'Say why the proposed fix addresses it.'],
        explain: [diag[kind] + '.', kind === 'over' ? 'Training error keeps falling, but validation error turns upward after about epoch ' + best + '. The growing gap means the model is memorising the training set. Early stopping, more data, regularisation and smaller models all limit this.' : kind === 'under' ? 'Both errors stay high and close together, so the model has not captured the pattern. More capacity, more training or better features help. Regularising harder would make it worse.' : 'Both errors fall together and stay close, so the model generalises. The remaining work is honest evaluation: a separate test set, and several seeds.'],
        data: { kind: kind, best: best }
      };
    } }]
  });

  /* ---------- convolutional networks ---------- */
  var FILTERS = [
    { n: 'a vertical edge (dark to light, left to right)', m: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
    { n: 'a horizontal edge (dark above, light below)', m: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] },
    { n: 'a bright centre pixel', m: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
    { n: 'a diagonal line from top-left to bottom-right', m: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }
  ];
  function conv(img, f, s, p) {
    var n = img.length + 2 * p, pad = [], i, j, a, b; for (i = 0; i < n; i++) { pad.push([]); for (j = 0; j < n; j++) { var ii = i - p, jj = j - p; pad[i].push(ii >= 0 && jj >= 0 && ii < img.length && jj < img.length ? img[ii][jj] : 0); } }
    var o = Math.floor((n - 3) / s) + 1, out = []; for (i = 0; i < o; i++) { out.push([]); for (j = 0; j < o; j++) { var t = 0; for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) t += pad[i * s + a][j * s + b] * f[a][b]; out[i].push(t); } }
    return out;
  }
  PR.conv = conv;
  PR.family({
    id: 'cnn', label: 'Convolutional networks', world: 'a concept to revise in your lecture notes', tip: 'Slide a 3 x 3 window across the image, multiply, add, and write each total in the output.',
    blurb: 'Convolve a small image by hand, then size a layer.',
    forms: [
      { id: 'conv', marks: 10, gen: function (r) {
        var n = 5, img = [], i, j, F = r.pick(FILTERS), mode = r.pick(['s1', 's1', 's2']), relu = r.chance(0.4);
        var col = r.int(1, 3); for (i = 0; i < n; i++) { img.push([]); for (j = 0; j < n; j++) img[i].push(j === col ? 1 : (r.chance(0.25) ? 1 : 0)); }
        var s = mode === 's2' ? 2 : 1, out = conv(img, F.m, s, 0); if (relu) out = out.map(function (row) { return row.map(function (v) { return Math.max(0, v); }); });
        var o = out.length, fields = []; out.forEach(function (row, a) { row.forEach(function (v, b) { fields.push({ label: 'row ' + (a + 1) + ', col ' + (b + 1), ans: v, tol: 0.001, dp: 0 }); }); });
        var flat = []; out.forEach(function (row, a) { row.forEach(function (v, b) { flat.push({ v: v, a: a, b: b }); }); }); flat.sort(function (x, y) { return y.v - x.v; });
        return {
          html: 'The 5 x 5 image (left) and the 3 x 3 filter (right) are shown. Apply the filter with <b>stride ' + s + '</b> and <b>no padding</b>' + (relu ? ', then apply the ReLU function (negative values become 0)' : '') + '. Use the usual convolution of a CNN: multiply matching entries and add them (do not flip the filter).' +
            '<div class="pq-two"><div>' + grid(img) + '<p class="fine">Image</p></div><div>' + grid(F.m) + '<p class="fine">Filter</p></div></div>',
          parts: [
            { kind: 'num', weight: 0.6, ask: 'Fill in the ' + o + ' x ' + o + ' feature map.', cols: o, fields: fields },
            { kind: 'num', weight: 0.15, ask: 'What is the size of the output when the image side is 7, the filter side is 3, padding is 1 and stride is 2? (one side)', fields: [{ label: 'Side', ans: Math.floor((7 + 2 - 3) / 2) + 1, tol: 0.001, dp: 0 }] },
            { kind: 'mcq', weight: 0.25, ask: 'What is this filter looking for?', opts: FILTERS.map(function (x) { return x.n; }), a: FILTERS.indexOf(F) }
          ],
          reason: ['Place the filter over a window, multiply entry by entry, and add.', 'Stride ' + s + ' means the window moves ' + s + ' pixel(s) each step; no padding means the window never leaves the image.'],
          explain: ['Output side = (image side - filter side + 2 x padding) / stride + 1 = (5 - 3 + 0) / ' + s + ' + 1 = ' + o + '.', 'Each output value is the sum of 9 products. For example, the top-left output uses the top-left 3 x 3 window: ' + out[0][0] + (relu ? ' after ReLU' : '') + '.', 'For the last part: (7 - 3 + 2) / 2 + 1 = 4.'],
          data: { img: img, f: F.m, s: s, out: out, relu: relu }
        };
      } },
      { id: 'size', marks: 5, gen: function (r) {
        var W = r.pick([28, 32, 64]), Fk = r.pick([3, 5]), K = r.pick([4, 6, 8, 16]), C = r.pick([1, 3]), P = r.pick([0, 1]), S = 1;
        if (Fk === 3 && P === 0) P = 1;
        var o = Math.floor((W - Fk + 2 * P) / S) + 1, params = K * (Fk * Fk * C + 1), pooled = Math.floor(o / 2);
        return {
          html: 'A convolutional layer takes a ' + W + ' x ' + W + ' x ' + C + ' image, uses <b>' + K + ' filters</b> of size ' + Fk + ' x ' + Fk + ' (each spanning all ' + C + ' input channel' + (C > 1 ? 's' : '') + '), with stride ' + S + ' and padding ' + P + '. Each filter has one bias. A 2 x 2 max-pooling layer with stride 2 follows.',
          parts: [
            { kind: 'num', weight: 0.35, ask: 'Side length of each feature map after the convolution.', fields: [{ label: 'Side', ans: o, tol: 0.001, dp: 0 }] },
            { kind: 'num', weight: 0.35, ask: 'Number of learnable parameters in the convolutional layer (weights and biases).', fields: [{ label: 'Parameters', ans: params, tol: 0.001, dp: 0 }] },
            { kind: 'num', weight: 0.3, ask: 'Side length after the pooling layer.', fields: [{ label: 'Side', ans: pooled, tol: 0.001, dp: 0 }] }
          ],
          reason: ['Output side = (W - F + 2P) / S + 1.', 'Each filter has F x F x channels weights plus one bias.'],
          explain: ['Side = (' + W + ' - ' + Fk + ' + 2 x ' + P + ') / ' + S + ' + 1 = ' + o + '.', 'Each filter: ' + Fk + ' x ' + Fk + ' x ' + C + ' = ' + (Fk * Fk * C) + ' weights, plus 1 bias = ' + (Fk * Fk * C + 1) + '. With ' + K + ' filters: ' + params + '.', 'Pooling 2 x 2 with stride 2 halves the side: ' + o + ' / 2 = ' + pooled + (o % 2 ? ' (rounded down)' : '') + '.'],
          data: { o: o, params: params, pooled: pooled }
        };
      } }
    ]
  });

  /* ---------- a forward pass through a small network ---------- */
  PR.family({
    id: 'mlp', label: 'Multilayer perceptrons', world: 'a concept to revise in your lecture notes', tip: 'Work layer by layer: weighted sum, add the bias, apply the activation.',
    blurb: 'Push numbers through a tiny network by hand.',
    forms: [{ id: 'forward', marks: 5, gen: function (r) {
      var x = [r.int(-2, 3), r.int(-2, 3)], W1 = [[r.int(-2, 2), r.int(-2, 2)], [r.int(-2, 2), r.int(-2, 2)]], b1 = [r.int(-1, 1), r.int(-1, 1)], W2 = [r.int(-2, 2), r.int(-2, 2)], b2 = r.int(-1, 1), sig = r.chance(0.5);
      var h = [0, 1].map(function (i) { return Math.max(0, W1[i][0] * x[0] + W1[i][1] * x[1] + b1[i]); }), z = W2[0] * h[0] + W2[1] * h[1] + b2, y = sig ? 1 / (1 + Math.exp(-z)) : z;
      return {
        html: 'A multilayer perceptron has 2 inputs, 2 hidden neurons with <b>ReLU</b> activation, and 1 output neuron with ' + (sig ? 'a <b>sigmoid</b> activation (1 / (1 + e^-z))' : 'a <b>linear</b> activation (no change)') + '. Input: x1 = ' + x[0] + ', x2 = ' + x[1] + '.' +
          '<table class="tbl"><thead><tr><th>Neuron</th><th>weight from x1 (or h1)</th><th>weight from x2 (or h2)</th><th>bias</th></tr></thead><tbody>' +
          '<tr><td class="n">h1</td><td class="n">' + W1[0][0] + '</td><td class="n">' + W1[0][1] + '</td><td class="n">' + b1[0] + '</td></tr>' +
          '<tr><td class="n">h2</td><td class="n">' + W1[1][0] + '</td><td class="n">' + W1[1][1] + '</td><td class="n">' + b1[1] + '</td></tr>' +
          '<tr><td class="n">output</td><td class="n">' + W2[0] + '</td><td class="n">' + W2[1] + '</td><td class="n">' + b2 + '</td></tr></tbody></table>',
        parts: [
          { kind: 'num', weight: 0.7, ask: 'Calculate the forward pass.', cols: 3, fields: [{ label: 'h1', ans: h[0], tol: 0.011 }, { label: 'h2', ans: h[1], tol: 0.011 }, { label: 'output', ans: y, tol: 0.011 }] },
          { kind: 'mcq', weight: 0.3, ask: 'Why do networks use non-linear activation functions such as ReLU?', opts: ['Without them, stacked layers collapse into a single linear model', 'To make the weights smaller', 'To count the number of neurons', 'To avoid needing training data'], a: 0 }
        ],
        reason: ['Each neuron computes a weighted sum of its inputs plus a bias, then applies its activation.', 'Layers are evaluated in order, from inputs to output.'],
        explain: ['h1 = ReLU(' + W1[0][0] + ' x ' + x[0] + ' + ' + W1[0][1] + ' x ' + x[1] + ' + ' + b1[0] + ') = ' + h[0] + '. h2 = ReLU(' + W1[1][0] + ' x ' + x[0] + ' + ' + W1[1][1] + ' x ' + x[1] + ' + ' + b1[1] + ') = ' + h[1] + '.', 'Output: z = ' + W2[0] + ' x ' + h[0] + ' + ' + W2[1] + ' x ' + h[1] + ' + ' + b2 + ' = ' + z + (sig ? ', so sigmoid(z) = ' + f2(y, 3) + '.' : '.')],
        data: { x: x, W1: W1, b1: b1, W2: W2, b2: b2, sig: sig, y: y, h: h }
      };
    } }]
  });

  /* ---------- three kinds of learning ---------- */
  var SC = [
    ['A spam filter learns from 50,000 emails that people have marked "spam" or "not spam".', 0], ['A model predicts house prices from past sales that include the sale price.', 0], ['A system reads scans that doctors have already labelled and learns to flag tumours.', 0],
    ['A shop groups its customers by buying habits, with no labels given.', 1], ['A streaming service finds clusters of similar songs without any genre tags.', 1], ['A tool compresses sensor readings into two summary numbers that keep as much structure as possible.', 1],
    ['A robot learns to walk by trying moves and receiving a score for how far it travelled.', 2], ['A program learns to play a board game by playing itself and being told only whether it won.', 2], ['A thermostat controller improves by trying settings and being rewarded for comfort and low energy use.', 2]
  ];
  PR.family({
    id: 'types', label: 'Types of learning', world: 'World 1-3 Predict (supervised learning with labels)', tip: 'Ask: are there correct answers given (supervised), no answers at all (unsupervised), or only a reward after acting (reinforcement)?',
    blurb: 'Sort scenarios into supervised, unsupervised and reinforcement learning.',
    forms: [{ id: 'sort', marks: 5, gen: function (r) {
      var items = r.sample(SC.filter(function (x) { return x[1] === 0; }), 2).concat(r.sample(SC.filter(function (x) { return x[1] === 1; }), 2), r.sample(SC.filter(function (x) { return x[1] === 2; }), 2));
      items = r.shuffle(items).map(function (x) { return { t: x[0], c: x[1] }; });
      return {
        html: 'Each scenario below is an example of one family of machine learning. Decide which.',
        parts: [{ kind: 'match', cats: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning'], items: items }],
        reason: ['Supervised: learns from examples with the right answers (labels).', 'Unsupervised: finds structure in data without labels.', 'Reinforcement: learns by acting and receiving rewards.'],
        explain: ['Supervised learning has labelled examples to learn from. Unsupervised learning has data but no answers, so it looks for structure. Reinforcement learning has no answers either, only a reward signal that arrives after the system acts.']
      };
    } }]
  });

  /* ---------- KNN by hand and honest comparison ---------- */
  PR.family({
    id: 'evalq', label: 'KNN and honest evaluation', world: 'World 1-3 Predict', tip: 'World 1-3 Predict, panel 3: run 1-NN against 9-NN and compare the two p-values.',
    blurb: 'Work a tiny KNN by hand and judge a comparison of two models.',
    forms: [
      { id: 'knn-hand', marks: 5, gen: function (r) {
        var pts = [], used = {}, cls = ['A', 'B'], i;
        while (pts.length < 6) { var x = r.int(0, 8), y = r.int(0, 8), key = x + ',' + y; if (used[key]) continue; used[key] = 1; pts.push({ x: x, y: y, c: cls[pts.length % 2] }); }
        var q = { x: r.int(2, 6), y: r.int(2, 6) }; if (used[q.x + ',' + q.y]) q.x += 1;
        var ds = pts.map(function (p, k) { return { k: k, d: Math.hypot(p.x - q.x, p.y - q.y), c: p.c }; }).sort(function (a, b) { return a.d - b.d; });
        var tie = Math.abs(ds[2].d - ds[3].d) < 1e-9; if (tie) { pts[ds[3].k].x += 1; ds = pts.map(function (p, k) { return { k: k, d: Math.hypot(p.x - q.x, p.y - q.y), c: p.c }; }).sort(function (a, b) { return a.d - b.d; }); }
        var v3 = ds.slice(0, 3).filter(function (d) { return d.c === 'A'; }).length >= 2 ? 'A' : 'B';
        var rows = pts.map(function (p, k) { return [k + 1, p.x, p.y, p.c]; });
        return {
          html: 'Six labelled songs are described by two features. A new song has x = ' + q.x + ', y = ' + q.y + '. Use straight-line (Euclidean) distance.' + '<table class="tbl"><thead><tr><th>Song</th><th>x</th><th>y</th><th>Genre</th></tr></thead><tbody>' + rows.map(function (rw) { return '<tr>' + rw.map(function (c) { return '<td class="n">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>',
          parts: [
            { kind: 'num', weight: 0.4, ask: 'What is the distance from the new song to its nearest neighbour? (2 decimal places)', fields: [{ label: 'Distance', ans: ds[0].d, tol: 0.011 }] },
            { kind: 'mcq', weight: 0.3, ask: 'What does 3-NN predict for the new song?', opts: ['Genre A', 'Genre B', 'A tie, so no prediction', 'It cannot be decided without training'], a: v3 === 'A' ? 0 : 1 },
            { kind: 'mcq', weight: 0.3, ask: 'The x feature is measured in beats per minute (60 to 200), and y in a 0 to 1 scale. What problem could this cause?', opts: ['The large-scale feature would dominate the distances, so the features should be scaled first', 'Nothing, because distance ignores units', 'The model would be too fast', 'KNN would stop working'], a: 0 }
          ],
          reason: ['Compute each distance with the square root of the squared differences.', 'Take the k closest and let them vote.'],
          explain: ['The nearest song is number ' + (ds[0].k + 1) + ' at distance ' + f2(ds[0].d, 2) + '. For 3-NN the three closest songs are ' + ds.slice(0, 3).map(function (d) { return (d.k + 1) + ' (' + d.c + ')'; }).join(', ') + ', so the vote is ' + v3 + '.', 'KNN is built on distances, so a feature with a big numeric range dominates. Scaling puts them on an equal footing.'],
          data: { pts: pts, q: q, d0: ds[0].d, v3: v3 }
        };
      } },
      { id: 'compare', marks: 5, gen: function (r) {
        var a = 60 + r.int(0, 10), diff = r.pick([1, 2, 5]), b = a + diff, sdv = 1 + r.int(0, 10) / 10, simple = r.pick(['0.002', '0.01', '0.03']);
        var corr = diff >= 5 ? r.pick(['0.04', '0.09', '0.16']) : r.pick(['0.31', '0.52', '0.74']);
        var strong = parseFloat(corr) < 0.05;
        return {
          html: 'Model A and model B were compared with 10-fold cross-validation repeated for 10 random seeds, on exactly the same folds. Mean accuracy: A = ' + a + '%, B = ' + b + '%. A simple paired t-test over the ten seed means gives p = ' + simple + '. The corrected resampled t-test over all 100 folds gives <b>p = ' + corr + '</b>.',
          parts: [
            { kind: 'mcq', weight: 0.6, ask: 'What is the sensible conclusion?', opts: strong ? ['There is reasonable evidence that B is better than A, even under the stricter test', 'B is certainly better than A', 'The stricter test overrules the simple test, so A is better', 'Nothing can be concluded from any p-value'] : ['The evidence that B is better is not strong enough, because the stricter test does not reach p < 0.05', 'B is better because the simple test is significant', 'A is better than B', 'B is better by ' + diff + ' points, so the test does not matter'], a: 0 },
            { kind: 'mcq', weight: 0.4, ask: 'Why is the corrected test stricter than the simple paired test on the ten seed means?', opts: ['Training sets overlap between folds and seeds, so the results are not independent and the simple test is overconfident', 'It uses fewer data', 'It ignores the folds', 'It always gives larger p-values'], a: 0 }
          ],
          reason: ['State what each p-value says about chance.', 'Refer to overlapping training sets and non-independence.'],
          explain: [strong ? 'Even under the stricter, corrected test p = ' + corr + ' is below 0.05, so the evidence for B is reasonable (still not certainty).' : 'With p = ' + corr + ' under the corrected test, the gap of ' + diff + ' points could plausibly be caused by the particular splits, so it is not established.', 'Repeated cross-validation reuses the same songs in many training sets, so the folds are not independent. The simple test treats them as if they were and is therefore too confident.'],
          data: { corr: corr, strong: strong }
        };
      } }
    ]
  });
})();
