import {nfaToGrafvizBody} from './nfaToGrafviz';
import {DictKeyedSet} from '../../../util/DictKeyedSet';
import {escapeUnprintable} from '../../../util/escapeUnprintable';

const assertLookbehind = x =>
  x.negative ? !x.nfaEval.done() : x.nfaEval.done();

const lookaroundResolved = x =>
  x.nfaEval.done() || x.nfaEval.dead();
const lookaroundFailed = x =>
  x.negative ? x.nfaEval.done() : x.nfaEval.dead();
const lookaroundSucceeded = x =>
  x.negative ? x.nfaEval.dead() : x.nfaEval.done();

const cloneLookaheadEvals = evals =>
  evals
    .filter(x => !lookaroundResolved(x))
    .map(x => ({
      negative: x.negative,
      nfaEval: x.nfaEval.clone()
    }));

const cloneGroupData = groups => {
  const res = new Map();
  for (const [k, v] of groups)
    res.set(k, v);
  return res;
};

export let cloneN = 0;
export class NFAEval {
  constructor(nfa, doNotInitDynamicState) {
    const keyOrder = ['nfaState', 'groupData', 'lookaheadEvals'];
    this.states = new DictKeyedSet(keyOrder);
    this.nextStates = new DictKeyedSet(keyOrder);
    this.nfa = nfa;
    this.i = 0;

    this.lookbehindEvals = new Map();
    this.lookaheadNFAs = new Map();
    for (const [s, laNFA] of nfa.lookaroundNFAs) {
      let negative = false;
      if (laNFA['?'].endsWith('!'))
        negative = true;

      if (!laNFA['?'].startsWith('?<')) {
        this.lookaheadNFAs.set(s, {
          negative,
          nfa: laNFA.nfa
        });
        continue;
      }

      if (doNotInitDynamicState === true)
        continue;

      this.lookbehindEvals.set(s, {
        negative,
        nfaEval: new NFAEval(laNFA.nfa)
      });
    }

    if (doNotInitDynamicState === true)
      return;
    this.takeArrow({
      state: {
        nfaState: -1,
        groupData: new Map(),
        lookaheadEvals: []
      },
      arrow: {'?': '&', f: 0, x: null},
      canReuse: true
    });
    this.swapStates();
  }
  clone() {
    ++cloneN;
    const res = new NFAEval(this.nfa, true);
    res.i = this.i;

    for (const s of this.states)
      res.states.add({
        nfaState: s.nfaState,
        groupData: cloneGroupData(s.groupData),
        lookaheadEvals: cloneLookaheadEvals(s.lookaheadEvals)
      });
    for (const [s, e] of this.lookbehindEvals)
      res.lookbehindEvals.set(s, e.clone());

    return res;
  }

  finishedParseStates() {
    const res = [];
    for (const s of this.states) {
      if (s.nfaState === 1 && s.lookaheadEvals.length === 0)
        res.push(s);
    }

    return res;
  }
  done() {
    for (const s of this.states) {
      if (s.nfaState === 1 && s.lookaheadEvals.length === 0)
        return true;
    }
    return false;
  }
  dead() {
    return this.states.size === 0;
  }
  hasNontrivialParseState() {
    const q = [];
    q.push(0);
    const visited = new Set();

    const stateIdSet = new Set();
    for (const s of this.states)
      stateIdSet.add(s.nfaState);

    while (q.length > 0) {
      const cur = q.pop();
      if (visited.has(cur))
        continue;

      visited.add(cur);
      stateIdSet.delete(cur);

      if (stateIdSet.size === 0)
        return false;

      const arrows = this.nfa.arrows[cur];
      for (const arrow of arrows) {
        if (arrow['?'] === '&')
          q.push(arrow.f);
      }
    }

    return true;
  }

  restart() {
    this.i = 0;

    this.states.clear();
    this.nextStates.clear();

    for (const [,e] of this.lookbehindEvals)
      e.nfaEval.restart();

    this.takeArrow({'?': '&', f: 0, x: null});
  }

  takeArrow(desc) {
    const q = [];
    q.push(desc);

    while (q.length > 0) {
      const x = q.pop();
      const fState = x.arrow.f;

      const lookbehind = this.lookbehindEvals.get(fState);
      if (lookbehind != null && !assertLookbehind(lookbehind))
        continue;

      const nextLookaheadEvals =
        x.canReuse ? x.state.lookaheadEvals : cloneLookaheadEvals(x.state.lookaheadEvals);

      const lookahead = this.lookaheadNFAs.get(fState);
      if (lookahead != null)
        nextLookaheadEvals.push({
          negative: lookahead.negative,
          nfaEval: new NFAEval(lookahead.nfa)
        });

      const nextGroupData =
        x.canReuse ? x.state.groupData : cloneGroupData(x.state.groupData);

      const nextState = x.canReuse ? x.state : {};
      nextState.nfaState = fState;
      nextState.lookaheadEvals = nextLookaheadEvals;
      nextState.groupData = nextGroupData;

      const groupBoundary = this.nfa.groupBoundaries.get(x.state.nfaState);
      if (groupBoundary != null)
        nextState.groupData.set(groupBoundary, this.i);

      // cull dummy states that only have epsilon transitions
      // except for the final state
      let mustKeepState = fState === 1;

      const arrows = this.nfa.arrows[fState];
      const hasSingleArrow = arrows.length === 1;
      for (let i = 0; i < arrows.length; ++i) {
        const a = arrows[i];

        // ATTENTION
        // be super careful here, as arrows are actually popped in reverse order
        const canReuse = hasSingleArrow || i === 0;
        if (a['?'] === '&') {
          q.push({
            state: nextState,
            arrow: a,
            canReuse
          });
        }
        else {
          mustKeepState = true;
        }
      }

      if (mustKeepState)
        this.nextStates.add(nextState);
    }
  }

