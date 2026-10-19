/* World 1-2: Swarm intelligence. Demo A: particle swarm on a 2-D landscape. Demo B: ants choosing between a short and a long path. */
(function () {
  'use strict';
  var UI = AI2.ui, el = UI.el;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* small shared line chart: o = {series:[{data,color}], ymax, ref, title, xmax, xlabel} */
  UI.chart = function (cv, o) {
    var c = cv.getContext('2d'), w = cv.width, h = cv.height, l = 34, r = 10, t = 10, b = 22, mx = Math.max(o.xmax || 50, 2);
    function X(i) { return l + i / (mx - 1) * (w - l - r); }
    function Y(v) { return h - b - v / o.ymax * (h - b - t); }
    c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(35,26,82,.15)'; c.lineWidth = 1;
    [0, 0.5, 1].forEach(function (f) { c.beginPath(); c.moveTo(l, Y(f * o.ymax)); c.lineTo(w - r, Y(f * o.ymax)); c.stroke(); });
    if (o.ref != null) { c.setLineDash([5, 4]); c.strokeStyle = '#231a52'; c.lineWidth = 2; c.beginPath(); c.moveTo(l, Y(o.ref)); c.lineTo(w - r, Y(o.ref)); c.stroke(); c.setLineDash([]); }
    o.series.forEach(function (s) {
      c.beginPath(); s.data.forEach(function (v, i) { if (i === 0) c.moveTo(X(i), Y(v)); else c.lineTo(X(i), Y(v)); });
      c.strokeStyle = s.color; c.lineWidth = 3; c.stroke();
    });
    c.fillStyle = '#231a52'; c.font = '700 12px Nunito,system-ui,sans-serif';
    c.textAlign = 'left'; c.fillText(o.title, l + 4, t + 12);
    c.textAlign = 'center'; c.fillText(o.xlabel || '', w / 2, h - 5);
    c.textAlign = 'right'; c.fillText('0', l - 6, Y(0) + 4); c.fillText(String(o.ymax % 1 ? o.ymax.toFixed(1) : o.ymax), l - 6, Y(o.ymax) + 10);
  };

  /* ================= Demo B: ant colony, two paths ================= */
  function buildAnts(host) {
    var W = 640, H = 300, NEST = [70, 235], FOOD = [570, 235], SPEED = 170;
    var rnd = mulberry(11), running = false, blocked = false, ants = [], tau = [1, 1], choices = [], frac = [], clock = 0, sample = 0, seed = 11;
    var paths = [
      { pts: [NEST, FOOD], name: 'short' },
      { pts: [NEST, [130, 35], [510, 35], FOOD], name: 'long' }
    ];
    paths.forEach(function (p) { p.cum = [0]; for (var i = 1; i < p.pts.length; i++) p.cum.push(p.cum[i - 1] + Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1])); p.len = p.cum[p.cum.length - 1]; });
    function at(p, s) { s = clamp(s, 0, p.len); for (var i = 1; i < p.cum.length; i++) if (s <= p.cum[i]) { var f = (s - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1]), a = p.pts[i - 1], b = p.pts[i]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } return p.pts[p.pts.length - 1]; }

    var grid = el('div', 'dgrid'); host.appendChild(grid);
    var view = el('div', 'dview'), ctl = el('div', 'dctl'); grid.appendChild(view); grid.appendChild(ctl);
    var cv = UI.canvas(view, W, H, 'Ants walking between a nest on the left and food on the right along a short path and a long path');
    var ch = UI.canvas(view, 640, 150, 'Share of recent ant choices that used the short path');
    var out = UI.readout(view);
    var lg = el('ul', 'legend'); lg.innerHTML = '<li><i style="background:#231a52"></i>ant looking for food</li><li><i style="background:#ffd23c"></i>ant carrying food</li><li><i style="background:#6a3df0"></i>pheromone (thicker = more)</li>'; view.appendChild(lg);

    ctl.appendChild(el('h3', 'demo-title', 'Ant colony lab'));
    UI.note(ctl, 'No ant knows which path is shorter. Each one chooses a path in proportion to the pheromone on it, and after a successful trip leaves more pheromone on the path it used. Press Run.');
    var sN = UI.slider(ctl, { label: 'Number of ants', min: 4, max: 60, value: 24, onInput: reset });
    var sRho = UI.slider(ctl, { label: 'Evaporation per second', min: 0, max: 1, step: 0.01, value: 0.15, fmt: function (v) { return v.toFixed(2); } });
    var sA = UI.slider(ctl, { label: 'Pheromone weight (how much ants follow it)', min: 0, max: 4, step: 0.5, value: 2, fmt: function (v) { return v.toFixed(1); } });
    var row = el('div', 'btnrow'); ctl.appendChild(row);
    var bRun = UI.button(row, 'Run', 'btn-sun', function () { running = !running; bRun.textContent = running ? 'Pause' : 'Run'; });
    UI.button(row, 'Restart', '', function () { seed++; reset(); });
    var tBlock = UI.toggle(row, 'Block the short path', false, function (v) { blocked = v; });
    UI.presets(ctl, 'TRY THIS', [
      { t: 'Balanced', v: [24, 0.15, 2] },
      { t: 'Ignore pheromone', v: [24, 0.15, 0] },
      { t: 'Evaporation too fast', v: [24, 0.9, 2] },
      { t: 'Nothing ever evaporates', v: [24, 0, 2] }
    ], function (it) { var v = it.v; sN.set(v[0], true); sRho.set(v[1], true); sA.set(v[2], true); tBlock.setAttribute('aria-pressed', 'false'); blocked = false; reset(); running = true; bRun.textContent = 'Pause'; });

    function reset() {
      rnd = mulberry(seed * 313 + 7); tau = [1, 1]; choices = []; frac = []; clock = 0; sample = 0; ants = [];
      for (var i = 0; i < sN.get(); i++) ants.push({ path: 0, s: 0, dir: 1, wait: rnd() * 4, food: false });
      setOut();
    }
    function choose() {
      var a = sA.get(), p0 = Math.pow(tau[0], a), p1 = Math.pow(tau[1], a), pick = rnd() < p0 / (p0 + p1) ? 0 : 1;
      choices.push(pick === 0 ? 1 : 0); if (choices.length > 30) choices.shift(); return pick;
    }
    function share() { if (!choices.length) return 0.5; var s = 0; choices.forEach(function (c) { s += c; }); return s / choices.length; }
    function setOut() {
      var m = 'Pheromone on short path ' + tau[0].toFixed(1) + ', on long path ' + tau[1].toFixed(1) + '. Last ' + choices.length + ' choices: ' + Math.round(share() * 100) + '% took the short path.';
      if (blocked) m += ' The short path is blocked, so ants that try it turn back without food.';
      out.textContent = m;
    }
    function update(dt) {
      var k = 2 * dt; clock += k;
      var evap = Math.exp(-sRho.get() * k); tau[0] = Math.max(0.4, tau[0] * evap); tau[1] = Math.max(0.4, tau[1] * evap);
      ants.forEach(function (a) {
        if (a.wait > 0) { a.wait -= k; if (a.wait <= 0) { a.path = choose(); a.s = 0; a.dir = 1; a.food = false; } return; }
        var p = paths[a.path];
        a.s += a.dir * SPEED * k;
        if (a.dir === 1) {
          if (blocked && a.path === 0 && a.s >= p.len * 0.5) { a.dir = -1; a.food = false; }
          else if (a.s >= p.len) { a.s = p.len; a.dir = -1; a.food = true; }
        } else if (a.s <= 0) {
          if (a.food) tau[a.path] += 440 / p.len;
          a.path = choose(); a.s = 0; a.dir = 1; a.food = false;
        }
      });
      sample += k; if (sample >= 0.5) { sample = 0; frac.push(share()); if (frac.length > 120) frac.shift(); setOut(); }
    }
    function draw() {
      var c = cv.getContext('2d'); c.clearRect(0, 0, W, H); c.fillStyle = '#e9f7d8'; c.fillRect(0, 0, W, H);
      paths.forEach(function (p, i) {
        c.beginPath(); p.pts.forEach(function (q, k) { if (k === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); });
        c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = '#231a52'; c.lineWidth = 6 + Math.min(14, tau[i] * 0.9); c.stroke();
        c.strokeStyle = '#6a3df0'; c.lineWidth = 2 + Math.min(14, tau[i] * 0.9); c.stroke();
      });
      if (blocked) { c.fillStyle = '#9a6b3a'; c.strokeStyle = '#231a52'; c.lineWidth = 3; c.fillRect(300, 210, 40, 50); c.strokeRect(300, 210, 40, 50); c.fillStyle = '#c99a62'; c.fillRect(306, 216, 12, 10); }
      c.fillStyle = '#c84c0c'; c.strokeStyle = '#231a52'; c.lineWidth = 3; c.fillRect(NEST[0] - 28, NEST[1] - 20, 40, 40); c.strokeRect(NEST[0] - 28, NEST[1] - 20, 40, 40);
      c.fillStyle = '#2fd06a'; c.fillRect(FOOD[0] - 12, FOOD[1] - 20, 40, 40); c.strokeRect(FOOD[0] - 12, FOOD[1] - 20, 40, 40);
      c.fillStyle = '#231a52'; c.font = '700 13px Nunito,system-ui,sans-serif'; c.textAlign = 'center';
      c.fillText('NEST', NEST[0] - 8, NEST[1] + 38); c.fillText('FOOD', FOOD[0] + 8, FOOD[1] + 38);
      c.fillText('short path', 320, 270); c.fillText('long path', 320, 24);
      ants.forEach(function (a) {
        if (a.wait > 0) return; var q = at(paths[a.path], a.s);
        c.fillStyle = a.food ? '#ffd23c' : '#231a52'; c.strokeStyle = '#231a52'; c.lineWidth = 2;
        c.fillRect(q[0] - 5, q[1] - 5, 10, 10); c.strokeRect(q[0] - 5, q[1] - 5, 10, 10);
      });
      UI.chart(ch, { series: [{ data: frac, color: '#6a3df0' }], ymax: 1, ref: 0.5, title: 'share of the last 30 choices that used the short path (dashed = 50%)', xmax: 120, xlabel: 'time' });
    }
    var loop = UI.loop(function (dt) { if (running) update(dt); draw(); });
    reset(); draw();
    return { resume: function () { loop.start(); }, pause: function () { loop.stop(); running = false; bRun.textContent = 'Run'; } };
  }

  AI2.register({
    id: 'swarm', n: '1-2', title: 'Swarm', short: 'Particles and ants: smart groups from simple rules', color: '#6a3df0',
    intro: 'No leader, no map, no plan. Yet a swarm of simple agents can find high ground or the shortest path. Explore two classic swarm methods and find what makes them work, and what breaks them.',
    demos: [{ title: 'Particle swarm', build: function (h) { return window.SWARM.pso(h); } }, { title: 'Flocking: no leader', build: function (h) { return window.SWARM.flock(h); } }, { title: 'Ant colony: two paths', build: buildAnts }, { title: 'Ant colony: TSP', build: function (h) { return window.SWARM.aco(h); } }],
    quiz: [
      { tag: 'social and cognitive pull', q: 'You set own memory pull c1 = 0 and swarm pull c2 = 3. What is the main risk?',
        opts: ['Particles stop moving at once', 'Everyone is pulled to the same point, so the swarm can bunch up on a lower hill too early', 'Each particle searches completely alone', 'Inertia is removed'], a: 1,
        why: 'With only the social pull, all particles rush toward the current best place. If that place is on a lower hill, the swarm loses diversity and rarely escapes.',
        tip: 'Choose "Everyone follows the shared best" and press "New random start" several times.' },
      { tag: 'social and cognitive pull', q: 'You set the swarm pull c2 = 0 and keep c1 at 3. What does the swarm behave like?',
        opts: ['A tightly coordinated group', 'A set of independent searchers that do not share information', 'A single particle', 'A genetic algorithm with crossover'], a: 1,
        why: 'Without the social pull, particles only use their own memory. Information is not shared, so the group advantage disappears.',
        tip: 'Choose "Loners: no sharing" and watch whether the particles ever agree on a place.' },
      { tag: 'inertia', q: 'What does the inertia weight control in particle swarm optimisation?',
        opts: ['The number of particles', 'How much of the previous velocity is kept: high values explore and overshoot, low values settle quickly', 'How strongly particles are pulled to the swarm best', 'The number of steps in a run'], a: 1,
        why: 'Inertia is the momentum term. High inertia keeps particles moving and exploring, and can overshoot or never settle. Low inertia makes the swarm settle quickly and risks stopping early.',
        tip: 'Compare "No inertia" with "Too much inertia" and watch the swarm spread number.' },
      { tag: 'positive feedback', q: 'In the ant demo no ant knows the path lengths, yet the colony usually settles on the short path. Why?',
        opts: ['A lead ant measures both paths', 'Ants on the short path finish trips sooner, so it is reinforced faster, and then more ants choose it', 'Ants prefer straight lines', 'The long path evaporates faster'], a: 1,
        why: 'This is positive feedback. The short path gets pheromone more often per unit time, which attracts more ants, which adds more pheromone. The choice emerges from many small decisions.',
        tip: 'Press Run with the balanced setting and watch the purple line rise. Then set the pheromone weight to 0 and compare.' },
      { tag: 'evaporation', q: 'Evaporation is 0 and the colony has settled on the short path. You block the short path. What happens?',
        opts: ['The colony switches at once', 'Old pheromone never fades, so the colony adapts very slowly', 'All ants stop', 'The long path gains pheromone instantly'], a: 1,
        why: 'Evaporation is the colony\'s forgetting. Without it, outdated information keeps its weight and the colony clings to a path that no longer works.',
        tip: 'Choose "Nothing ever evaporates", wait until the colony settles, then switch on "Block the short path".' },
      { tag: 'emergence', q: 'Which statement about swarm intelligence is correct?',
        opts: ['A leader agent computes the best solution and tells the others', 'Global behaviour emerges from simple local rules and interaction, with no central controller', 'Each agent must know the whole landscape', 'It guarantees the global optimum'], a: 1,
        why: 'Swarm methods rely on many simple agents following local rules and sharing limited information. Good behaviour emerges from interaction. There is no guarantee of the global optimum.',
        tip: 'Watch the ants: each one only reads the pheromone at its own decision point.' }
      ,{ tag: 'the star', q: 'In the particle swarm lab the star marks...', 
        opts: ['The highest ground on the map', 'The best spot any particle has found so far, which may not be the highest ground', 'The leader particle that steers the others', 'The centre of the swarm'], a: 1,
        why: 'The star is only the best spot found so far. If the swarm has gathered on a lower hill, the star sits there. Switch on "Show the highest ground" to see the difference. The star is information the particles share, not a leader.',
        tip: 'Use "Rugged, whole swarm", press Run, then switch on "Show the highest ground".' },
      { tag: 'smooth or rugged', q: 'You run the particle swarm on a smooth landscape (one big hill) and on a very rugged one (many small hills). What should you expect, and why?',
        opts: ['The same result on both, because the swarm is a global method', 'Good results on the smooth one; on the rugged one, particles that move toward each other tend to settle on local peaks and miss the highest ground more often', 'Better results on the rugged one, because there are more hills to find', 'Poor results on both unless there are more than 100 particles'], a: 1,
        why: 'On a smooth landscape, any uphill move leads toward the one peak, so attraction between particles helps. On a rugged one, particles are pulled toward each other and toward the best spot found so far, which is often only a local peak, so the swarm collapses onto it. Use the experiment table to see the numbers.',
        tip: 'In the experiment lab run 40 swarm trials on Smooth, then on Rugged, and compare the percentage that found the highest hill.' },
      { tag: 'neighbourhood', q: 'On the rugged landscape you change from "whole swarm" to "2 fixed friends (non-local)". What is the reasoning for trying this, and what do your experiments show?',
        opts: ['It makes every particle see the global optimum', 'Information spreads more slowly, so groups keep exploring different areas for longer; in our trials the fixed-friends version found the highest hill more often than the whole swarm, but it is not a guarantee', 'It removes the social pull completely', 'It always finds the highest hill'], a: 1,
        why: 'A smaller, fixed set of informers slows the collapse onto one spot. Friends are chosen by label, not by position, so a particle can be linked to a far-away one and a long-distance link can pull it across the map. The 3-nearest version is local on the map and spreads information in a different way; compare all three in the table. Results depend on the random landscape and settings.',
        tip: 'Run 40 trials for each neighbourhood on "Rugged" and read the table.' },
      { tag: 'larger moves', q: 'Why might an evolutionary algorithm with crossover do well on a rugged landscape where interacting particles get stuck?',
        opts: ['Crossover moves are always better than velocity updates', 'Crossover can combine two parents far apart and produce a child far from both, a bigger jump than a particle drifting a little toward its neighbours; whether that helps depends on mutation, selection and population size', 'Genetic algorithms use no population', 'Evolutionary algorithms know where the global optimum is'], a: 1,
        why: 'Particles that attract each other make small, shrinking steps. Crossover between distant parents can place a child anywhere between or beyond them, a larger move. It is not automatically better: with weak mutation or strong selection a GA also converges too early. In our lab the GA scored about the same as the better swarm settings, not better than all of them.',
        tip: 'Compare "Run 40 GA trials (same budget)" with the swarm rows on Rugged.' },
      { tag: 'decentralised', q: 'Which feature makes a method "swarm intelligence" rather than a controlled search?',
        opts: ['One agent computes the best answer and tells the rest', 'Many simple agents act on local information and interact with each other or with their environment, with no central controller', 'Every agent has a complete map of the problem', 'The agents never move'], a: 1,
        why: 'Decentralised control, local interaction, simple agents and emergent group behaviour are the core ideas. In particle swarms the "best so far" is shared information, not a commanding leader; in ants the interaction goes through the environment.',
        tip: 'In the flocking lab, look at the single outlined agent and what it can see.' },
      { tag: 'emergence', q: 'In the flocking lab the order number climbs to nearly 1 although each agent follows only three local rules. Which statement is correct?',
        opts: ['There is a hidden leader whose heading the others copy', 'The coordinated flock is an emergent property: it appears from local interaction and is not written into any single agent', 'The agents have a global picture of the flock', 'It only works when agents can see the whole arena'], a: 1,
        why: 'Each agent reacts only to neighbours inside its small vision circle. Group order is a result of many such local interactions. Try "Very short-sighted": with too little interaction the order does not appear.',
        tip: 'Compare "The full flock" with "No rules at all" and "Very short-sighted".' },
      { tag: 'ant colony: environment', q: 'Ants in ant colony optimisation never send messages to each other. How do they interact?',
        opts: ['By radio with the nearest ant', 'Indirectly, by leaving pheromone on the roads that later ants read when choosing; this is called stigmergy', 'Through a central table of the best tours', 'They do not interact at all'], a: 1,
        why: 'Interaction through the environment is stigmergy. Each ant changes the world (adds pheromone), and later ants respond to the changed world. Evaporation fades old marks.',
        tip: 'In the TSP demo, compare "Ignore pheromone (alpha 0)" with the balanced colony over several new maps. On a small map distance alone can do well, but without pheromone nothing is learned between rounds.' },
      { tag: 'ant colony: building a solution', q: 'In ant colony optimisation for the travelling salesman problem, how is a solution (a tour) created?',
        opts: ['The ant copies the best tour so far', 'The ant starts at a city and builds a tour step by step; at each city it picks one unvisited city at random, with higher probability for roads with more pheromone and shorter distance', 'The ant tries every possible tour', 'The ant swaps two cities in a complete tour'], a: 1,
        why: 'Each ant constructs a whole tour as it moves, using a probabilistic transition rule at every node. After the round, short tours deposit more pheromone on their roads.',
        tip: 'Press "Ant moves one step" repeatedly and read the table: the chosen city is not always the most probable one.' },
      { tag: 'ant colony: transition rule', q: 'An ant stands at a city. Which gives the probability of going next to unvisited city j?',
        opts: ['It goes to the nearest unvisited city, always', 'Proportional to (pheromone on that road)^alpha times (1/distance)^beta, divided by the same quantity summed over all unvisited cities', 'Proportional to the length of the road', 'Equal for all cities, to keep the search random'], a: 1,
        why: 'The numerator multiplies the learned desirability (pheromone) and the local heuristic (short roads look attractive). Dividing by the sum over unvisited cities turns the scores into probabilities. With alpha = 0 the choice depends on distance alone, so nothing is learned; with beta = 0 only pheromone counts.',
        tip: 'Set alpha to 0, then beta to 0, and watch the last column of the table.' },
      { tag: 'ant colony: evaporation', q: 'In the TSP demo, what is the main job of evaporation?',
        opts: ['To make the tours shorter directly', 'To let the colony forget old and poor information, so early mediocre tours do not keep attracting ants forever', 'To reduce the number of ants', 'To make every road equally attractive'], a: 1,
        why: 'Evaporation keeps pheromone from piling up on early choices. With no evaporation a mediocre early tour can dominate. With very fast evaporation there is almost no memory.',
        tip: 'Try "No evaporation" and "Evaporates very fast" on several maps. On this small map the difference can be small; the risk of lock-in grows on harder problems and longer runs.' }
    ],
    reflect: [
      'In particle swarm optimisation, what is the difference between the own memory pull and the swarm pull? Describe a setting where each one dominated.',
      'Use the experiment table. On which landscape did the swarm do well and on which did it do less well? Explain the difference in terms of particles moving toward each other, and say what a non-local neighbourhood or an evolutionary algorithm changes.',
      'Describe the basic principles of swarm intelligence (decentralised control, local interaction, simple agents, emergence), using the flock, the particle swarm and the ants as examples. Where is the "leader" in each?',
      'Describe how an ant builds a tour on the travelling salesman problem. Explain the decision it makes at each city, the roles of pheromone and distance, and how the ants interact through the environment.'
    ],
    more: [
      { h: 'Try next', p: ['Run the swarm trials on Rugged with each neighbourhood. Then change inertia or the number of particles and see whether the ranking changes. No method wins everywhere.', 'In the TSP demo, find settings of alpha, beta and evaporation that reach the best possible tour in the fewest rounds. Then find settings where the colony gets stuck.'] },
      { h: 'Ideas to remember', p: ['Decentralised: no agent controls the others. Local interaction: each agent reacts only to what it can sense. Emergence: group behaviour that no single agent contains.', 'Interaction can be direct (flocking neighbours, particle informers) or through the environment (ant pheromone, called stigmergy).', 'Interacting agents pulled toward one another can all settle on a local peak; a non-local neighbourhood or a method that makes bigger jumps may help, but must be tested.'] },
      { h: 'Beyond this demo', p: ['Ant colony optimisation for other route and scheduling problems, and for network routing.', 'Swarm robotics, bee-inspired algorithms, and how to compare swarm methods fairly across many random seeds.'] },
      { h: 'Further reading', cls: 'read', p: ['Kennedy and Eberhart (1995), Particle swarm optimization, IEEE International Conference on Neural Networks. Shi and Eberhart (1998), A modified particle swarm optimizer, introduces the inertia weight.', 'Reynolds (1987), Flocks, herds and schools: a distributed behavioral model, SIGGRAPH.', 'Deneubourg et al. (1990), The self-organizing exploratory pattern of the Argentine ant, Journal of Insect Behavior. Dorigo and Stutzle (2004), Ant Colony Optimization, MIT Press. Bonabeau, Dorigo and Theraulaz (1999), Swarm Intelligence, Oxford University Press.'] }
    ]
  });
})();
