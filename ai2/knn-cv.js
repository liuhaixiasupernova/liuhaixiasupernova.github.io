/* World 1-3, panel C (10 folds x 10 seeds and statistical tests) and the world's quiz, reflection and reading. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el, K = window.KNN;
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function fmtP(p) { return p < 0.0001 ? '< 0.0001' : '= ' + p.toFixed(3); }

  function buildC(host) {
    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);

    var bar = el('div', 'foldbar'); bar.setAttribute('aria-hidden', 'true'); view.appendChild(bar);
    var cells = []; for (var i = 0; i < 10; i++) { var c0 = el('div', 'fcell'); bar.appendChild(c0); cells.push(c0); }
    var status = UI.readout(view); status.textContent = 'Press Run. Ten different shuffles (seeds) will each split the 200 songs into 10 folds. Each fold takes a turn as the test set.';
    var cv = UI.canvas(view, 640, 300, 'Accuracy of model A and model B for each of ten seeds, joined by a line per seed');
    var tbWrap = el('div', 'scroll-x'), tb = document.createElement('table'); tb.className = 'tbl'; tbWrap.appendChild(tb); view.appendChild(tbWrap);
    var res = el('div', 'res'), verdict = el('p', 'verdict'); verdict.hidden = true; view.appendChild(res); view.appendChild(verdict);

    ctl.appendChild(el('h3', 'demo-title', 'Is B really better than A?'));
    UI.note(ctl, 'Compare two models fairly. One split can crown either model by luck. Here every seed reshuffles the songs, runs 10-fold cross-validation, and both models see exactly the same folds. Then a statistical test asks whether the gap is bigger than the luck.');
    var sA = UI.slider(ctl, { label: 'Model A: k', min: 1, max: 25, value: 1 });
    var sB = UI.slider(ctl, { label: 'Model B: k', min: 1, max: 25, value: 9 });
    var sM = UI.slider(ctl, { label: 'Useless extra features', min: 0, max: 20, value: 6 });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run 10 x 10', 'btn-sun', function () { run(); });
    UI.button(row, '10 different seeds', '', function () { seedBase += 10; run(); });
    UI.presets(ctl, 'TRY THIS', [
      { t: '1-NN against 9-NN', v: [1, 9, 6] }, { t: 'A near tie: k = 7 against k = 9', v: [7, 9, 6] }, { t: 'No useless features: 1 against 9', v: [1, 9, 0] }
    ], function (it) { sA.set(it.v[0], true); sB.set(it.v[1], true); sM.set(it.v[2], true); run(); });
    UI.note(ctl, 'Seeds used: see the table. Each run takes a few seconds because it really trains and tests 200 models.', 'fine');

    var seedBase = 0, token = 0, rows = [], aF = [], bF = [], ka, kb, D;
    function setTable() {
      var h = '<thead><tr><th>Seed</th><th>A (k=' + ka + ')</th><th>B (k=' + kb + ')</th><th>B minus A</th></tr></thead><tbody>';
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
      c.textAlign = 'center'; c.fillText('A: k = ' + ka, XA, h - 10); c.fillText('B: k = ' + kb, XB, h - 10);
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
      var wins = d.filter(function (v) { return v > 1e-9; }).length, losses = d.filter(function (v) { return v < -1e-9; }).length;
      res.innerHTML = '';
      [
        'Model A (k = ' + ka + '): mean accuracy ' + pct(K.mean(a)) + ', sd ' + pct(K.sd(a)) + ' across seeds. Model B (k = ' + kb + '): ' + pct(K.mean(b)) + ', sd ' + pct(K.sd(b)) + '.',
        'Single folds are noisy. Model A scored anywhere from ' + pct(Math.min.apply(null, aF), 0) + ' to ' + pct(Math.max.apply(null, aF), 0) + ' on individual folds of 20 songs. One split could tell almost any story.',
        'B beat A on ' + wins + ' of 10 seeds, A beat B on ' + losses + '.',
        'Paired t-test on the 10 seed means: difference ' + (K.mean(d) * 100).toFixed(1) + ' points, t(' + pt.df + ') = ' + (isFinite(pt.t) ? pt.t.toFixed(2) : 'very large') + ', p ' + fmtP(pt.p) + '.',
        'Corrected resampled t-test on all 100 folds (allows for overlapping training sets): t(' + ct.df + ') = ' + (isFinite(ct.t) ? ct.t.toFixed(2) : 'very large') + ', p ' + fmtP(ct.p) + '.'
      ].forEach(function (t) { res.appendChild(el('p', 'demo-note', t)); });
      var better = K.mean(d) > 0 ? 'B' : 'A', diff = Math.abs(K.mean(d) * 100).toFixed(1);
      verdict.hidden = false;
      if (wins + losses === 0) { verdict.className = 'verdict'; verdict.textContent = 'The two models are the same, so every difference is zero. Choose different values of k.'; }
      else if (ct.p < 0.05) { verdict.className = 'verdict good'; verdict.textContent = 'Reliable. Model ' + better + ' is better by about ' + diff + ' points, and even the strict test agrees.'; }
      else if (pt.p < 0.05) { verdict.className = 'verdict warn'; verdict.textContent = 'Be careful. The simple test says the gap is real (p ' + fmtP(pt.p) + '), but the stricter test does not (p ' + fmtP(ct.p) + '). Repeated cross-validation reuses the same songs, which makes the simple test too confident. Call it promising, not proven.'; }
      else { verdict.className = 'verdict'; verdict.textContent = 'No reliable difference. The gap you see is about the size of the noise from different splits.'; }
    }
    function run() {
      var my = ++token; ka = sA.get(); kb = sB.get(); D = 2 + sM.get(); rows = []; aF = []; bF = []; verdict.hidden = true; res.innerHTML = ''; setTable(); plot(); bRun.disabled = true;
      cells.forEach(function (c) { c.className = 'fcell'; });
      var s = 0, f = 0, folds = null, sa = [], sb = [];
      function tick() {
        if (my !== token) return;
        if (f === 0) { folds = K.folds(seedBase + s + 1); sa = []; sb = []; cells.forEach(function (c) { c.className = 'fcell'; }); }
        var acc = K.foldAccuracy(folds[f], D, [ka, kb]); sa.push(acc[0]); sb.push(acc[1]); aF.push(acc[0]); bF.push(acc[1]);
        cells.forEach(function (c, i) { c.className = 'fcell' + (i < f ? ' done' : i === f ? ' act' : ''); });
        status.textContent = 'Seed ' + (seedBase + s + 1) + ' (' + (s + 1) + ' of 10), fold ' + (f + 1) + ' of 10. This fold: A ' + pct(acc[0], 0) + ', B ' + pct(acc[1], 0) + '.';
        f++;
        if (f === 10) {
          cells.forEach(function (c) { c.className = 'fcell done'; });
          rows.push({ seed: seedBase + s + 1, a: K.mean(sa), b: K.mean(sb) }); setTable(); plot(); f = 0; s++;
          if (s === 10) { status.textContent = 'Done: 10 seeds x 10 folds = 100 test results per model. Read the numbers below.'; bRun.disabled = false; finish(); return; }
        }
        setTimeout(tick, UI.reduce ? 0 : 28);
      }
      setTimeout(tick, 30);
    }
    ka = sA.get(); kb = sB.get(); setTable(); plot();
    return { resume: function () {}, pause: function () { token++; bRun.disabled = false; } };
  }

  AI2.register({
    id: 'knn', n: '1-3', title: 'Predict', short: 'KNN, music genres and honest evaluation', color: '#c2255c',
    intro: 'Your first model that learns from data: k-nearest neighbours guessing the genre of a song. The model is simple. The hard part is knowing whether to believe its accuracy. Explore how it decides, how it overfits, and how to compare models fairly.',
    demos: [
      { title: '1 How KNN decides', build: K.buildA },
      { title: '2 Overfitting', build: K.buildB },
      { title: '3 10 folds, 10 seeds, a t-test', build: buildC }
    ],
    quiz: [
      { tag: 'how KNN works', q: 'What does k-nearest neighbours actually do at training time?',
        opts: ['It fits a line through the songs', 'Almost nothing: it stores the training songs, and the work happens when a new song must be classified', 'It learns one weight per genre', 'It removes songs that are hard to classify'], a: 1,
        why: 'KNN is a lazy learner. Training is just storing the data. At prediction time it measures the distance to the stored songs and lets the k closest vote.',
        tip: 'In "How KNN decides", drop a mystery song and watch the lines to its neighbours appear only when you ask.' },
      { tag: 'choosing k', q: 'Moving k from 1 to 25 turns jagged islands into smooth regions. What is the trade-off?',
        opts: ['Small k is always better because it is more precise', 'Small k follows every quirk and noise in the data; large k smooths over noise but can blur real local structure', 'Large k always overfits', 'k changes only the speed, not the predictions'], a: 1,
        why: 'Small k gives flexible, high-variance boundaries that chase noise. Large k gives stable, high-bias boundaries that can miss real detail. A good k sits in between.',
        tip: 'Use the "k = 1 (jagged)" and "k = 25 (smooth)" presets and compare the regions.' },
      { tag: 'feature scaling', q: 'Why did switching off feature scaling make the decision regions look like vertical stripes?',
        opts: ['Brightness became more important', 'Tempo has numbers around 100 and brightness only 0 to 1, so tempo dominated the distance and brightness was almost ignored', 'The nearest neighbours were chosen at random', 'k became 1'], a: 1,
        why: 'KNN is built on distances. A feature with a larger numeric range dominates them. Scaling (for example z-scores computed on the training set) puts features on an equal footing.',
        tip: 'Press "Scaling off" and compare the regions and the readout with scaling on.' },
      { tag: 'overfitting', q: 'A model scores 100% on its training songs but 62% on new songs. What does this indicate?',
        opts: ['An excellent model', 'Overfitting: it memorised the training data, noise included. With k = 1 each training song is its own nearest neighbour, so training accuracy tells you nothing', 'The test set is too easy', 'Underfitting'], a: 1,
        why: 'A large gap between training and test accuracy is the classic sign of overfitting. For 1-NN the training score is 100% by construction, which is why only data the model has not seen can judge it.',
        tip: 'Open "Overfitting" with the "Overfit it" preset and read the two numbers and the gap.' },
      { tag: 'fixing overfitting', q: 'Which of these is NOT a sensible way to reduce overfitting in this KNN setting?',
        opts: ['Remove irrelevant features', 'Increase k', 'Collect more training songs', 'Choose the k that gives the highest accuracy on the training set'], a: 3,
        why: 'The training set rewards memorising, so it always prefers k = 1. The other three help: fewer useless features means less noise in the distances, larger k smooths, and more data covers the space better.',
        tip: 'Try Fix 1, Fix 2 and Fix 3 one at a time, then "All three fixes".' },
      { tag: 'repeated cross-validation', q: 'Why repeat 10-fold cross-validation with 10 different seeds?',
        opts: ['KNN is a random algorithm', 'One partition of the data can be lucky or unlucky; different shuffles show how much the result depends on the split and give a steadier estimate', 'To train on the test set', 'To make k larger'], a: 1,
        why: 'A single split gives one number that depends on which songs happened to land in the test set. Cross-validation uses every song for testing once, and repeating with new shuffles shows the spread.',
        tip: 'In panel 3 look at the range of single-fold accuracies, then at the spread across seeds.' },
      { tag: 'honest evaluation', q: 'You try many values of k, keep the one with the best test-set score, and report that score. What is wrong?',
        opts: ['Nothing, that is standard practice', 'The test set helped choose the model, so the score is optimistic. Choose k with cross-validation on the training data and use the test set once at the end', 'The test set is too small to use', 'You should have chosen the largest k'], a: 1,
        why: 'Once test results influence a choice, the test set is no longer unseen. Select models with validation or cross-validation, and keep the test set for one final, honest check.',
        tip: 'Panel 2 is an illustration only. Panel 3 shows folds being used for testing in turn, without peeking at a separate test set.' },
      { tag: 'statistical test', q: 'Over 10 seeds model B is 5 points more accurate than A, but the corrected resampled t-test gives p = 0.09. What is the sensible conclusion?',
        opts: ['B is proven better because 5 points is a lot', 'The evidence is not strong enough to claim B is better; the gap could come from the particular splits', 'A is better', 'The test is wrong because it disagrees with the simple t-test'], a: 1,
        why: 'The simple test treats the 100 folds as independent, but training sets overlap, so it is overconfident. The corrected test accounts for this. With p = 0.09 you should say the result is promising but not established.',
        tip: 'Run "1-NN against 9-NN" and compare the two p-values.' },
      { tag: 'p-value', q: 'What does p = 0.03 mean?',
        opts: ['There is a 3% chance the two models are equal', 'If the two models were truly equal, a difference at least this large would appear in about 3% of experiments', 'Model B is 97% likely to be better', 'Model B is 3% more accurate'], a: 1,
        why: 'A p-value is a probability about the data, assuming no real difference. It is not the probability that the hypothesis is true, and it says nothing about how big or useful the difference is.',
        tip: 'Run "A near tie: k = 7 against k = 9" and notice p is large when the models really are equivalent.' }
    ],
    reflect: [
      'How would you convince a sceptical colleague that your model is not overfitting? Which numbers would you show them?',
      'Why is a single train/test split not enough to say one model beats another? What did 10 folds x 10 seeds show you that one split could not?',
      'Name one thing about a real music genre dataset (the features, the labels, how songs were collected) that could make your accuracy look better than it will be on new music.'
    ],
    more: [
      { h: 'Try next', p: ['In panel 3 keep k = 1 against k = 9 and slide the useless features from 0 to 20. How do the means and the p-values change?', 'Run "10 different seeds" a few times. Does your conclusion stay the same? Why does that matter when you write up results?'] },
      { h: 'Ideas to remember', p: ['Scale the features, use unseen data, compare models on identical folds, repeat with several seeds, and test the difference.', 'Training accuracy flatters. Test accuracy informs. A tuned choice needs its own validation data.'] },
      { h: 'Beyond this demo', p: ['Distance-weighted KNN, other distance measures, feature selection, nested cross-validation for tuning and testing together.', 'Other tests: the Wilcoxon signed-rank test, and the Friedman test with post-hoc comparisons when you compare many models over many datasets. For music, split by artist or album so that songs from the same record never sit on both sides.'] },
      { h: 'Further reading', cls: 'read', p: ['Demsar (2006), Statistical comparisons of classifiers over multiple data sets, Journal of Machine Learning Research. Dietterich (1998), Approximate statistical tests for comparing supervised classification learning algorithms, Neural Computation. Nadeau and Bengio (2003), Inference for the generalization error, Machine Learning.', 'Tzanetakis and Cook (2002), Musical genre classification of audio signals, IEEE Transactions on Speech and Audio Processing. Sturm (2013), The GTZAN dataset: its contents, its faults, their effects on evaluation, and its future use, arXiv.'] }
    ]
  });
})();