  swapStates() {
    const tmp = this.states;
    this.states = this.nextStates;
    this.nextStates = tmp;
    this.nextStates.clear();
  }

  step(c) {
    ++this.i;
    for (const [,e] of this.lookbehindEvals)
      e.nfaEval.step(c);

    for (const s of this.states) {
      // if it is a last state blocked by a L-A, keep it until L-A is resolved
      let keepAround = false;
      if (s.nfaState === 1 && s.lookaheadEvals.length !== 0)
        keepAround = true;

      let killState = false;
      for (const lookahead of s.lookaheadEvals) {
        // sanity check
        if (lookaroundResolved(lookahead))
          throw new Error(`resolved lookahead was kept around somehow for state ${s.nfaState}. negative: ${lookahead.negative}, ${lookahead.nfaEval.statusString()}`);

        lookahead.nfaEval.step(c);
        if (lookaroundFailed(lookahead)) {
          killState = true;
          break;
        }
      }
      if (killState) // a lookahead for this state has failed, throw it out
        continue;

      s.lookaheadEvals = s.lookaheadEvals.filter(x => !lookaroundResolved(x));


      if (keepAround)
        // fixme: the DictKeyedSet of states copies the array or something so we have to only add here, after the L-A set has been modified
        this.nextStates.add(s);


      const arrows = this.nfa.arrows[s.nfaState];
      const hasSingleArrow = arrows.length === 1;
      for (let i = 0; i < arrows.length; ++i) {
        const a = arrows[i];
        const canReuse = hasSingleArrow || i === arrows.length-1;
        const arrowDescriptor = {
          state: s,
          arrow: a,
          canReuse
        };

        if (a['?'] === '.') {
          this.takeArrow(arrowDescriptor);
          continue;
        }
        if (a['?'] === 'char') {
          if (c === a.x)
            this.takeArrow(arrowDescriptor);
          continue;
        }
        if (a['?'] === 'class') {
          const code = c.charCodeAt(0);
          for (const x of a.x) {
            if (x['?'] === 'char') {
              if (c === x.x) {
                this.takeArrow(arrowDescriptor);
                break;
              }
            }
            else if (x['?'] === 'a-b') {
              if (x.a.x.charCodeAt(0) <= code && code <= x.b.x.charCodeAt(0)) {
                this.takeArrow(arrowDescriptor);
                break;
              }
            }
          }
          continue;
        }
        if (a['?'] === 'inv_class') {
          const code = c.charCodeAt(0);
          let doNotTake = false;
          for (const x of a.x) {
            if (x['?'] === 'char') {
              if (c === x.x) {
                doNotTake = true;
                break;
              }
            }
            else if (x['?'] === 'a-b') {
              if (x.a.x.charCodeAt(0) <= code && code <= x.b.x.charCodeAt(0)) {
                doNotTake = true;
                break;
              }
            }
          }
          if (!doNotTake)
            this.takeArrow(arrowDescriptor);
          continue;
        }
        if (a['?'] === '&')
          continue;
        throw new Error(`Unknown arrow type ${a['?']}`);
      }
    }
    this.swapStates();
  }

  toGrafviz() {
    let res = [];
    res.push('digraph nfa {');

    const vis = new Set();
    for (const s of this.states) {
      if (vis.has(s.nfaState))
        continue;
      res.push(`  ${s.nfaState} [style = filled, fillcolor = deepskyblue];`);
      vis.add(s.nfaState);
    }

    res = res.concat(nfaToGrafvizBody(this.nfa.arrows));
    res.push('}');
    return res.join('\n');
  }
  statusString() {
    if (this.dead())
      return 'dead';

    let haveFinalState = false;
    for (const {nfaState} of this.states)
      if (nfaState === 1) {
        haveFinalState = true;
        break;
      }
    if (haveFinalState) {
      if (this.done())
        return 'done';
      return 'L-A blocked';
    }

    return 'inconclusive';
  }
  prettyPrint(source, indentStr) {
    if (indentStr === undefined)
      indentStr = '';

    console.log(`${indentStr}${this.statusString()}. # L-B: ${this.lookbehindEvals.size}`);
    for (const lookbehind of this.lookbehindEvals) {
      console.log(`${indentStr}${lookbehind.negative ? '?<!' : '?<='}`);
      lookbehind.nfaEval.prettyPrint(source, indentStr+'  ');
    }

    for (const s of this.states) {
      let pos = this.nfa.stateSourcePosition[s.nfaState];

      if (pos === -1)
        pos = source.length;

      // have to re-escape or additional symbols added after escaping will mess up pos
      const prefix = escapeUnprintable(source.substring(0, pos));

      console.log(`${indentStr}#${s.nfaState}@${prefix.length}. # L-A: ${s.lookaheadEvals.size}.`);
      for (const lookahead of s.lookaheadEvals) {
        console.log(`${indentStr}${lookahead.negative ? '?!' : '?='}`);
        lookahead.nfaEval.prettyPrint(source, indentStr+'  ');
      }

      console.log(indentStr+prefix+' '+source.substring(prefix.length));
      console.log(indentStr+' '.repeat(prefix.length)+'^');
    }
  }
}
