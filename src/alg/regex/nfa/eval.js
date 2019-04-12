import {nfaToGrafvizBody} from './nfaToGrafviz';

export class NFAEval {
  states;
  nextStates;
  nfa;
  lookaroundEvals;

  constructor(nfa) {
    this.states = new Set();
    this.nextStates = new Set();
    this.nfa = nfa;

    this.lookaroundEvals = new Map();
    for (const [s, laNFA] of nfa.lookaroundNFAs) {
      let lookbehind = false;
      let negative = false;
      if (laNFA['?'].startsWith('?<'))
        lookbehind = true;
      if (laNFA['?'].endsWith('!'))
        negative = true;

      this.lookaroundEvals.set(s, {
        lookbehind, negative,
        nfaEval: new NFAEval(laNFA.nfa)
      });
    }

    this.takeArrow({'?': '&', f: 0, x: null});
    this.swapStates();
  }

  done() {
    return this.states.has(1);
  }
  dead() {
    return this.states.size === 0;
  }

  restart() {
    this.states.clear();
    this.nextStates.clear();

    for (const [,e] of this.lookaroundEvals)
      e.nfaEval.restart();

    this.takeArrow({'?': '&', f: 0, x: null});
  }

  takeArrow(a0) {
    const q = [];
    q.push(a0);

    while (q.length > 0) {
      const x = q.pop();

      const lookbehind = this.lookaroundEvals.get(x.f);
      if (lookbehind != null && lookbehind.lookbehind) {
        // console.log(`found lookbehind for ${x.f}`);
        // console.log(Array.from(lookbehind.nfaEval.states));
        // todo: verify
        if (lookbehind.negative) {
          if (lookbehind.nfaEval.done()) {
            // console.log('negative lookbehind success');
            continue; // skip this state, negative lookbehind was found
          }
        }
        else if (!lookbehind.nfaEval.done()) {
          // console.log('positive lookbehind fail');
          continue; // skip this state, lookbehind was not found
        }
      }

      this.nextStates.add(x.f);

      for (const a of this.nfa.arrows[x.f])
        if (a['?'] === '&')
          q.push(a);
    }
  }

  swapStates() {
    const tmp = this.states;
    this.states = this.nextStates;
    this.nextStates = tmp;
    this.nextStates.clear();
  }

  step(c) {
    for (const [s, e] of this.lookaroundEvals) {
      if (e.lookbehind)
        e.nfaEval.step(c);
    }

    for (const s of this.states) {
      for (const a of this.nfa.arrows[s]) {
        if (a['?'] === '.') {
          this.takeArrow(a);
          continue;
        }
        if (a['?'] === 'char') {
          if (c === a.x)
            this.takeArrow(a);
          continue;
        }
        if (a['?'] === 'class') {
          const code = c.charCodeAt(0);
          for (const x of a.x) {
            if (x['?'] === 'char') {
              if (c === x.x) {
                this.takeArrow(a);
                break;
              }
            }
            else if (x['?'] === 'a-b') {
              if (x.a.x.charCodeAt(0) <= code && code <= x.b.x.charCodeAt(0)) {
                this.takeArrow(a);
                break;
              }
            }
          }
          continue;
        }
      }
    }
    this.swapStates();
  }

  toGrafviz() {
    let res = [];
    res.push('digraph nfa {');
    for (const s of this.states)
      res.push(`  ${s} [style = filled, fillcolor = deepskyblue];`);
    res = res.concat(nfaToGrafvizBody(this.nfa.arrows));
    res.push('}');
    return res.join('\n');
  }
}
