/* Practice Lab generators: parameter sweeping for a genetic algorithm.
   Method (Worksheet 4): pick two GA parameters, take the default as the Medium value with a Low and High either side,
   run all 9 combinations (each an average over several runs, other parameters unchanged), then centre a finer grid on the best cell. */
(function () {
  'use strict';
  var PR = window.PRACTICE, f2 = PR.fmt;
  function pre(v) { return +(+v).toPrecision(3); }
  function r4(v) { return +(+v).toFixed(4); }

  var DIMS = {
    mutrate: function (r) {
      if (r.chance(0.5)) { var N = r.pick([20, 25, 40, 50]); return { key: 'mutrate', name: 'mutation rate', abbr: 'MUTRATE', vals: [1 / (2 * N), 1 / N, 2 / N].map(pre), geo: true, N: N }; }
      return { key: 'mutrate', name: 'mutation rate', abbr: 'MUTRATE', vals: r.pick([[0.01, 0.02, 0.03], [0.02, 0.04, 0.06], [0.005, 0.01, 0.015]]), geo: false };
    },
    mutstep: function (r) { return { key: 'mutstep', name: 'mutation step', abbr: 'MUTSTEP', vals: r.pick([[0.1, 0.2, 0.3], [0.05, 0.1, 0.15], [0.2, 0.4, 0.6]]), geo: false }; },
    P: function (r) { return { key: 'P', name: 'population size', abbr: 'P', vals: r.pick([[20, 40, 60], [30, 60, 90], [50, 100, 150]]), geo: false }; },
    GEN: function (r) { return { key: 'GEN', name: 'number of generations', abbr: 'GEN', vals: r.pick([[100, 200, 300], [50, 100, 150], [200, 400, 600]]), geo: false }; },
    T: function () { return { key: 'T', name: 'tournament size', abbr: 'T', vals: [2, 4, 6], geo: false }; }
  };
  var PAIRS = [['mutrate', 'mutstep'], ['mutrate', 'mutstep'], ['mutrate', 'mutstep'], ['P', 'mutrate'], ['T', 'mutrate'], ['P', 'T'], ['GEN', 'mutrate'], ['mutstep', 'T'], ['P', 'GEN']];

  /* example of a good next axis, given the old values and the index of the best */
  function ref(d, k) {
    var x = d.vals[k];
    if (d.geo) { var h = Math.SQRT2; return [pre(x / h), x, pre(x * h)]; }
    var hh = (d.vals[1] - d.vals[0]) / 2;
    return [x - hh, x, x + hh].map(r4);
  }
  function axisFor(d, k, label) { return { label: label || d.name + ' (' + d.abbr + ')', old: d.vals, k: k, geo: d.geo, ref: ref(d, k) }; }

  /* a 3 x 3 table of averaged GA results: columns follow A, rows follow B */
  function sweep(r, pair) {
    var A = DIMS[pair[0]](r), B = DIMS[pair[1]](r), mx = r.chance(0.5), runs = r.pick([10, 20, 30]), tab, flat, tries = 0, ok = false;
    while (!ok && tries++ < 60) {
      var ox = r.chance(0.5) ? 0.7 + r() * 0.6 : r() * 3.2 - 0.6, oy = r.chance(0.5) ? 0.7 + r() * 0.6 : r() * 3.2 - 0.6, base = mx ? r.int(48, 80) : r.int(10, 40), k = r.int(3, 9);
      tab = []; for (var i = 0; i < 3; i++) { tab.push([]); for (var j = 0; j < 3; j++) { var dx = j - ox, dy = i - oy, q = dx * dx + 0.7 * dy * dy + 0.5 * dx * dy, d = 28 * (1 - Math.exp(-k * q / 28)); tab[i].push(Math.round((base + (mx ? -d : d) + (r() - 0.5) * 2) * 10) / 10); } }
      flat = []; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) flat.push({ v: tab[i][j], i: i, j: j });
      flat.sort(function (a, b) { return mx ? b.v - a.v : a.v - b.v; });
      ok = Math.abs(flat[0].v - flat[1].v) >= 1.5;
    }
    return { A: A, B: B, mx: mx, runs: runs, tab: tab, flat: flat, bi: flat[0].i, bj: flat[0].j, second: flat[1], worst: flat[8] };
  }
  function tableHTML(S) {
    return '<table class="tbl"><thead><tr><th>' + S.B.abbr + ' \\ ' + S.A.abbr + '</th>' + S.A.vals.map(function (v) { return '<th>' + v + '</th>'; }).join('') + '</tr></thead><tbody>' +
      S.tab.map(function (row, i) { return '<tr><td class="n"><b>' + S.B.vals[i] + '</b></td>' + row.map(function (v) { return '<td class="n">' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function cellText(S, i, j) { return S.A.abbr + ' = ' + S.A.vals[j] + ' with ' + S.B.abbr + ' = ' + S.B.vals[i]; }
  function intro(S) {
    return 'A genetic algorithm (real-valued genes, tournament selection, single-point crossover, step-wise mutation) ' + (S.mx ? 'maximises' : 'minimises') + ' a test function. Its <b>' + S.A.name + '</b> (' + S.A.abbr + ', across the top) and <b>' + S.B.name + '</b> (' + S.B.abbr + ', down the side) were each set to a low, medium and high value, with every other parameter left at its default. Each cell is the <b>average over ' + S.runs + ' runs</b>. ' + (S.mx ? 'Higher is better.' : 'Lower is better.') + tableHTML(S);
  }
  var TIP = 'Worksheet 4: run the 3 x 3 sweep on your own GA, then centre a finer grid on the best cell. In World 1-1 Evolve, change the mutation rate and step and watch what happens.';

  PR.family({
    id: 'sweep', label: 'Parameter sweeping (GA)', world: 'World 1-1 Evolve and Worksheet 4', tip: TIP,
    blurb: 'Set up a 3 x 3 sweep, read the results, and design the next grid around the best cell.',
    forms: [
      /* choose the next grid from a table of results */
      { id: 'next-grid', marks: 5, gen: function (r) {
        var S = sweep(r, r.pick(PAIRS)), bi = S.bi, bj = S.bj;
        var cells = [{ s: cellText(S, bi, bj), c: true }, { s: cellText(S, S.worst.i, S.worst.j), c: false }], cand = [];
        for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (!(i === bi && j === bj) && !(i === S.worst.i && j === S.worst.j)) cand.push({ s: cellText(S, i, j), c: false });
        cells = r.shuffle(cells.concat(r.sample(cand, 2)));
        var edgeA = bj !== 1, edgeB = bi !== 1, extra = r.chance(0.5)
          ? { ask: 'Why is the best cell used as the new middle (Medium) value?', opts: ['The best region is where improvement is most likely, and a finer grid around it can locate the optimum more precisely', 'A grid must always have its best result in the centre', 'The best cell is guaranteed to be the global optimum', 'The other cells are no longer needed because they are wrong'], a: 0 }
          : { ask: 'Each cell is an average over ' + S.runs + ' runs. Why not use a single run per cell?', opts: ['A GA is stochastic, so one run can be lucky or unlucky; averaging shows the typical result', 'Averaging makes the table smaller', 'A GA needs ' + S.runs + ' runs to start', 'Single runs are always the best result'], a: 0 };
        var axes = [axisFor(S.A, bj), axisFor(S.B, bi)];
        return {
          html: intro(S) + 'The sweep followed the standard method: the default is the Medium value, and all nine combinations were run.',
          parts: [
            { kind: 'mcq', weight: 0.25, ask: 'Which combination performed best?', opts: cells.map(function (x) { return x.s; }), a: cells.findIndex(function (x) { return x.c; }) },
            { kind: 'axes', weight: 0.55, ask: 'The best combination becomes the new Medium values, and a second 3 x 3 grid is made around it. Write the Low, Medium and High values you would use for each parameter.', axes: axes },
            extra && { kind: 'mcq', weight: 0.2, ask: extra.ask, opts: extra.opts, a: extra.a }
          ],
          reason: ['Read the table the right way round for ' + (S.mx ? 'maximisation' : 'minimisation') + ' and find the best cell.', 'Make it the new Medium value and use smaller steps around it.', (edgeA || edgeB) ? 'The best sat on the edge of the old grid, so the new grid extends beyond it in that direction, because the optimum may lie further out.' : 'The best was in the middle of the old grid, so the optimum is probably between the tested values: refine.'],
          explain: ['The best cell is ' + cellText(S, bi, bj) + ' (' + S.tab[bi][bj] + '). For ' + (S.mx ? 'maximisation the biggest number wins' : 'minimisation the smallest number wins') + ', so do not read the table the wrong way round.',
            'New grid, centred on the best: ' + S.A.abbr + ' ' + axes[0].ref.join(', ') + ' and ' + S.B.abbr + ' ' + axes[1].ref.join(', ') + ' (one good answer; other finer grids around the same middle are fine).',
            (edgeA || edgeB) ? 'The best value was on the edge of the grid for ' + (edgeA && edgeB ? 'both parameters' : edgeA ? S.A.abbr : S.B.abbr) + ', so the new grid also reaches beyond that edge: the optimum may be further out.' + (!(edgeA && edgeB) ? ' The other parameter was in the middle, so its new values stay within the old range.' : '') : 'Both best values were in the middle of the old range, so the optimum is probably between the tested values: a finer grid around them is the right next step.'],
          data: { tab: S.tab, mx: S.mx, bi: bi, bj: bj, A: S.A.vals, B: S.B.vals, Ageo: S.A.geo, Bgeo: S.B.geo }
        };
      } },

      /* build the first grid from the defaults */
      { id: 'design-grid', marks: 5, gen: function (r) {
        var N = r.pick([20, 25, 40, 50]), R = r.pick([10, 20, 30]), v = [1 / (2 * N), 1 / N, 2 / N].map(pre);
        return {
          html: 'A real-valued GA has these default settings: population size 50, 100 generations, tournament size 3, one crossover point, mutation step 0.2, and a mutation rate of <b>1/N</b> where N = ' + N + ' is the number of genes. You decide to sweep the <b>mutation rate</b> against the <b>mutation step</b>. For the mutation rate, the default is the Medium value, the Low value is half of it, and the High value is double it.',
          parts: [
            { kind: 'num', weight: 0.4, ask: 'Write the Low, Medium and High values of the mutation rate.', cols: 3, fields: [{ label: 'Low (1/2N)', ans: v[0], tol: v[0] * 0.03 }, { label: 'Medium (1/N)', ans: v[1], tol: v[1] * 0.03 }, { label: 'High (2/N)', ans: v[2], tol: v[2] * 0.03 }] },
            { kind: 'num', weight: 0.3, ask: 'You will average ' + R + ' runs for each cell of the 3 x 3 grid. How many GA runs does the first sweep need in total?', fields: [{ label: 'Runs', ans: 9 * R, tol: 0.001, dp: 0 }] },
            { kind: 'mcq', weight: 0.3, ask: 'While you run the sweep, what should happen to the other parameters (population, generations, tournament size, crossover points)?', opts: ['They stay fixed at their default values, so any change in performance comes from the two parameters being swept', 'They are changed a little in every run to add variety', 'They are doubled for the High row', 'They are set at random for every run'], a: 0 }
          ],
          reason: ['Low, Medium and High are 1/2N, 1/N and 2/N for the mutation rate.', 'Nine combinations, each averaged over several runs.', 'Everything else is left alone so the comparison is fair.'],
          explain: ['With N = ' + N + ': 1/N = ' + v[1] + ', half is ' + v[0] + ' and double is ' + v[2] + '.', 'The grid has 3 x 3 = 9 cells, and each cell is an average of ' + R + ' runs, so ' + 9 * R + ' runs in total.', 'If you changed other parameters at the same time you could not tell which change caused a difference in performance.'],
          data: { v: v, runs: 9 * R }
        };
      } },

      /* the hidden cost of sweeping population and generations together */
      { id: 'cost', marks: 5, gen: function (r) {
        var P = r.pick([[20, 40, 60], [25, 50, 100], [30, 60, 90]]), G = r.pick([[100, 200, 300], [50, 100, 200], [200, 400, 800]]);
        var lo = P[0] * G[0], md = P[1] * G[1], hi = P[2] * G[2];
        return {
          html: 'A GA is run with a sweep of the <b>population size</b> (' + P.join(', ') + ') against the <b>number of generations</b> (' + G.join(', ') + '). A generational GA evaluates every individual in every generation, so one run costs (population size) x (generations) fitness evaluations. The High / High cell of the grid gives the best average result.',
          parts: [
            { kind: 'num', weight: 0.4, ask: 'How many fitness evaluations does one run use in the Low / Low, Medium / Medium and High / High cells?', cols: 3, fields: [{ label: 'Low / Low', ans: lo, tol: 0.001, dp: 0 }, { label: 'Medium / Medium', ans: md, tol: 0.001, dp: 0 }, { label: 'High / High', ans: hi, tol: 0.001, dp: 0 }] },
            { kind: 'num', weight: 0.2, ask: 'How many times more evaluations does the High / High cell use than the Low / Low cell?', fields: [{ label: 'Ratio', ans: hi / lo, tol: 0.06 }] },
            { kind: 'mcq', weight: 0.4, ask: 'What is the fair conclusion about the High / High result?', opts: ['It may simply reflect a bigger computing budget, so compare settings with a similar number of evaluations before crediting the parameters', 'It proves that larger populations are always better', 'It proves that more generations are always better', 'Nothing can be learned from a sweep'], a: 0 }
          ],
          reason: ['Cost per run is population x generations.', 'A bigger budget alone can improve results, so fair comparisons control for it.'],
          explain: ['Low / Low: ' + P[0] + ' x ' + G[0] + ' = ' + lo + '. Medium / Medium: ' + P[1] + ' x ' + G[1] + ' = ' + md + '. High / High: ' + P[2] + ' x ' + G[2] + ' = ' + hi + ', which is ' + f2(hi / lo, 2) + ' times as many.', 'A better result for the largest settings may simply be the result of more evaluations. To judge the parameters themselves, hold the budget about equal (for example, double the population and halve the generations).'],
          data: { lo: lo, md: md, hi: hi }
        };
      } },

      /* read the table: effects, noise and "noticeably better" */
      { id: 'read-table', marks: 5, gen: function (r) {
        var S = sweep(r, r.pick(PAIRS)), t = S.tab, colM = [0, 1, 2].map(function (j) { return (t[0][j] + t[1][j] + t[2][j]) / 3; }), rowM = [0, 1, 2].map(function (i) { return (t[i][0] + t[i][1] + t[i][2]) / 3; });
        function rng(a) { return Math.max.apply(null, a) - Math.min.apply(null, a); }
        var bigA = rng(colM) > rng(rowM), diff = Math.abs(S.flat[0].v - S.flat[1].v), tt = r.pick([0.6, 0.8, 1.6, 2.2]);
        var sd = Math.max(0.5, Math.round(diff * Math.sqrt(S.runs) / (2 * tt) * 10) / 10), se = sd / Math.sqrt(S.runs), notice = diff > 2 * se;
        return {
          html: intro(S) + 'For the best cell, the standard deviation of the ' + S.runs + ' run results was <b>' + sd + '</b> (the runner-up cell had about the same spread).',
          parts: [
            { kind: 'num', weight: 0.3, ask: 'Find the average result of each column (' + S.A.abbr + ' low, medium, high), taking the mean of its three cells. (1 decimal place)', cols: 3, fields: colM.map(function (v, j) { return { label: S.A.abbr + ' = ' + S.A.vals[j], ans: v, tol: 0.06 }; }) },
            { kind: 'mcq', weight: 0.2, ask: 'Comparing the column averages with the row averages, which parameter shows the larger overall effect on performance?', opts: [S.A.name + ' (' + S.A.abbr + ')', S.B.name + ' (' + S.B.abbr + ')', 'Both have exactly the same effect', 'The table cannot tell you'], a: bigA ? 0 : 1 },
            { kind: 'num', weight: 0.2, ask: 'What is the standard error of the best cell\'s mean (standard deviation divided by the square root of the number of runs)? (2 decimal places)', fields: [{ label: 'Standard error', ans: se, tol: 0.011 }] },
            { kind: 'mcq', weight: 0.3, ask: 'The best cell beats the runner-up by ' + f2(diff, 1) + '. Treating a gap of more than two standard errors as noticeable, is the best cell noticeably better?', opts: ['Yes: the gap is more than two standard errors', 'No: the gap is within about two standard errors, so it could be chance and a repeat might rank them differently', 'Yes, because the best cell is always noticeably better', 'No, because the runner-up has a higher standard deviation'], a: notice ? 0 : 1 }
          ],
          reason: ['Compare how much the averages change along each parameter.', 'Compare the gap between the best two cells with the noise in their averages.'],
          explain: ['The column averages are ' + colM.map(function (v) { return f2(v, 1); }).join(', ') + '; the row averages are ' + rowM.map(function (v) { return f2(v, 1); }).join(', ') + '. The parameter whose averages spread out more has the larger effect' + (bigA ? ' (' + S.A.abbr + ' here).' : ' (' + S.B.abbr + ' here).'),
            'Standard error = ' + sd + ' / sqrt(' + S.runs + ') = ' + f2(se, 3) + ', so two standard errors is ' + f2(2 * se, 2) + '. The gap of ' + f2(diff, 2) + ' is ' + (notice ? 'larger, so the best cell is noticeably better.' : 'smaller, so the best cell is not noticeably better than the runner-up. Rather than trusting it, more runs per cell or a finer grid would help.')],
          data: { colM: colM, rowM: rowM, se: se, notice: notice, bigA: bigA }
        };
      } },

      /* spot the flaw in a student's second round */
      { id: 'critique', marks: 5, gen: function (r) {
        var S = sweep(r, r.pick(PAIRS)), bi = S.bi, bj = S.bj, flaws = ['centre', 'wrong', 'other', 'step', 'single'], f = r.pick(flaws);
        var rA = ref(S.A, bj), rB = ref(S.B, bi), plan;
        var third = [['T', 'tournament size from 3 to 7'], ['P', 'population size from 50 to 100'], ['GEN', 'number of generations from 100 to 200']].filter(function (x) { return x[0] !== S.A.key && x[0] !== S.B.key; })[0][1];
        var sec = S.second;
        if (f === 'centre' && sec.i === bi && sec.j === bj) f = 'wrong';
        if (f === 'centre') { plan = 'centres the new grid on the <b>second-best</b> cell instead: ' + S.A.abbr + ' around ' + S.A.vals[sec.j] + ' and ' + S.B.abbr + ' around ' + S.B.vals[sec.i] + ', with finer steps.'; }
        if (f === 'wrong') { var w = S.worst; plan = 'centres the new grid on ' + cellText(S, w.i, w.j) + ', with finer steps.'; }
        if (f === 'other') plan = 'builds the correct finer grid around the best cell (' + S.A.abbr + ' ' + rA.join(', ') + '; ' + S.B.abbr + ' ' + rB.join(', ') + '), but <b>also changes the ' + third + '</b> for the second round to speed things up.';
        if (f === 'step') {
          var st = S.A.vals[1] - S.A.vals[0], sa = S.A.geo ? [S.A.vals[bj] / 2, S.A.vals[bj], S.A.vals[bj] * 2].map(pre) : [S.A.vals[bj] - st, S.A.vals[bj], S.A.vals[bj] + st].map(r4),
            sb = [S.B.vals[bi] - (S.B.vals[1] - S.B.vals[0]), S.B.vals[bi], S.B.vals[bi] + (S.B.vals[1] - S.B.vals[0])].map(r4);
          if (sa[0] <= 0 || sb[0] <= 0) f = 'single'; else plan = 'centres the new grid on the best cell, but uses the <b>same step sizes as before</b>: ' + S.A.abbr + ' ' + sa.join(', ') + ' and ' + S.B.abbr + ' ' + sb.join(', ') + '.';
        }
        if (f === 'single') plan = 'builds the correct finer grid around the best cell (' + S.A.abbr + ' ' + rA.join(', ') + '; ' + S.B.abbr + ' ' + rB.join(', ') + '), but <b>runs the algorithm only once per cell</b> to save time.';
        var names = { centre: 'The new grid is not centred on the best cell', wrong: 'The table was read the wrong way round for ' + (S.mx ? 'maximisation' : 'minimisation'), other: 'A third parameter was changed at the same time as the two being swept', step: 'The steps were not made finer, so the grid does not zoom in', single: 'One run per cell cannot show the typical performance of a stochastic algorithm' };
        var fixes = { centre: 'Centre the new grid on the best cell of the first sweep', wrong: 'Re-read the table: for ' + (S.mx ? 'maximisation the highest' : 'minimisation the lowest') + ' average is best', other: 'Change only the two swept parameters and keep all others at their defaults', step: 'Use smaller steps around the best values', single: 'Average several runs per cell, as in the first sweep' };
        var ks = [f].concat(r.sample(flaws.filter(function (x) { return x !== f; }), 3));
        var o1 = r.shuffle(ks), o2 = r.shuffle(ks);
        return {
          html: intro(S) + 'For the second round, a student ' + plan,
          parts: [
            { kind: 'mcq', weight: 0.6, ask: 'What is the main flaw in the student\'s second round?', opts: o1.map(function (k) { return names[k]; }), a: o1.indexOf(f) },
            { kind: 'mcq', weight: 0.4, ask: 'What should the student do instead?', opts: o2.map(function (k) { return fixes[k]; }), a: o2.indexOf(f) }
          ],
          reason: ['Compare the plan with the method: best cell becomes the Medium value, finer steps, other parameters fixed, several runs per cell.'],
          explain: [names[f] + '.', 'The method is: find the best cell (reading the table in the right direction), make it the new Medium, use finer steps, change only the two swept parameters, and average several runs per cell. Here the best cell is ' + cellText(S, bi, bj) + '.'],
          data: { flaw: f }
        };
      } },

      /* write: describe the whole procedure */
      { id: 'procedure-write', writeOnly: true, marks: 5, gen: function (r) {
        var P = r.pick([['mutation rate', 'mutation step'], ['population size', 'mutation rate'], ['tournament size', 'mutation rate']]);
        return {
          html: 'Your genetic algorithm has default settings but you suspect they are not ideal. Describe, step by step, how you would carry out a parameter sweep over the <b>' + P[0] + '</b> and the <b>' + P[1] + '</b>, and how you would decide what to do next.',
          parts: [{ kind: 'write', rows: 8, rubric: ['Uses the default values as the Medium values, with one lower (Low) and one higher (High) value for each parameter.', 'Runs all nine combinations in a 3 x 3 grid, leaving every other parameter unchanged.', 'Averages several runs for each cell, because the algorithm is stochastic.', 'Reads the best cell in the correct direction (highest for maximisation, lowest for minimisation).', 'Builds a new, finer grid centred on the best cell (extending beyond an edge if the best was on one).', 'Repeats until improvements become small compared with the run-to-run noise, and keeps a log of what was tried.'] }],
          explain: ['Self-mark against the checklist. The key ideas: grid of nine, others fixed, averaged runs, best cell becomes the centre of a finer grid, and a stopping idea.']
        };
      } }
    ]
  });
})();
