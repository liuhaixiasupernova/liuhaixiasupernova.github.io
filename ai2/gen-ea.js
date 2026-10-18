/* Practice Lab generators: evolutionary computing (selection, variation, reading an evolutionary run). */
(function () {
  'use strict';
  var PR = window.PRACTICE, UI = AI2.ui, el = UI.el, f2 = PR.fmt;

  /* a small line-plot helper shared by the generator files */
  PR.plot = function (host, o) {
    var W = o.w || 520, H = o.h || 250, L = 52, R = 16, T = 24, B = 40, cv = UI.canvas(host, W, H, o.alt || 'Line graph');
    var c = cv.getContext('2d'), xs = o.xmax, lo = o.ymin, hi = o.ymax;
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.font = '700 12px Nunito,system-ui,sans-serif'; c.fillStyle = '#231a52'; c.lineWidth = 1;
    function X(v) { return L + v / xs * (W - L - R); } function Y(v) { return H - B - (v - lo) / (hi - lo) * (H - B - T); }
    var step = o.ystep || (hi - lo) / 5;
    c.textAlign = 'right'; for (var v = lo; v <= hi + 1e-9; v += step) { c.strokeStyle = 'rgba(35,26,82,.15)'; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(W - R, Y(v)); c.stroke(); c.fillText(f2(v, 2), L - 6, Y(v) + 4); }
    c.textAlign = 'center'; var xstep = o.xstep || xs / 5; for (var x = 0; x <= xs + 1e-9; x += xstep) { c.fillText(f2(x, 0), X(x), H - B + 16); c.strokeStyle = 'rgba(35,26,82,.15)'; c.beginPath(); c.moveTo(X(x), T); c.lineTo(X(x), H - B); c.stroke(); }
    c.fillText(o.xlabel || '', (L + W - R) / 2, H - 6); c.save(); c.translate(13, (T + H - B) / 2); c.rotate(-Math.PI / 2); c.fillText(o.ylabel || '', 0, 0); c.restore();
    c.textAlign = 'left'; c.strokeStyle = '#231a52'; c.lineWidth = 2; c.strokeRect(L, T, W - L - R, H - B - T);
    o.series.forEach(function (s, si) {
      c.beginPath(); s.data.forEach(function (v, i) { var px = X(s.x ? s.x[i] : i), py = Y(v); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      c.strokeStyle = s.color; c.lineWidth = 3; c.stroke();
      c.fillStyle = s.color; c.fillRect(L + 8 + si * 150, 6, 14, 10); c.fillStyle = '#231a52'; c.fillText(s.name, L + 26 + si * 150, 15);
    });
    return cv;
  };

  function table(rows, head) {
    var h = '<table class="tbl"><thead><tr>' + head.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) { h += '<tr>' + r.map(function (t) { return '<td class="n">' + t + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table>';
  }
  function bits(r, n) { var s = ''; for (var i = 0; i < n; i++) s += r.int(0, 1); return s; }
  var NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
  function fitnessList(r, n, lo, hi) { var seen = {}, out = []; while (out.length < n) { var v = r.int(lo, hi); if (!seen[v]) { seen[v] = 1; out.push(v); } } return out; }
  var TIPS = 'World 1-1 Evolve: try the tournament-size and elitism controls.';

  /* ---------- selection and variation ---------- */
  PR.family({
    id: 'ea-sel', label: 'Evolutionary optimisation', world: 'World 1-1 Evolve', tip: TIPS,
    blurb: 'Selection schemes, probabilities, crossover and mutation worked by hand.',
    forms: [
      { id: 'roulette-prob', marks: 10, gen: function (r) {
        var n = 5, f = fitnessList(r, n, 4, 45), F = f.reduce(function (a, b) { return a + b; }, 0), p = f.map(function (v) { return v / F * 100; });
        var best = f.indexOf(Math.max.apply(null, f)), worst = f.indexOf(Math.min.apply(null, f)), L = r.pick([6, 8]);
        var g = [], seenG = {}; while (g.length < n) { var gg = bits(r, L); if (!seenG[gg]) { seenG[gg] = 1; g.push(gg); } } var pw = p[worst] / 100, none = Math.pow(1 - pw, n) * 100, big = r.pick([100, 200, 500]);
        return {
          html: 'A maximisation problem is solved by an evolutionary algorithm. The current population of ' + n + ' individuals is shown. A pool of ' + n + ' parents will be filled by spinning a fitness-proportionate (roulette) wheel ' + n + ' times, with replacement.' +
            table(g.map(function (s, i) { return [NAMES[i], s.split('').join(' '), f[i]]; }), ['Individual', 'Genome', 'Fitness']),
          parts: [
            { kind: 'num', weight: 0.4, ask: 'Give each individual\'s chance of being picked on one spin, as a percentage (1 decimal place is fine).', cols: 5, fields: f.map(function (v, i) { return { label: NAMES[i], ans: p[i], tol: 0.6, unit: '%', dp: 1 }; }) },
            { kind: 'num', weight: 0.15, ask: 'On average, how many copies of the fittest individual will the parent pool contain?', fields: [{ label: 'Expected copies', ans: p[best] / 100 * n, tol: 0.03 }] },
            { kind: 'num', weight: 0.2, ask: 'What is the chance that the least fit individual (' + NAMES[worst] + ') is not picked at all in the ' + n + ' spins?', fields: [{ label: 'Probability', ans: none, tol: 1, unit: '%', dp: 1 }] },
            { kind: 'mcq', weight: 0.25, ask: 'Every fitness value is increased by ' + big + ' (the problem is otherwise unchanged). What happens to the wheel?', opts: ['Selection becomes much weaker, because the percentages become almost equal', 'Selection becomes much stronger', 'Nothing changes, because the ranking of the individuals is the same', 'The wheel can no longer be spun'], a: 0 }
          ],
          reason: ['Probability = individual fitness divided by the total fitness (' + F + ').', 'Fitter individuals get a bigger slice, but selection is random: weak individuals can still be chosen and strong ones can be missed.', 'Adding a constant keeps the ranking but flattens the ratios, so selection pressure drops.'],
          explain: ['Total fitness is ' + F + ', so each probability is fitness / ' + F + '. For ' + NAMES[best] + ': ' + f[best] + '/' + F + ' = ' + f2(p[best], 1) + '%, and the expected copies in ' + n + ' spins are ' + n + ' x ' + f2(p[best] / 100, 3) + ' = ' + f2(p[best] / 100 * n, 2) + '.',
            'Not being picked in one spin has probability 1 - ' + f2(pw, 3) + ', and the ' + n + ' spins are independent, so the chance of being missed every time is (1 - ' + f2(pw, 3) + ')^' + n + ' = ' + f2(none, 1) + '%.',
            'Adding a constant to every fitness does not change who is fitter, but it changes the ratios. Roulette-wheel selection depends on the ratios, not just the ranking, so the wheel flattens towards random choice.'],
          data: { f: f, F: F, p: p }
        };
      } },
      { id: 'roulette-spin', marks: 10, gen: function (r) {
        var n = r.pick([4, 5]), f = fitnessList(r, n, 3, 30), F = f.reduce(function (a, b) { return a + b; }, 0), cum = [], c = 0;
        f.forEach(function (v) { c += v / F; cum.push(c); });
        var spins = [], i; for (i = 0; i < 5; i++) spins.push(Math.round(r() * 100) / 100);
        function who(x) { for (var k = 0; k < n; k++) if (x < cum[k] - 1e-12) return k; return n - 1; }
        var ans = spins.map(who);
        return {
          html: 'A roulette wheel is built for a maximisation problem. The slice sizes are proportional to fitness. Slices are laid out in the order shown, starting from 0.' +
            table(f.map(function (v, k) { return [NAMES[k], v]; }), ['Individual', 'Fitness']) +
            '<p>Five spins produce these pointer positions, each a number from 0 (start of the wheel) to 1: <b>' + spins.map(function (s) { return s.toFixed(2); }).join(', ') + '</b>.</p>',
          parts: [
            { kind: 'num', weight: 0.7, ask: 'Which individual is picked by each spin? Answer with the letter.', cols: 5, fields: spins.map(function (s, k) { return { label: 'Spin ' + (k + 1) + ' (' + s.toFixed(2) + ')', ans: NAMES[ans[k]], txt: true }; }) },
            { kind: 'mcq', weight: 0.3, ask: 'Which individual is most likely to be missing from the parent pool of five?', opts: NAMES.slice(0, n).map(function (nm, k) { return nm + ' (the slice of size ' + f2(f[k] / F * 100, 0) + '%)'; }), a: f.indexOf(Math.min.apply(null, f)) }
          ],
          reason: ['Compute each share (fitness / total ' + F + ') and the cumulative boundaries.', 'A pointer falls in the slice whose boundaries contain it.'],
          explain: ['The shares are ' + f.map(function (v, k) { return NAMES[k] + ' ' + f2(v / F, 3); }).join(', ') + ', so the slice boundaries (cumulative) are ' + cum.map(function (v) { return f2(v, 3); }).join(', ') + '.',
            'Each pointer position belongs to the first slice whose upper boundary is above it.'],
          data: { f: f, cum: cum, spins: spins, ans: ans }
        };
      } },
      { id: 'roulette-cost', marks: 10, gen: function (r) {
        var n = 4, c = fitnessList(r, n, 2, 20), w = c.map(function (v) { return 1 / v; }), W = w.reduce(function (a, b) { return a + b; }, 0), p = w.map(function (v) { return v / W * 100; });
        var lowest = c.indexOf(Math.min.apply(null, c));
        return {
          html: 'An evolutionary algorithm minimises a cost (lower is better). Roulette-wheel selection is used, and to make cheap solutions more likely to be chosen, each individual\'s slice is proportional to <b>1 / cost</b>.' +
            table(c.map(function (v, k) { return [NAMES[k], v]; }), ['Individual', 'Cost']),
          parts: [
            { kind: 'num', weight: 0.6, ask: 'Find each individual\'s chance of being picked on one spin (percentage).', cols: 4, fields: c.map(function (v, k) { return { label: NAMES[k], ans: p[k], tol: 0.6, unit: '%', dp: 1 }; }) },
            { kind: 'mcq', weight: 0.4, ask: 'Why is it wrong to make the slices proportional to the cost itself?', opts: ['That would favour expensive, poor solutions in a minimisation problem', 'The wheel could not be spun', 'The percentages would add up to more than 100%', 'Costs cannot be compared'], a: 0 }
          ],
          reason: ['Convert cost to a score where bigger is better (here 1/cost).', 'Divide each score by the total of scores.'],
          explain: ['The scores are 1/cost: ' + w.map(function (v) { return v.toFixed(3); }).join(', ') + ', which total ' + W.toFixed(3) + '. Dividing gives the percentages. The cheapest individual (' + NAMES[lowest] + ') gets the biggest slice.', 'Roulette-wheel selection rewards big numbers. For a minimisation problem the numbers must first be transformed so that better solutions have bigger values.'],
          data: { c: c, p: p }
        };
      } },
      { id: 'tournament', marks: 10, gen: function (r) {
        var n = 6, f = fitnessList(r, n, 5, 60), k = r.pick([2, 3]), t = [], i, ans = [];
        for (i = 0; i < 4; i++) { var s = r.sample([0, 1, 2, 3, 4, 5], k).sort(); t.push(s); var b = s[0]; s.forEach(function (x) { if (f[x] > f[b]) b = x; }); ans.push(b); }
        var wmax = f.indexOf(Math.max.apply(null, f)), wmin = f.indexOf(Math.min.apply(null, f));
        return {
          html: 'A maximisation problem uses tournament selection with tournament size ' + k + ': ' + k + ' individuals are drawn at random and the fittest of them becomes a parent. The population is:' +
            table(f.map(function (v, j) { return [NAMES[j], v]; }), ['Individual', 'Fitness']) + '<p>The next four tournaments draw these groups: ' + t.map(function (g) { return '{' + g.map(function (x) { return NAMES[x]; }).join(', ') + '}'; }).join(', ') + '.</p>',
          parts: [
            { kind: 'num', weight: 0.5, ask: 'Who wins each tournament? Answer with the letter.', cols: 4, fields: ans.map(function (x, j) { return { label: 'Tournament ' + (j + 1), ans: NAMES[x], txt: true }; }) },
            { kind: 'mcq', weight: 0.25, ask: 'Individual ' + NAMES[wmin] + ' has the lowest fitness. Which statement is true?', opts: ['It can still win a tournament, but only if it is drawn alongside weaker individuals only', 'It can never be chosen as a parent under tournament selection', 'It wins whenever it is drawn', 'Tournaments are decided by a coin flip'], a: 0 },
            { kind: 'mcq', weight: 0.25, ask: 'The tournament size is raised from ' + k + ' to 5. What is the most likely effect on the search?', opts: ['Stronger selection pressure, faster convergence, and a higher risk of losing diversity', 'Weaker selection pressure and more exploration', 'No change', 'The population size shrinks'], a: 0 }
          ],
          reason: ['The fittest member of each drawn group wins.', 'Bigger tournaments give stronger pressure, because weak individuals rarely win against several rivals.'],
          explain: ['In each tournament only the drawn individuals compete, so a weak individual can win if it is lucky with its rivals. For the ' + NAMES[wmax] + ' with fitness ' + f[wmax] + ', winning only requires being drawn.', 'With a larger tournament the chance that a strong rival is in the group rises, so weak individuals win far less often: selection pressure goes up.'],
          data: { f: f, t: t, ans: ans }
        };
      } },
      { id: 'select-compare', marks: 10, gen: function (r) {
        var n = 6, big = r.pick([300, 500, 1000]), f = [big]; for (var i = 1; i < n; i++) f.push(r.int(5, 25));
        var F = f.reduce(function (a, b) { return a + b; }, 0), p0 = big / F * 100;
        return {
          html: 'In generation 3 of a maximisation run, one lucky individual has fitness ' + big + ' while the other five have fitness ' + f.slice(1).join(', ') + '. The designers use fitness-proportionate (roulette) selection.',
          parts: [
            { kind: 'num', weight: 0.3, ask: 'What is the chance that the high-fitness individual is chosen on a single spin?', fields: [{ label: 'Probability', ans: p0, tol: 0.6, unit: '%', dp: 1 }] },
            { kind: 'mcq', weight: 0.3, ask: 'What is the most likely consequence for the next generation?', opts: ['The next generation is filled mostly with copies of that one individual, so diversity collapses (premature convergence)', 'The five weaker individuals are all guaranteed a place', 'Selection becomes random', 'The population doubles in size'], a: 0 },
            { kind: 'multi', weight: 0.4, ask: 'Which changes would reduce the problem?', opts: ['Switch to rank-based selection', 'Switch to tournament selection', 'Scale the fitness values before spinning the wheel (for example, subtract a baseline)', 'Make the population smaller', 'Remove mutation'], a: [0, 1, 2] }
          ],
          reason: ['One fitness value dominates the total, so it takes almost the whole wheel.', 'Rank-based and tournament selection use order, not size, so a single outlier cannot dominate.'],
          explain: ['Total fitness is ' + F + ', so the chance is ' + big + '/' + F + ' = ' + f2(p0, 1) + '%. Over many spins the pool fills with its copies and the other genes disappear from the pool.', 'Rank-based and tournament selection depend only on the order of fitness values, so an outlier is not worth more than a modest lead. Scaling reduces the size of the outlier\'s slice. A smaller population or removing mutation makes diversity worse.'],
          data: { f: f, p0: p0 }
        };
      } },
      { id: 'crossover', marks: 10, gen: function (r) {
        var L = r.pick([8, 10]), a = bits(r, L), b = bits(r, L); while (b === a) b = bits(r, L);
        var cut = r.int(2, L - 3), c1 = a.slice(0, cut) + b.slice(cut), c2 = b.slice(0, cut) + a.slice(cut);
        var m = r.int(0, L - 1), mut = c1.slice(0, m) + (c1.charAt(m) === '0' ? '1' : '0') + c1.slice(m + 1);
        return {
          html: 'Two parents are bit strings of length ' + L + ':<br><b>P1 = ' + a + '</b><br><b>P2 = ' + b + '</b><br>One-point crossover is applied after position ' + cut + ' (so the first ' + cut + ' bits stay with their parent). Positions are counted from 1.',
          parts: [
            { kind: 'num', weight: 0.4, ask: 'Write the two children (no spaces).', cols: 2, fields: [{ label: 'Child 1 (P1 head + P2 tail)', ans: c1, txt: true }, { label: 'Child 2 (P2 head + P1 tail)', ans: c2, txt: true }] },
            { kind: 'num', weight: 0.3, ask: 'Bit-flip mutation now flips position ' + (m + 1) + ' of Child 1. Write the mutated Child 1.', fields: [{ label: 'Mutated child 1', ans: mut, txt: true }] },
            { kind: 'mcq', weight: 0.3, ask: 'What is mutation mainly for in a genetic algorithm?', opts: ['Introducing new genetic material, so the search can reach places crossover alone cannot', 'Making the population converge faster', 'Choosing parents', 'Evaluating fitness'], a: 0 }
          ],
          reason: ['Crossover recombines existing material from two parents.', 'Mutation can create a bit value that is missing from the whole population.'],
          explain: ['Child 1 takes P1[1..' + cut + '] = ' + a.slice(0, cut) + ' and P2[' + (cut + 1) + '..' + L + '] = ' + b.slice(cut) + '. Child 2 is the reverse.', 'Crossover only shuffles bits the population already has. If every individual has 0 at some position, crossover can never create a 1 there. Mutation can.'],
          data: { a: a, b: b, cut: cut, c1: c1, c2: c2, m: m, mut: mut }
        };
      } }
    ]
  });

  /* ---------- reading an evolutionary run ---------- */
  function run(r, kind) {
    var G = 100, best = [], mean = [], i, b = 12 + r.int(0, 6), top = 100;
    var P = {
      premature: { pop: 10, mut: '0.001', tour: 7, el: 'on', stop: r.int(12, 22), ceil: r.int(55, 70) },
      noisy: { pop: 100, mut: '0.4', tour: 3, el: 'off', stop: 0, ceil: 0 },
      slow: { pop: 100, mut: '0.02', tour: 2, el: 'on', stop: 0, ceil: 0 },
      stair: { pop: 30, mut: '0.0005', tour: 3, el: 'on', stop: 0, ceil: 0 }
    }[kind];
    if (kind === 'premature') { for (i = 0; i < G; i++) { var v = i < P.stop ? b + (P.ceil - b) * (1 - Math.exp(-i / 5)) : P.ceil; best.push(v); mean.push(i < P.stop ? v - 22 * Math.exp(-i / 6) - 2 : v - 0.8 - r() * 0.5); } }
    if (kind === 'noisy') { for (i = 0; i < G; i++) { best.push(Math.max(4, Math.min(96, 30 + 12 * r.gauss() + 0.05 * i))); mean.push(Math.max(2, 25 + 5 * r.gauss())); } }
    if (kind === 'slow') { for (i = 0; i < G; i++) { var s = b + 0.55 * i + r.gauss() * 0.4; best.push(s); mean.push(s - 6 - r() * 1.5); } }
    if (kind === 'stair') { var lvl = b, nxt = r.int(10, 18); for (i = 0; i < G; i++) { if (i === nxt) { lvl += r.int(8, 14); nxt += r.int(14, 26); } best.push(lvl); mean.push(lvl - 5 - r() * 2); } }
    return { best: best, mean: mean, P: P, G: G };
  }
  PR.family({
    id: 'ea-run', label: 'Reading an evolutionary run', world: 'World 1-1 Evolve', tip: 'World 1-1 Evolve: change one setting at a time and watch the best and average curves.',
    blurb: 'Diagnose a fitness graph and choose parameter changes.',
    forms: [{ id: 'curve', marks: 10, gen: function (r) {
      var kind = r.pick(['premature', 'noisy', 'slow', 'stair']), R = run(r, kind), P = R.P;
      var diag = {
        premature: 'Premature convergence: the population lost diversity and stalled below what is possible',
        noisy: 'Too much randomness: mutation is so high that good solutions are destroyed faster than they are found',
        slow: 'Healthy but slow: improvement is steady, and the run simply needs more pressure or more time',
        stair: 'Long stalls and occasional jumps: variation is too rare, so progress depends on lucky mutations'
      };
      var others = Object.keys(diag).filter(function (k) { return k !== kind; }).map(function (k) { return diag[k]; });
      var opts = [diag[kind]].concat(r.sample(others, 3));
      var changes = {
        premature: { good: ['Raise the mutation rate a little', 'Use a larger population', 'Use a smaller tournament size (weaker selection pressure)'], bad: ['Raise the tournament size further', 'Run for many more generations without any other change', 'Turn mutation off'] },
        noisy: { good: ['Lower the mutation rate (or step size) a lot', 'Switch elitism on so the best individual is never lost', 'Use a larger tournament size'], bad: ['Raise the mutation rate further', 'Use random selection', 'Reduce the population to 5'] },
        slow: { good: ['Run for more generations', 'Increase the tournament size a little', 'Increase the mutation step modestly'], bad: ['Switch elitism off', 'Reduce the population to 5', 'Set the mutation rate to 0.5'] },
        stair: { good: ['Raise the mutation rate', 'Use a larger population', 'Add crossover between different parents'], bad: ['Lower the mutation rate further', 'Use a tiny population', 'Stop the run earlier'] }
      }[kind];
      var all = changes.good.concat(changes.bad);
      var plateauAt = null; if (kind === 'premature') plateauAt = P.stop;
      var parts = [
        { kind: 'mcq', weight: 0.35, ask: 'Which description best fits this run?', opts: opts, a: 0 },
        { kind: 'multi', weight: 0.4, ask: 'Which changes are most likely to improve the next run?', opts: all, a: [0, 1, 2] }
      ];
      if (plateauAt != null) parts.push({ kind: 'num', weight: 0.25, ask: 'Roughly at which generation does the best fitness stop improving? (within 6 generations)', fields: [{ label: 'Generation', ans: plateauAt, tol: 6, dp: 0 }] });
      else parts.push({ kind: 'num', weight: 0.25, ask: 'Read the graph: what is the best fitness at the end of the run (generation 100)? (within 4 units)', fields: [{ label: 'Best fitness', ans: R.best[99], tol: 4, dp: 0 }] });
      return {
        html: 'An evolutionary algorithm maximises a score. The graph shows the best individual (gold) and the population average (purple) over 100 generations. Settings used: population ' + P.pop + ', mutation rate per gene ' + P.mut + ', tournament size ' + P.tour + ', elitism ' + P.el + '.',
        fig: function (h) { PR.plot(h, { series: [{ name: 'best', data: R.best, color: '#e0a100' }, { name: 'average', data: R.mean, color: '#6a3df0' }], xmax: 100, ymin: 0, ymax: 100, ystep: 20, xlabel: 'generation', ylabel: 'fitness', alt: 'Best and average fitness over 100 generations' }); },
        parts: parts,
        reason: ['Say what the curves show (for example, the best curve flat while the average meets it, or the best curve jumping around).', 'Link the pattern to a setting: mutation, selection pressure, population size or elitism.', 'Explain how your change moves the balance between exploration and exploitation.'],
        explain: [diag[kind] + '.', kind === 'premature' ? 'When the average meets the best curve, the population has become nearly identical, so selection and crossover have nothing new to work with. More variation (mutation, population) or weaker selection pressure helps.' : kind === 'noisy' ? 'A best curve that wanders up and down means good solutions are being destroyed. With no elitism and a very high mutation rate, the search behaves almost like random search.' : kind === 'slow' ? 'The best and average curves climb together with no plateau, so the search has not converged: it needs more time, or somewhat stronger selection.' : 'Plateaus broken by jumps show that new improvements arrive only occasionally. More variation makes improvements arrive sooner.'],
        data: { kind: kind }
      };
    } }]
  });
})();
