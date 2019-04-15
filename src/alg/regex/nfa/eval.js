import {nfaToGrafvizBody} from './nfaToGrafviz';
import {DictKeyedSet} from '../../../util/DictKeyedSet';
import {escapeUnprintable} from '../../../util/escapeUnprintable';

const lookaheadResolved = x =>
  x.nfaEval.done() || x.nfaEval.dead();
const lookaheadFailed = x =>
  x.negative ? x.nfaEval.done() : x.nfaEval.dead();
const lookaheadSucceeded = x =>
  x.negative ? x.nfaEval.dead() : x.nfaEval.done();

const cloneLookaheadEvals = evals =>
  evals
    .filter(x => !lookaheadResolved(x))
    .map(x => ({
      negative: x.negative,
      nfaEval: x.nfaEval.clone()
    }));

const lookaheadsDone = s => {
  for (const lookahead of s.lookaheadEvals) {
    if (lookahead.negative) {
      // all negative lookaheads must have died
      if (!lookahead.nfaEval.dead()) {
        return false;
      }
    }
    else if (!lookahead.nfaEval.done()) {
      // all positive lookaheads must have succeeded
      return false;
    }
  }
  return true;
};

export class NFAEval {
  states;
  nextStates;
  nfa;

  lookbehindEvals;
  lookaheadNFAs;

  constructor(nfa, doNotInitDynamicState) {
    const keyOrder = ['nfaState', 'lookaheadEvals'];
    this.states = new DictKeyedSet(keyOrder);
    this.nextStates = new DictKeyedSet(keyOrder);
    this.nfa = nfa;

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
    this.takeArrow(
      {
        nfaState: -1,
        lookaheadEvals: []
      },
      {'?': '&', f: 0, x: null}
    );
    this.swapStates();
  }
  clone() {
    const res = new NFAEval(this.nfa, true);

    for (const s of this.states)
      res.states.add({
        nfaState: s.nfaState,
        lookaheadEvals: cloneLookaheadEvals(s.lookaheadEvals)
      });
    for (const [s, e] of this.lookbehindEvals)
      res.lookbehindEvals.set(s, e.clone());

    return res;
  }

  done() {
    for (const s of this.states) {
      if (s.nfaState === 1 && lookaheadsDone(s)) {
        return true;
      }
    }
    return false;
  }
  dead() {
    return Array.from(this.states).length === 0;
  }

  restart() {
    this.states.clear();
    this.nextStates.clear();

    for (const [,e] of this.lookbehindEvals)
      e.nfaEval.restart();

    this.takeArrow({'?': '&', f: 0, x: null});
  }

  takeArrow(s0, a0) {
    const q = [];
    q.push({
      state: s0,
      arrow: a0
    });

    while (q.length > 0) {
      const x = q.pop();
      const arr = x.arrow;

      const lookbehind = this.lookbehindEvals.get(arr.f);
      if (lookbehind != null) {
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

      let killState = false;
      for (const lookahead of x.state.lookaheadEvals) {
        // console.log(`inherited lookahead for ${arr.f} that is ${lookahead.negative ? 'negative' : 'positive'} and ${lookahead.nfaEval.statusString()}`);
        if (lookaheadFailed(lookahead)) {
          killState = true;
          break;
        }
      }
      if (killState) {
        throw new Error('I think this should really never happen as everything should be filtered out during stepping');
        // continue;
      }

      const nextLookaheadEvals = cloneLookaheadEvals(x.state.lookaheadEvals);

      const lookahead = this.lookaheadNFAs.get(arr.f);
      if (lookahead != null) {
        const nfaEval = new NFAEval(lookahead.nfa);
        // console.log(`added lookahead for ${arr.f} that is ${lookahead.negative ? 'negative' : 'positive'} and ${nfaEval.statusString()}`);
        nextLookaheadEvals.push({
          negative: lookahead.negative,
          nfaEval
        });
      }

      const nextState = {
        nfaState: arr.f,
        lookaheadEvals: nextLookaheadEvals
      };

      let nonEpsilonArrowFound = false;
      for (const a of this.nfa.arrows[arr.f]) {
        if (a['?'] === '&') {
          q.push({
            state: nextState,
            arrow: a
          });
        }
        else {
          nonEpsilonArrowFound = true;
        }
      }
      // cull dummy states that only have epsilon transitions
      // except for the final state, which has no transitions out of it obviously
      if (arr.f === 1 || nonEpsilonArrowFound)
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
    for (const [,e] of this.lookbehindEvals)
      e.nfaEval.step(c);

    for (const s of this.states) {
      for (const lookahead of s.lookaheadEvals)
        if (lookaheadResolved(lookahead))
          throw new Error(`resolved lookahead was kept around somehow for state ${s.nfaState}. ${lookahead.negative}, ${lookahead.nfaEval.statusString()}`);

      // if it is a last state blocked by a L-A, keep it until L-A is resolved
      let keepAround = false;
      if (s.nfaState === 1 && s.lookaheadEvals.length !== 0) {
        // console.log(`kept around a state with ${this.nfa.arrows[s.nfaState].length} arrows`);
        keepAround = true;
      }

      let killState = false;
      for (const lookahead of s.lookaheadEvals) {
        lookahead.nfaEval.step(c);
        // console.log(`stepped a lookahead which is now ${lookahead.nfaEval.statusString()} and ${lookaheadResolved(lookahead) ? 'resolved' : 'not resolved'}`);
        if (lookaheadFailed(lookahead)) {
          killState = true;
          break;
        }
      }
      if (killState) // a lookahead for this state has failed, throw it out
        continue;
      s.lookaheadEvals = s.lookaheadEvals.filter(x => !lookaheadResolved(x));

      if (keepAround)
        // fixme: the DictKeyedSet of states copies the array or something so we have to only add here, after the L-A set has been modified
        this.nextStates.add(s);

      for (const a of this.nfa.arrows[s.nfaState]) {
        if (a['?'] === '.') {
          this.takeArrow(s, a);
          continue;
        }
        if (a['?'] === 'char') {
          if (c === a.x)
            this.takeArrow(s, a);
          continue;
        }
        if (a['?'] === 'class') {
          const code = c.charCodeAt(0);
          for (const x of a.x) {
            if (x['?'] === 'char') {
              if (c === x.x) {
                this.takeArrow(s, a);
                break;
              }
            }
            else if (x['?'] === 'a-b') {
              if (x.a.x.charCodeAt(0) <= code && code <= x.b.x.charCodeAt(0)) {
                this.takeArrow(s, a);
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

      console.log(`${indentStr}#${s.nfaState}@${prefix.length}. # L-A: ${Array.from(s.lookaheadEvals).length}.`);
      for (const lookahead of s.lookaheadEvals) {
        console.log(`${indentStr}${lookahead.negative ? '?!' : '?='}`);
        lookahead.nfaEval.prettyPrint(source, indentStr+'  ');
      }

      console.log(indentStr+prefix+' '+source.substring(prefix.length));
      console.log(indentStr+' '.repeat(prefix.length)+'^');
    }
  }
}
