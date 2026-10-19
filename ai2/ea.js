/* World 1-1: Evolution (genetic algorithm lab). Real-valued genes on a 1-D fitness landscape. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var LANDS = {
    smooth: { peaks: [[6.2, 1, 1.5], [2.5, 0.25, 1.2]], rip: 0.02 },
    bumpy: { peaks: [[1.5, 0.55, 0.5], [3.6, 0.8, 0.35], [5.4, 0.45, 0.6], [7.9, 1, 0.2], [9.2, 0.6, 0.4]], rip: 0.03 }
  };

  function build(host) {
    var land = LANDS.bumpy, landName = 'bumpy', seed = 7, rnd, gen = 0, running = false, tw = 1, tweenT = 0.22;
    var pop = [], prev = [], hist = [], gmax = 1, gx = 0, reachedAt = -1;
    function F(x) { var s = 0; land.peaks.forEach(function (p) { var d = x - p[0]; s += p[1] * Math.exp(-d * d / (2 * p[2] * p[2])); }); return s + land.rip * Math.sin(9 * x); }
    function findMax() { gmax = -1; for (var x = 0; x <= 10; x += 0.005) { var v = F(x); if (v > gmax) { gmax = v; gx = x; } } }

    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, 640, 300, 'Fitness landscape with a population of dots climbing towards the peaks');
    var ch = UI.canvas(view, 640, 150, 'Best and average fitness for each generation');
    var out = UI.readout(view);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#6a3df0"></i>an individual</li><li><i style="background:#ffd23c"></i>the best one</li><li><i style="background:#fff;border-style:dashed"></i>highest peak</li>'; view.appendChild(lg);

    ctl.appendChild(el('h3', 'demo-title', 'Evolution lab'));
    UI.note(ctl, 'Each dot is a candidate answer x. Its fitness is the height of the curve. Press Run and watch the population evolve. Then change one setting at a time.');
    var sPop, sTour, sCx, sMr, sMs, tElite;
    sPop = UI.slider(ctl, { label: 'Population size', min: 4, max: 80, value: 20, onInput: reset });
    sTour = UI.slider(ctl, { label: 'Tournament size (selection pressure)', min: 1, max: 8, value: 3 });
    sCx = UI.slider(ctl, { label: 'Crossover rate', min: 0, max: 100, step: 5, value: 70, fmt: function (v) { return v + '%'; } });
    sMr = UI.slider(ctl, { label: 'Mutation rate', min: 0, max: 100, step: 5, value: 30, fmt: function (v) { return v + '%'; } });
    sMs = UI.slider(ctl, { label: 'Mutation step size', min: 0, max: 3, step: 0.05, value: 0.3, fmt: function (v) { return v.toFixed(2); } });
    var row0 = el('div', 'btnrow'); ctl.appendChild(row0);
    tElite = UI.toggle(row0, 'Keep the best (elitism)', true, function () {});
    UI.toggle(row0, 'Bumpy landscape', true, function (v) { land = v ? LANDS.bumpy : LANDS.smooth; landName = v ? 'bumpy' : 'smooth'; findMax(); reset(); });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run', 'btn-sun', function () { running = !running; bRun.textContent = running ? 'Pause' : 'Run'; });
    UI.button(row, 'Step', '', function () { running = false; bRun.textContent = 'Run'; step(); });
    UI.button(row, 'Restart', '', function () { reset(); });
    UI.button(row, 'New random start', '', function () { seed++; reset(); });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Balanced', v: [20, 3, 70, 30, 0.3, true] },
      { t: 'No mutation, tiny population', v: [6, 3, 70, 0, 0.3, true] },
      { t: 'No selection pressure', v: [20, 1, 70, 30, 0.3, true] },
      { t: 'Mutation far too big', v: [20, 3, 70, 100, 3, false] },
      { t: 'Big population', v: [70, 3, 70, 30, 0.3, true] }
    ], function (it) {
      var v = it.v; sPop.set(v[0], true); sTour.set(v[1], true); sCx.set(v[2], true); sMr.set(v[3], true); sMs.set(v[4], true);
      tElite.setAttribute('aria-pressed', String(v[5])); reset(); running = true; bRun.textContent = 'Pause';
    });

    function elite() { return tElite.getAttribute('aria-pressed') === 'true'; }
    function reset() {
      rnd = mulberry(seed * 977 + 13); gen = 0; reachedAt = -1; hist = [];
      pop = []; for (var i = 0; i < sPop.get(); i++) pop.push(rnd() * 10);
      prev = pop.slice(); tw = 1; record(); setOut();
    }
    function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function stats(p) {
      var f = p.map(F), best = 0, sum = 0, i;
      for (i = 0; i < f.length; i++) { if (f[i] > f[best]) best = i; sum += f[i]; }
      var mx = 0; p.forEach(function (x) { mx += x; }); mx /= p.length;
      var sd = 0; p.forEach(function (x) { sd += (x - mx) * (x - mx); }); sd = Math.sqrt(sd / p.length);
      return { best: f[best], bi: best, avg: sum / f.length, sd: sd };
    }
    function record() { var s = stats(pop); hist.push([s.best, s.avg]); if (reachedAt < 0 && s.best > gmax - 0.04) reachedAt = gen; }
    function step() {
      if (gen >= 200) return;
      var n = pop.length, fit = pop.map(F), next = [], k = sTour.get(), cx = sCx.get() / 100, mr = sMr.get() / 100, ms = sMs.get();
      function tourn() { var b = Math.floor(rnd() * n); for (var i = 1; i < k; i++) { var c = Math.floor(rnd() * n); if (fit[c] > fit[b]) b = c; } return pop[b]; }
      if (elite()) next.push(pop[stats(pop).bi]);
      while (next.length < n) {
        var p1 = tourn(), p2 = tourn(), x = p1;
        if (rnd() < cx) x = p1 + (-0.2 + 1.4 * rnd()) * (p2 - p1);
        if (rnd() < mr) x += gauss() * ms;
        next.push(clamp(x, 0, 10));
      }
      prev = pop.slice(); pop = next; gen++; tw = UI.reduce ? 1 : 0; record(); setOut();
    }
    function setOut() {
      var s = stats(pop), msg = 'Generation ' + gen + '. Best ' + s.best.toFixed(2) + ' (highest possible ' + gmax.toFixed(2) + '). Average ' + s.avg.toFixed(2) + '. Spread ' + s.sd.toFixed(2) + '.';
      if (reachedAt >= 0) msg += ' Reached the highest peak at generation ' + reachedAt + '.';
      else if (s.sd < 0.05 && gen > 0) msg += ' The population has collapsed onto one spot. Nothing new is being explored.';
      else if (gen >= 200) msg += ' Stopped at 200 generations.';
      out.textContent = msg;
    }

    var W = 640, H = 300, L = 30, R = 12, T = 18, B = 28;
    function px(x) { return L + (x / 10) * (W - L - R); }
    function py(y) { return H - B - (y / 1.15) * (H - B - T); }
    function draw() {
      var c = cv.getContext('2d'); c.clearRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      c.beginPath(); c.moveTo(px(0), py(0));
      for (var x = 0; x <= 10.001; x += 0.05) c.lineTo(px(x), py(F(x)));
      c.lineTo(px(10), py(0)); c.closePath(); c.fillStyle = '#dff3ff'; c.fill();
      c.beginPath(); for (x = 0; x <= 10.001; x += 0.05) { if (x === 0) c.moveTo(px(x), py(F(x))); else c.lineTo(px(x), py(F(x))); }
      c.lineWidth = 3; c.strokeStyle = '#231a52'; c.stroke();
      c.setLineDash([5, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(px(gx), py(gmax) - 6); c.lineTo(px(gx), py(0)); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif'; c.textAlign = 'center';
      c.fillText('highest peak', px(gx), py(gmax) - 12);
      [0, 5, 10].forEach(function (t) { c.fillText(String(t), px(t), H - 8); });
      c.textAlign = 'left'; c.fillText('x (the gene)', px(0) + 4, H - 8 - 0);
      var e = tw >= 1 ? 1 : tw; e = e * e * (3 - 2 * e);
      var s = stats(pop);
      for (var i = 0; i < pop.length; i++) {
        var p0 = prev[i] != null ? prev[i] : pop[i], xx = p0 + (pop[i] - p0) * e, isBest = i === s.bi;
        c.beginPath(); c.arc(px(xx), py(F(xx)), isBest ? 8 : 6, 0, 6.2832);
        c.fillStyle = isBest ? '#ffd23c' : '#6a3df0'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#231a52'; c.stroke();
      }
      drawChart();
    }
    function drawChart() {
      var c = ch.getContext('2d'), w = 640, h = 150, l = 34, r = 10, t = 10, b = 22, mg = Math.max(50, gen + 1);
      c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      function X(g) { return l + g / mg * (w - l - r); }
      function Y(v) { return h - b - v / 1.15 * (h - b - t); }
      c.strokeStyle = 'rgba(35,26,82,.15)'; c.lineWidth = 1; [0, 0.5, 1].forEach(function (v) { c.beginPath(); c.moveTo(l, Y(v)); c.lineTo(w - r, Y(v)); c.stroke(); });
      c.setLineDash([5, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 2; c.beginPath(); c.moveTo(l, Y(gmax)); c.lineTo(w - r, Y(gmax)); c.stroke(); c.setLineDash([]);
      function line(idx, col) { c.beginPath(); hist.forEach(function (hh, g) { if (g === 0) c.moveTo(X(g), Y(hh[idx])); else c.lineTo(X(g), Y(hh[idx])); }); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
      line(1, '#6a3df0'); line(0, '#e0a100');
      c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif'; c.textAlign = 'left';
      c.fillText('fitness over generations: gold = best, purple = average', l + 4, t + 10);
      c.textAlign = 'center'; c.fillText('generation', w / 2, h - 5);
      c.textAlign = 'right'; c.fillText('0', l - 6, Y(0) + 4); c.fillText('1', l - 6, Y(1) + 4);
    }

    var acc = 0;
    var loop = UI.loop(function (dt) {
      if (tw < 1) tw = Math.min(1, tw + dt / tweenT);
      else if (running) { acc += dt; if (acc > 0.05) { acc = 0; if (gen >= 200) { running = false; bRun.textContent = 'Run'; setOut(); } else step(); } }
      draw();
    });
    findMax(); reset(); draw();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); running = false; bRun.textContent = 'Run'; } };
  }

  AI2.register({
    id: 'ea', n: '1-1', title: 'Evolve', short: 'Genetic algorithms: selection, crossover, mutation', color: '#0b7a5a',
    intro: 'A genetic algorithm searches by breeding. Good answers get more offspring, offspring mix their parents, and random mutation adds surprises. Your job: find out what each setting really does.',
    demos: [{ title: 'Evolution lab', build: build }],
    quiz: [
      { tag: 'mutation', q: 'You switch mutation off and use a tiny population. Every individual ends up on a lower peak and stays there. What is the best explanation?',
        opts: ['The selection pressure was too weak', 'Diversity was lost and nothing creates new variation, so the search converged too early', 'Crossover always makes offspring worse', 'The fitness function changed during the run'], a: 1,
        why: 'Selection and crossover only reshuffle what the population already contains. Without mutation (or enough diversity) nothing new can appear, so the population can get stuck on whichever peak it found first.',
        tip: 'Choose "No mutation, tiny population" and press Run. Watch the spread number fall to nearly zero.' },
      { tag: 'selection', q: 'Tournament size is set to 1. How are parents chosen?',
        opts: ['The fittest individual is always chosen', 'Essentially at random, so there is no selection pressure', 'Only the two least fit are chosen', 'By crossover rate'], a: 1,
        why: 'A tournament of one picks a single random individual and it wins by default. Fitness plays no part, so the population drifts instead of climbing.',
        tip: 'Choose "No selection pressure" and compare the average fitness line with the balanced setting.' },
      { tag: 'exploration vs exploitation', q: 'Mutation rate is 100% and the step size is 3. What do you most likely see?',
        opts: ['Fast, reliable convergence to the highest peak', 'Behaviour close to random search: good solutions are scattered again each generation', 'The population becomes identical', 'Crossover stops working'], a: 1,
        why: 'Huge mutations throw offspring far from their good parents, so progress is destroyed as fast as it is made. Too much exploration with no exploitation looks like random search.',
        tip: 'Choose "Mutation far too big". Then switch elitism on and off and watch the gold line.' },
      { tag: 'crossover', q: 'What does crossover contribute that mutation alone does not?',
        opts: ['It adds random noise independent of the parents', 'It combines information from two parents, so offspring can inherit useful parts of both', 'It guarantees offspring are fitter than the parents', 'It keeps the population size constant'], a: 1,
        why: 'Crossover recombines existing good material. It does not guarantee improvement, but it lets partial solutions found in different individuals meet in one child.',
        tip: 'Set the crossover rate to 0 and compare how quickly the population reaches a peak with 70%.' },
      { tag: 'elitism', q: 'What does elitism do in this lab?',
        opts: ['It removes the worst individual', 'It copies the best individual unchanged into the next generation, so the best fitness never drops', 'It doubles the mutation rate', 'It makes tournaments larger'], a: 1,
        why: 'With elitism the best solution found so far survives. Without it, mutation or crossover can damage the best individual and the best-fitness curve can go down.',
        tip: 'Use a high mutation rate, then turn elitism off and watch the gold line dip.' },
      { tag: 'guarantees', q: 'On the bumpy landscape, a run reaches the highest peak. Does that mean a genetic algorithm is guaranteed to find the global optimum?',
        opts: ['Yes, evolution always finds the best answer', 'No. It is a stochastic search with no guarantee in finite time, so results vary with settings and the random start', 'Yes, but only if elitism is on', 'No, because it can never reach any peak'], a: 1,
        why: 'Genetic algorithms are heuristics. A different random start or setting can end on a lower peak. That is why you repeat runs and report averages, not a single lucky result.',
        tip: 'Press "New random start" several times with the same settings and note how often the highest peak is reached.' }
    ],
    reflect: [
      'In your own words, what is the job of selection, of crossover and of mutation?',
      'Describe one setting that made the algorithm fail. What did you see, and why do you think it happened?',
      'Think of a real problem where a genetic algorithm could help (timetabling, design, route planning). What would the genes be, and what would the fitness be?'
    ],
    more: [
      { h: 'Try next', p: ['Keep the same random start and change one setting at a time. Note how many generations it takes to reach the highest peak.', 'Press "New random start" ten times for two different settings. Count successes. A single run proves very little.'] },
      { h: 'Ideas to remember', p: ['An evolutionary algorithm needs a population, variation (crossover and mutation) and selection.', 'Local peaks versus the global peak. Exploration versus exploitation. Diversity is what lets a search escape.'] },
      { h: 'Beyond this demo', p: ['Other representations: bit strings, permutations (routes), trees (genetic programming).', 'Multi-objective search with several fitness values at once, and evolution strategies that adapt their own mutation size.'] },
      { h: 'Further reading', cls: 'read', p: ['Eiben and Smith, Introduction to Evolutionary Computing, 2nd edition, Springer, 2015.', 'Deb, Pratap, Agarwal and Meyarivan (2002), A fast and elitist multiobjective genetic algorithm: NSGA-II, IEEE Transactions on Evolutionary Computation.'] }
    ]
  });
})();
