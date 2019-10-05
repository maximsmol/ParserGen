import {parse} from '../recDescent';
import {buildNFA} from './thompson';
import {NFAEval} from './eval';

export class NFAEvalManager {
  constructor(regex) {
    this.regex = regex;
    this.ast = parse(regex);
    this.nfa = buildNFA(this.ast);
    this.nfaEval = new NFAEval(this.nfa);
  }

  setStr(str) {
    this.str = str;
  }

  stateGroupMatch(s, i) {
    let res = {
      start: s.groupData.get(i), end: s.groupData.get(-i),
      str: null
    };

    if (res.start != null && res.end != null)
      res.str = this.str.substring(res.start, res.end);

    return res;
  }
  stateMatches(s) {
    const res = [];

    for (let i = 1; i < this.nfa.lastGroupId; ++i)
      res.push(this.stateGroupMatch(s, i));

    return res;
  }
  results() {
    const res = {
      hasMatches: false,
      matches: []
    };

    const states = this.nfaEval.finishedParseStates();
    for (let i = 1; i < this.nfa.lastGroupId; ++i) {
      const curArr = [];

      for (const s of states)
        curArr.push(this.stateGroupMatch(s, i));

      if (curArr.length !== 0)
        res.hasMatches = true;

      res.matches.push(curArr);
    }

    return res;
  }
}
