import {nfaToGrafvizBody} from './nfaToGrafviz';

export class NFAEval {
  states;
  nextStates;
  nfa;

  constructor(nfa) {
    this.states = new Set();
    this.nextStates = new Set();
    this.nfa = nfa;

    this.takeArrow({'?': '&', f: 0, x: null});
    this.swapStates();
  }

  takeArrow(a0) {
    const q = [];
    q.push(a0);

    while (q.length > 0) {
      const x = q.pop();
      this.nextStates.add(x.f);

      for (const a of this.nfa[x.f])
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
    for (const s of this.states) {
      for (const a of this.nfa[s]) {
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
    res = res.concat(nfaToGrafvizBody(this.nfa));
    res.push('}');
    return res.join('\n');
  }
}
