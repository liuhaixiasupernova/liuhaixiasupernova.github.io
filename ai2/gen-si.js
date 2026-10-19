/* Practice Lab generators: swarm intelligence, reinforcement learning, clustering and search. */
(function () {
  'use strict';
  var PR = window.PRACTICE, f2 = PR.fmt;

  /* ---------- swarm intelligence ---------- */
  var PRINC = ['Positive feedback (success attracts more of the same)', 'Negative feedback (limits, forgetting and balance)', 'Randomness (exploring beyond what is known)', 'Many simple agents using only local information'];
  var SI = [
    ['Foraging ants lay more pheromone on shorter trails, so more ants choose them, which lays even more pheromone.', 0],
    ['A bee that finds a rich flower patch dances for longer, recruiting more bees to that patch.', 0],
    ['Pheromone on a trail evaporates, so a trail that nobody renews fades away.', 1],
    ['When a food source becomes crowded, foragers give up and leave, so the numbers at each source stay balanced.', 1],
    ['Now and then an ant ignores the trail and wanders off, which can uncover a new food source.', 2],
    ['Each particle in a swarm optimiser multiplies its pulls by fresh random numbers at every step.', 2],
    ['Each bird adjusts its heading using only the few flockmates nearest to it.', 3],
    ['Each fish keeps its distance from close neighbours and swims alongside them. No fish knows the direction of the whole school.', 3]
  ];
  var WRITE = [
    { s: 'A rescue charity wants 200 cheap drones to search a forest for missing walkers, with no central controller and no map.', r: ['Says that each drone follows simple local rules and there is no central controller (decentralised, emergent behaviour).', 'Names a swarm mechanism with an example (for example ants and pheromone, birds flocking, or particle swarm).', 'Explains positive feedback (drones that find signs recruit others) and some form of negative feedback or forgetting.', 'Explains the role of randomness or exploration so that unvisited areas are still found.', 'Gives one limitation or risk (for example no guarantee of the best result, loss of diversity, or communication limits).'] },
    { s: 'A delivery company wants to route vans using an ant-colony style algorithm instead of one central planner.', r: ['Explains stigmergy: indirect communication by leaving trails (pheromone) on good routes.', 'Explains positive feedback: shorter routes get more pheromone and attract more vans.', 'Explains evaporation so the system can adapt when roads close.', 'Mentions randomness in route choice to keep exploring.', 'Gives a limitation, for example slow convergence, parameter tuning, or settling too early on a poor route.'] },
    { s: 'Describe how a flock of birds, or a swarm of particles, can find a good place without a leader.', r: ['States that agents follow simple rules and react to their neighbours (local interaction).', 'Describes the rules (for example move towards own best place and towards the best place the group has found, or align, separate and cohere).', 'Explains that global order emerges from these interactions with no leader.', 'Mentions the balance of exploration and exploitation (inertia and random factors).', 'Gives an example or a risk (for example bunching up on a poor place).'] }
  ];
  PR.family({
    id: 'si', label: 'Swarm intelligence', world: 'World 1-2 Swarm', tip: 'World 1-2 Swarm: try the particle swarm on smooth and rugged landscapes with each neighbourhood, watch the flock with one agent outlined, and step an ant through the TSP table.',
    blurb: 'Decentralisation, emergence, particle swarms on smooth and rugged problems, and ant colony tours, in words and in numbers.',
    forms: [
      { id: 'principles', marks: 5, gen: function (r) {
        var items = []; PRINC.forEach(function (p, c) { items.push(r.pick(SI.filter(function (x) { return x[1] === c; }))); });
        items = items.concat(r.sample(SI.filter(function (x) { return items.indexOf(x) < 0; }), 2));
        return { html: 'Match each description to the swarm-intelligence principle it illustrates.', parts: [{ kind: 'match', cats: PRINC, items: r.shuffle(items).map(function (x) { return { t: x[0], c: x[1] }; }) }],
          reason: ['Name each principle and say what it does for the swarm.'], explain: ['Positive feedback amplifies success. Negative feedback (evaporation, crowding) limits and forgets. Randomness keeps the swarm exploring. Local interaction means no agent needs a global view, which is why there is no central controller.'] };
      } },
      { id: 'scenario-write', writeOnly: true, marks: 5, gen: function (r) {
        var w = r.pick(WRITE); return { html: w.s + ' Which swarm-intelligence ideas would make a design like this work? Say what each contributes, ground your answer in a concrete natural or algorithmic example, and point out one weakness.', parts: [{ kind: 'write', rows: 7, rubric: w.r }], explain: ['Mark yourself honestly against the checklist. Strong answers name the principle and tie it to a concrete example, rather than listing words.'] };
      } },
      { id: 'aco', marks: 5, gen: function (r) {
        var ts = r.int(2, 8), tl = r.int(2, 8), al = r.pick([1, 2]), Ls = r.pick([2, 3, 4]), Ll = Ls * 2, Q = r.pick([6, 12]), rho = r.pick([0.1, 0.2, 0.25, 0.5]), ns = r.int(4, 8), nl = 10 - ns;
        var a = Math.pow(ts, al), b = Math.pow(tl, al), p = a / (a + b) * 100, nts = (1 - rho) * ts + ns * Q / Ls, ntl = (1 - rho) * tl + nl * Q / Ll;
        return {
          html: 'In a two-path ant model, an ant picks a path with probability proportional to <b>(pheromone)^' + al + '</b>. The short path (length ' + Ls + ') holds pheromone ' + ts + ' and the long path (length ' + Ll + ') holds ' + tl + '. After ten ants walk (' + ns + ' took the short path, ' + nl + ' the long one), each ant deposits Q / length on its path with Q = ' + Q + ', and a fraction ' + rho + ' of the old pheromone evaporates first.',
          parts: [
            { kind: 'num', weight: 0.3, ask: 'Probability that the next ant picks the short path, before the update.', fields: [{ label: 'P(short)', ans: p, tol: 0.6, unit: '%', dp: 1 }] },
            { kind: 'num', weight: 0.5, ask: 'New pheromone on each path after evaporation and deposits.', cols: 2, fields: [{ label: 'Short path', ans: nts, tol: 0.06 }, { label: 'Long path', ans: ntl, tol: 0.06 }] },
            { kind: 'mcq', weight: 0.2, ask: 'What would a much higher evaporation rate do?', opts: ['The colony forgets quickly, so it adapts fast to change but struggles to build a stable preference', 'The colony becomes stuck on the first path found', 'Nothing, since all pheromone is replaced', 'Ants stop depositing pheromone'], a: 0 }
          ],
          reason: ['Probability = short^alpha / (short^alpha + long^alpha).', 'New pheromone = (1 - evaporation) x old + number of ants x Q / length.'],
          explain: ['P(short) = ' + ts + '^' + al + ' / (' + ts + '^' + al + ' + ' + tl + '^' + al + ') = ' + a + ' / ' + (a + b) + ' = ' + f2(p, 1) + '%.', 'Short: (1 - ' + rho + ') x ' + ts + ' + ' + ns + ' x ' + Q + '/' + Ls + ' = ' + f2(nts, 2) + '. Long: (1 - ' + rho + ') x ' + tl + ' + ' + nl + ' x ' + Q + '/' + Ll + ' = ' + f2(ntl, 2) + '.'],
          data: { p: p, nts: nts, ntl: ntl }
        };
      } },
      { id: 'pso', marks: 5, gen: function (r) {
        var x = r.int(1, 9), v = r.int(-2, 2), pb = r.int(0, 10), gb = r.int(0, 10), w = r.pick([0.5, 0.7, 0.9]), c1 = r.pick([1, 1.5, 2]), c2 = r.pick([1, 1.5, 2]), r1 = r.pick([0.2, 0.4, 0.6, 0.8]), r2 = r.pick([0.2, 0.4, 0.6, 0.8]);
        var vn = w * v + c1 * r1 * (pb - x) + c2 * r2 * (gb - x), xn = x + vn;
        return {
          html: 'A particle in a one-dimensional particle swarm has position x = ' + x + ' and velocity v = ' + v + '. Its own best position is ' + pb + ' and the best position known to it from the swarm is ' + gb + '. Settings: inertia w = ' + w + ', c1 = ' + c1 + ', c2 = ' + c2 + ', and the random numbers this step are r1 = ' + r1 + ' and r2 = ' + r2 + '. Use v_new = w v + c1 r1 (own best - x) + c2 r2 (swarm best - x), then x_new = x + v_new.',
          parts: [
            { kind: 'num', weight: 0.6, ask: 'Calculate the new velocity and position.', cols: 2, fields: [{ label: 'v_new', ans: vn, tol: 0.011 }, { label: 'x_new', ans: xn, tol: 0.011 }] },
            { kind: 'mcq', weight: 0.4, ask: 'You raise the inertia weight w from ' + w + ' to 1.2. What is the most likely effect on the swarm?', opts: ['Particles keep moving and overshoot, so the swarm explores more but may fail to settle', 'The swarm converges faster', 'Particles stop remembering their own best', 'Nothing changes'], a: 0 }
          ],
          reason: ['Inertia keeps part of the old velocity, the own-best term pulls back to the particle\'s memory, the swarm-best term pulls towards shared knowledge.'],
          explain: ['v_new = ' + w + ' x ' + v + ' + ' + c1 + ' x ' + r1 + ' x (' + pb + ' - ' + x + ') + ' + c2 + ' x ' + r2 + ' x (' + gb + ' - ' + x + ') = ' + f2(vn, 3) + '. Then x_new = ' + x + ' + ' + f2(vn, 3) + ' = ' + f2(xn, 3) + '.'],
          data: { vn: vn, xn: xn }
        };
      } }
      ,{ id: 'tsp-step', marks: 6, gen: function (r) {
        var L = r.sample(['A', 'B', 'C', 'D', 'E', 'F'], 6), cur = L[0], seen = L.slice(1, 3), cand = L.slice(3), al = r.pick([1, 2]), be = r.pick([1, 2]);
        var d = [], tu = [], w = [], i, ok = false, tries = 0, tot, p;
        while (!ok && tries++ < 200) {
          d = cand.map(function () { return r.int(2, 9); }); tu = cand.map(function () { return r.int(1, 6); });
          w = cand.map(function (c, k) { return Math.pow(tu[k], al) / Math.pow(d[k], be); }); tot = w.reduce(function (a, b) { return a + b; }, 0); p = w.map(function (x) { return x / tot * 100; });
          var s = p.slice().sort(function (a, b) { return b - a; }); ok = s[0] - s[1] > 4;
        }
        var best = p.indexOf(Math.max.apply(null, p));
        var rows = cand.map(function (c, k) { return '<tr><td>' + c + '</td><td>' + d[k] + '</td><td>' + tu[k] + '</td></tr>'; }).join('');
        return {
          html: 'An ant is building a tour of six cities (A to F). It is now at city <b>' + cur + '</b> and has already visited <b>' + seen.join(' and ') + '</b>. It chooses the next city with probability proportional to <b>(pheromone)<sup>' + al + '</sup> x (1/distance)<sup>' + be + '</sup></b>, among the cities it has not visited.<div class="scroll-x"><table class="tbl"><thead><tr><th>Candidate city</th><th>Distance from ' + cur + '</th><th>Pheromone on the road</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
          parts: [
            { kind: 'num', weight: 0.55, ask: 'Probability of choosing each candidate city.', cols: 3, fields: cand.map(function (c, k) { return { label: 'P(' + c + ')', ans: p[k], tol: 0.6, unit: '%', dp: 1 }; }) },
            { kind: 'mcq', weight: 0.2, ask: 'Which statement about this choice is correct?', opts: ['City ' + cand[best] + ' is the most likely next city, but the ant might still choose another one', 'The ant will certainly go to city ' + cand[best], 'The ant is equally likely to choose any candidate', 'The ant can choose ' + seen[0] + ' again because it has the most pheromone'], a: 0 },
            { kind: 'mcq', weight: 0.25, ask: 'Setting beta to 0 (and keeping alpha) would change the rule so that...', opts: ['Only pheromone matters: distance is ignored in the choice', 'Only distance matters: pheromone is ignored in the choice', 'The ant picks a city at random from all six', 'The ant stops building the tour'], a: 0 }
          ],
          reason: ['Score of each candidate = pheromone^alpha x (1/distance)^beta. Probability = its score divided by the sum of the three scores. Visited cities are not candidates.'],
          explain: ['Scores: ' + cand.map(function (c, k) { return c + ' = ' + tu[k] + '^' + al + ' x (1/' + d[k] + ')^' + be + ' = ' + f2(w[k], 4); }).join('; ') + '. Sum = ' + f2(tot, 4) + '.', 'Probabilities: ' + cand.map(function (c, k) { return c + ' ' + f2(p[k], 1) + '%'; }).join(', ') + '. The choice is random but biased: it is a roulette wheel, not a rule.'],
          data: { p: p }
        };
      } },
      { id: 'rugged-think', marks: 5, gen: function (r) {
        var rug = r.chance(0.5), n = r.pick([20, 30, 40]);
        var land = rug ? 'a very rugged landscape with many narrow hills of similar height' : 'a smooth landscape with one broad hill';
        var good = rug ? 'Less well: particles that are pulled towards each other tend to settle on a local peak, and the best spot found so far is often only a modest hill' : 'Well: any uphill move leads toward the one peak, so attraction between particles helps';
        return {
          html: 'A swarm of ' + n + ' particles, every particle seeing the best spot found so far by the whole swarm, searches ' + land + '.',
          parts: [
            { kind: 'mcq', weight: 0.4, ask: 'What do you expect, and why?', opts: [good, rug ? 'Well: more hills means more chances for every particle to be on the highest one' : 'Less well: attraction between particles always traps them on a smooth landscape', 'The same result on every landscape because the swarm is a global method', 'It depends only on the number of particles, never on the landscape'], a: 0 },
            { kind: 'multi', weight: 0.6, ask: rug ? 'Which changes are reasonable to try on the rugged problem? Pick all that apply.' : 'Which of these statements about the neighbourhood are correct? Pick all that apply.', opts: rug
              ? ['Let each particle see only a few fixed friends instead of the whole swarm (a non-local neighbourhood)', 'Use an evolutionary algorithm in which crossover can produce larger moves', 'Restart from several different random starting positions', 'Make every particle follow the single best spot more strongly', 'Reduce the swarm to five particles']
              : ['On a smooth problem a global neighbourhood is usually fine', 'Whole-swarm sharing speeds up convergence when there is one peak', 'On a smooth problem the swarm needs a very small neighbourhood to succeed', 'Interaction between particles is harmful when there is one peak'], a: rug ? [0, 1, 2] : [0, 1] }
          ],
          reason: ['Think about what interacting particles do: they move toward each other and toward the best spot so far. Is that helpful when there is one peak? When there are many?'],
          explain: ['Interaction helps on a smooth problem and risks early collapse onto a local peak on a rugged one. Changes that keep different groups apart longer (fixed friends) or that make larger moves (crossover) or that add independent starts keep exploration alive. None of them guarantees the best answer, so test them over many runs. Pulling harder to the shared best, or shrinking the swarm, makes things worse.'],
          data: { rug: rug }
        };
      } },
      { id: 'match-si2', marks: 5, gen: function (r) {
        var cats = ['Decentralised control', 'Local interaction', 'Emergence', 'Interaction through the environment (stigmergy)'];
        var pool = [
          ['No bird in the flock gives orders. Each one follows the same simple rules.', 0], ['The ant colony has no queen planning the routes.', 0], ['Nothing in the particle update rule tells the swarm where the best place is: each particle only follows its pulls.', 0],
          ['A fish reacts only to the few fish closest to it.', 1], ['A particle uses only the best spot found by its two friends.', 1], ['An ant picks the next city using only the roads leaving its current city.', 1],
          ['A tidy, moving flock appears although no bird has a picture of the whole flock.', 2], ['A short tour is found by the colony although no ant planned it.', 2], ['Termites build a complex nest although no termite has the plan.', 2],
          ['Ants never signal each other directly: later ants respond to the pheromone earlier ants left.', 3], ['An ant lays pheromone on a road, and the next ant\'s choice is shaped by it.', 3], ['Pheromone evaporates, so the shared memory in the environment fades.', 3]
        ];
        var items = []; cats.forEach(function (c, k) { items.push(r.pick(pool.filter(function (x) { return x[1] === k; }))); });
        items = items.concat(r.sample(pool.filter(function (x) { return items.indexOf(x) < 0; }), 2));
        return { html: 'Match each statement to the swarm-intelligence idea it best illustrates.', parts: [{ kind: 'match', cats: cats, items: r.shuffle(items).map(function (x) { return { t: x[0], c: x[1] }; }) }],
          reason: ['Ask: who is in control, what does one agent sense, what appears at the group level, and does the interaction go through the world?'], explain: ['Decentralised: no controller. Local: each agent senses only nearby things. Emergence: group-level behaviour that no single agent holds. Stigmergy: indirect communication through changes in the environment, such as pheromone.'] };
      } },
      { id: 'aco-write', writeOnly: true, marks: 6, gen: function (r) {
        var pr = r.pick(['a travelling salesman problem with 12 cities', 'a delivery round of 15 addresses, where the shortest route is wanted', 'a drilling machine that must visit 20 holes on a circuit board in the shortest time']);
        return { html: 'A team plans to solve ' + pr + ' with an ant-colony algorithm. Explain to a new colleague how the method would work: what the ants do, how they influence one another, how each complete solution comes about, and what rule an ant follows when it reaches a point in the graph.', parts: [{ kind: 'write', rows: 8, rubric: [
            'Represents the problem as a graph: cities or addresses are nodes and roads are edges with lengths.',
            'States that each ant builds a complete tour step by step, moving from node to node and never revisiting one.',
            'Describes the transition decision at a node: a random choice among unvisited nodes with probability proportional to pheromone (to a power alpha) times 1/distance (to a power beta).',
            'Explains interaction through the environment (stigmergy): ants deposit pheromone on the edges of their tour, more for shorter tours, and later ants read it. There is no direct communication.',
            'Explains evaporation and positive feedback, and says what they do (forgetting, avoiding early lock-in, reinforcing good edges).',
            'Mentions a limitation or a tuning issue, for example no guarantee of the best tour, or sensitivity to alpha, beta and the evaporation rate.'] }], explain: ['Mark yourself against each point. A strong answer says how the tour is built (probabilistic choice at each node), what information the ant uses (pheromone and distance), and how the colony improves (pheromone deposited on short tours, evaporation of old marks).'] };
      } },
      { id: 'si-decentral-write', writeOnly: true, marks: 5, gen: function (r) {
        var ex = r.pick(['a flock of starlings', 'a swarm of particles searching for the highest point of a landscape', 'a colony of ants searching for food']);
        return { html: 'Using ' + ex + ' as your example, explain what is meant by <i>decentralised control</i>, <i>local interaction</i> and <i>emergence</i>. Be honest about any shared information: is there anything in your example that acts like a leader?', parts: [{ kind: 'write', rows: 7, rubric: [
            'Defines decentralised control: no single agent or controller plans or commands the group.',
            'Defines local interaction: each agent senses and reacts to only a small neighbourhood or only its immediate surroundings.',
            'Defines emergence: group-level behaviour that is not coded into any single agent but arises from the interactions.',
            'Applies all three ideas to the chosen example with specific details (the rules, what is sensed, what appears).',
            'Discusses shared information honestly: for example the best position so far, or pheromone on a trail, is shared information, not a commanding leader.'] }], explain: ['A shared "best so far" or a pheromone trail is information that agents read. It does not issue commands, and it need not be the true best. That is the difference between shared information and a leader.'] };
      } }
    ]
  });

  /* ---------- reinforcement learning ---------- */
  var RL = [
    { s: 'A robot vacuum cleaner', st: 'The robot\'s position in the house and its battery level', ac: 'Move forward, turn left, turn right, or go to the charger', re: '+1 for each tile cleaned and -10 for hitting furniture', va: 'The total cleaning reward the robot expects to collect from now on, starting from the kitchen with 30% battery', po: 'The rule: if the battery is below 20% go to the charger, otherwise clean the nearest dirty tile' },
    { s: 'A program learning to play a board game', st: 'The arrangement of all pieces on the board', ac: 'The legal moves available to the player', re: '+1 for a win, -1 for a loss and 0 for every other move', va: 'The chance of eventually winning from the current board position', po: 'The strategy that chooses a move for every board position' },
    { s: 'A smart thermostat', st: 'The current room temperature, the time of day and whether anyone is home', ac: 'Heating on, heating off, or set a new target temperature', re: 'A score that rewards comfort and penalises energy use at each step', va: 'The comfort-minus-cost total the thermostat expects over the rest of the day from the current situation', po: 'The mapping from temperature, time and occupancy to a heating decision' },
    { s: 'An adaptive tutoring app', st: 'The student\'s recent quiz results and topics covered', ac: 'Which exercise to give next', re: '+1 when the student\'s next quiz score improves', va: 'The expected long-term learning gain from the student\'s current progress', po: 'The strategy that maps a student\'s progress to the next exercise' }
  ];
  var RT = ['State', 'Action', 'Reward function', 'Value function', 'Policy'];
  PR.family({
    id: 'rl', label: 'Reinforcement learning', world: 'a concept to revise in your lecture notes', tip: 'State = what the agent sees. Action = what it can do. Reward = immediate feedback. Value = long-term expected reward. Policy = the rule for choosing actions.',
    blurb: 'Terms, discounted returns and the Q-learning update.',
    forms: [
      { id: 'terms', marks: 5, gen: function (r) {
        var s = r.pick(RL), keys = ['st', 'ac', 're', 'va', 'po'];
        return { html: 'Consider <b>' + s.s.toLowerCase() + '</b> as a reinforcement learning agent. Match each statement to the term it describes.', parts: [{ kind: 'match', cats: RT, items: r.shuffle(keys.map(function (k, i) { return { t: s[k], c: i }; })) }],
          reason: ['Say what each term means and how it relates to the others.'], explain: ['A state describes the situation, an action is a choice the agent can make, the reward function gives immediate feedback, the value function estimates long-term reward, and the policy is the rule that chooses actions.'] };
      } },
      { id: 'return', marks: 5, gen: function (r) {
        var rw = [r.int(-2, 5), r.int(-2, 5), r.int(-2, 5), r.int(0, 10)], g = r.pick([0.5, 0.8, 0.9]), G = rw[0] + g * rw[1] + g * g * rw[2] + g * g * g * rw[3];
        return {
          html: 'An agent receives the rewards <b>' + rw.join(', ') + '</b> on four consecutive steps, then the episode ends. The discount factor is gamma = ' + g + '. The return from the first step is r1 + gamma r2 + gamma^2 r3 + gamma^3 r4.',
          parts: [
            { kind: 'num', weight: 0.6, ask: 'Calculate the discounted return from the first step.', fields: [{ label: 'Return', ans: G, tol: 0.011 }] },
            { kind: 'mcq', weight: 0.4, ask: 'What happens as gamma gets close to 0?', opts: ['The agent becomes short-sighted and cares mostly about immediate rewards', 'The agent cares equally about all future rewards', 'The agent stops learning', 'Rewards become negative'], a: 0 }
          ],
          reason: ['Each later reward is multiplied by another factor of gamma, so it counts for less.'],
          explain: ['G = ' + rw[0] + ' + ' + g + ' x ' + rw[1] + ' + ' + f2(g * g, 3) + ' x ' + rw[2] + ' + ' + f2(g * g * g, 3) + ' x ' + rw[3] + ' = ' + f2(G, 3) + '.'],
          data: { G: G }
        };
      } },
      { id: 'qupdate', marks: 5, gen: function (r) {
        var q = r.int(0, 8), rw = r.int(-3, 6), al = r.pick([0.1, 0.25, 0.5]), g = r.pick([0.8, 0.9]), mq = r.int(0, 10), qn = q + al * (rw + g * mq - q);
        return {
          html: 'A Q-learning agent takes action a in state s and gets reward r = ' + rw + ', landing in state s\'. Before the update Q(s, a) = ' + q + ', and the best action value in s\' is max Q(s\', .) = ' + mq + '. Learning rate alpha = ' + al + ', discount gamma = ' + g + '. The update is Q(s, a) <- Q(s, a) + alpha (r + gamma max Q(s\', .) - Q(s, a)).',
          parts: [
            { kind: 'num', weight: 0.6, ask: 'What is the new Q(s, a)?', fields: [{ label: 'New Q', ans: qn, tol: 0.011 }] },
            { kind: 'mcq', weight: 0.4, ask: 'What does the learning rate alpha control?', opts: ['How far each new experience moves the estimate from its old value', 'How much the future is valued', 'How often the agent explores', 'The number of states'], a: 0 }
          ],
          reason: ['The target is r + gamma max Q; alpha says how far to move towards it.'],
          explain: ['Target = ' + rw + ' + ' + g + ' x ' + mq + ' = ' + f2(rw + g * mq, 2) + '. Error = ' + f2(rw + g * mq - q, 2) + '. New Q = ' + q + ' + ' + al + ' x ' + f2(rw + g * mq - q, 2) + ' = ' + f2(qn, 3) + '.'],
          data: { qn: qn }
        };
      } },
      { id: 'explore-write', writeOnly: true, marks: 5, gen: function (r) {
        return { html: 'A robot learns to find the shortest path through a maze using reinforcement learning. Explain the difference between exploration and exploitation, and say what could go wrong if the robot only exploits.', parts: [{ kind: 'write', rows: 6, rubric: ['Exploitation: choosing the action that currently looks best.', 'Exploration: trying other actions to gather information.', 'Why both are needed: estimates start poor and may be wrong.', 'Risk of only exploiting: getting stuck with a poor route and never finding a better one.', 'Mentions a way to balance them, such as epsilon-greedy or reducing exploration over time.'] }], explain: ['Look for the pairing of the two ideas with the risk and a way to balance them.'] };
      } }
    ]
  });

  /* ---------- clustering ---------- */
  PR.family({
    id: 'km', label: 'Clustering', world: 'a concept to revise in your lecture notes', tip: 'Repeat two steps: assign every point to its nearest centroid, then move each centroid to the mean of its points.',
    blurb: 'Run a K-means iteration by hand.',
    forms: [
      { id: 'step', marks: 5, gen: function (r) {
        var K = r.pick([2, 3]), pts = [], t = 0, ok = false, cen, as;
        while (!ok && t++ < 100) {
          cen = []; for (var k = 0; k < K; k++) cen.push([r.int(0, 10), r.int(0, 10)]);
          pts = []; for (var i = 0; i < 7; i++) pts.push([r.int(0, 10), r.int(0, 10)]);
          as = pts.map(function (p) { var d = cen.map(function (c) { return Math.hypot(p[0] - c[0], p[1] - c[1]); }), s = d.slice().sort(function (a, b) { return a - b; }); return { c: d.indexOf(s[0]), margin: s[1] - s[0] }; });
          ok = as.every(function (a) { return a.margin > 0.3; }) && as.every(function (a, i) { return true; });
          for (k = 0; k < K && ok; k++) if (!as.some(function (a) { return a.c === k; })) ok = false;
        }
        var nc = cen.map(function (c, k) { var m = pts.filter(function (p, i) { return as[i].c === k; }); return [m.reduce(function (s, p) { return s + p[0]; }, 0) / m.length, m.reduce(function (s, p) { return s + p[1]; }, 0) / m.length]; });
        var fields = []; nc.forEach(function (c, k) { fields.push({ label: 'Centroid ' + (k + 1) + ' x', ans: c[0], tol: 0.06 }); fields.push({ label: 'Centroid ' + (k + 1) + ' y', ans: c[1], tol: 0.06 }); });
        var names = cen.map(function (c, k) { return 'C' + (k + 1) + ' = (' + c[0] + ', ' + c[1] + ')'; }).join(', ');
        return {
          html: 'K-means with K = ' + K + ' starts with centroids ' + names + '. The data points are: ' + pts.map(function (p, i) { return 'P' + (i + 1) + ' (' + p[0] + ', ' + p[1] + ')'; }).join(', ') + '. Use straight-line distance.',
          fig: function (h) { var c = document.createElement('canvas'); c.width = 330; c.height = 300; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Scatter plot of the data points and centroids'); h.appendChild(c); var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 330, 300); g.strokeStyle = 'rgba(35,26,82,.15)'; g.font = '700 11px Nunito,sans-serif'; g.fillStyle = '#231a52'; for (var v = 0; v <= 10; v += 2) { g.beginPath(); g.moveTo(30 + v * 28, 10); g.lineTo(30 + v * 28, 270); g.stroke(); g.beginPath(); g.moveTo(30, 270 - v * 26); g.lineTo(310, 270 - v * 26); g.stroke(); g.fillText(v, 26 + v * 28, 288); g.fillText(v, 10, 274 - v * 26); } pts.forEach(function (p, i) { g.beginPath(); g.arc(30 + p[0] * 28, 270 - p[1] * 26, 5, 0, 6.3); g.fillStyle = '#6a3df0'; g.fill(); g.fillStyle = '#231a52'; g.fillText('P' + (i + 1), 36 + p[0] * 28, 264 - p[1] * 26); }); cen.forEach(function (p, k) { g.fillStyle = '#e8365d'; g.fillRect(25 + p[0] * 28, 265 - p[1] * 26, 10, 10); g.fillStyle = '#e8365d'; g.fillText('C' + (k + 1), 38 + p[0] * 28, 280 - p[1] * 26); }); },
          parts: [
            { kind: 'match', weight: 0.5, ask: 'Assign each point to its nearest centroid.', cats: cen.map(function (c, k) { return 'Cluster ' + (k + 1) + ' (C' + (k + 1) + ')'; }), items: pts.map(function (p, i) { return { t: 'P' + (i + 1) + ' (' + p[0] + ', ' + p[1] + ')', c: as[i].c }; }) },
            { kind: 'num', weight: 0.4, ask: 'Where does each centroid move after this iteration? (2 decimal places)', cols: 2, fields: fields },
            { kind: 'mcq', weight: 0.1, ask: 'When does the algorithm stop?', opts: ['When the assignments no longer change (or a maximum number of iterations is reached)', 'After exactly one iteration', 'When all points are in one cluster', 'When the centroids reach (0, 0)'], a: 0 }
          ],
          reason: ['Assignment step: nearest centroid for each point.', 'Update step: each centroid becomes the mean of its assigned points.', 'Repeat until nothing changes.'],
          explain: ['Compute the distance from every point to every centroid and pick the nearest. Then each new centroid is the average x and the average y of its points.'],
          data: { cen: cen, pts: pts, as: as.map(function (a) { return a.c; }), nc: nc }
        };
      } },
      { id: 'concept', marks: 5, gen: function (r) {
        return {
          html: 'Think about the K-means algorithm.',
          parts: [
            { kind: 'multi', weight: 0.7, ask: 'Which statements are true?', opts: ['The number of clusters K must be chosen before running', 'Different starting centroids can lead to different final clusters', 'It needs class labels for the training data', 'Each iteration alternates between assigning points and updating centroids', 'It always finds the globally best clustering'], a: [0, 1, 3] },
            { kind: 'mcq', weight: 0.3, ask: 'Which kind of learning does K-means belong to?', opts: ['Unsupervised learning', 'Supervised learning', 'Reinforcement learning', 'None of these'], a: 0 }
          ],
          reason: ['K-means needs K in advance and can settle in a local optimum depending on the start.'],
          explain: ['K-means is unsupervised, so it needs no labels. It must be given K, it alternates assignment and update steps, and it only finds a local optimum, so different initial centroids can give different clusters.']
        };
      } }
    ]
  });

  /* ---------- search ---------- */
  PR.family({
    id: 'hc', label: 'Search and hill climbing', world: 'World 1-1 Evolve (a population-based alternative)', tip: 'Compare with the genetic algorithm: a hill climber has no population and can only accept improvements.',
    blurb: 'Steps of a hill climber and a worked trace.',
    forms: [
      { id: 'steps', marks: 5, gen: function (r) {
        var items = ['Start from a random solution and evaluate it', 'Make a small random change to a copy of the current solution', 'Evaluate the changed copy', 'Keep the changed copy only if it is at least as good as the current solution', 'Repeat until the budget is used up or progress stops', 'Return the best solution found'];
        return { html: 'A simple stochastic hill climber maximises a score. Arrange the steps of one complete run in the order they happen.', parts: [
          { kind: 'order', weight: 0.7, items: items },
          { kind: 'mcq', weight: 0.3, ask: 'What is the main weakness of a plain hill climber?', opts: ['It can get stuck on a local optimum, because it never accepts a worse solution', 'It needs a large population', 'It cannot evaluate solutions', 'It always finds the global optimum'], a: 0 }
        ], reason: ['Say how restarts or accepting occasional worse moves help escape a local optimum.'], explain: ['Start, perturb, evaluate, accept if not worse, repeat, return the best. Because it only ever moves uphill, it cannot leave a local peak.'] };
      } },
      { id: 'trace', marks: 5, gen: function (r) {
        var f = []; for (var i = 0; i < 10; i++) f.push(r.int(1, 20));
        var x = r.int(2, 7), moves = [], cur = x, acc = 0, hist = [x];
        for (i = 0; i < 6; i++) { var d = r.chance(0.5) ? 1 : -1; if (cur + d < 0 || cur + d > 9) d = -d; var nx = cur + d; moves.push(d); if (f[nx] >= f[cur]) { cur = nx; acc++; } hist.push(cur); }
        var gl = f.indexOf(Math.max.apply(null, f));
        return {
          html: 'A hill climber maximises the score f(x) for x = 0 to 9:<table class="tbl"><thead><tr><th>x</th>' + f.map(function (v, k) { return '<th>' + k + '</th>'; }).join('') + '</tr></thead><tbody><tr><td class="n">f(x)</td>' + f.map(function (v) { return '<td class="n">' + v + '</td>'; }).join('') + '</tr></tbody></table>It starts at x = ' + x + '. Each step proposes the move shown (+1 or -1) and accepts it if the new score is at least as good. The proposed moves are: ' + moves.map(function (m) { return m > 0 ? '+1' : '-1'; }).join(', ') + '.',
          parts: [
            { kind: 'num', weight: 0.6, ask: 'Where is the climber after the six moves, and how many moves were accepted?', cols: 2, fields: [{ label: 'Final x', ans: cur, tol: 0.001, dp: 0 }, { label: 'Moves accepted', ans: acc, tol: 0.001, dp: 0 }] },
            { kind: 'mcq', weight: 0.4, ask: 'Is the final position the global maximum (x = ' + gl + ')?', opts: ['Yes', 'No: it is at a different position, so the climber has not found the best solution', 'It is impossible to say'], a: cur === gl ? 0 : 1 }
          ],
          reason: ['Follow each move: accept it if the new score is at least the current score.'],
          explain: ['Position after each of the six moves: ' + hist.join(' to ') + '.' + (cur === gl ? ' The climber ends at the global maximum.' : ' The global maximum is at x = ' + gl + ' (score ' + f[gl] + '), so the climber is not there.')],
          data: { f: f, x0: x, moves: moves, cur: cur, acc: acc }
        };
      } }
    ]
  });
})();
