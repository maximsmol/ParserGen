import {DictKeyedSet} from '../../util/DictKeyedSet';
import {TokenMap} from '../../util/TokenMap';

import {partEq, epsilon} from './grammarTools';

// fi = first set
// fi of `x` - set of every t that a match of `x` can start with
export const firstSets = g => {
  // maps: x -> fi + what caused each addition to fi
  const fiWs = []; // rules
  const fiAs = new Map(); // nts

  for (let i = 0; i < g.rules.length; ++i)
    fiWs.push(new TokenMap());
  for (const nt of g.nts)
    fiAs.set(nt, new TokenMap());

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < g.rules.length; ++i) {
      const rule = g.rules[i];

      const fiW = fiWs[i];
      const fiA = fiAs.get(rule.nt);

      // add t `x` to fi `set`
      // add meta to causes of `x`
      // update changed
      const add = (set, x, meta) => {
        let m = set.get(x);
        if (m == null) {
          changed = true;
          m = new DictKeyedSet(Object.keys(meta));
          set.set(x, m);
        }
        if (!m.has(meta)) {
          changed = true;
          m.add(meta);
        }
      };

      // in subs of `rule`:
      // for every skipable `x`:
      //   assuming that `x` is matched, any of fi of `x` can be the start of a match
      //   assuming that `x` is skipped: consider following subs
      // when reached any non-skipable sub `x`, stop
      //   because no following sub `y` can be reached without matching `x`,
      //   making `x` the last possible first t in any match
      // `x` is no-skipable:
      //   if `x` is a t
      //   if `x` is a nt that cannot start with epsilon
      // if no non-skipable sub exists, `rule` is skipable, `rule.nt` is skipable
      for (let subI = 0; ; ++subI) {
        const addFiW = (set, x, nt, type) => add(set, x, {nt, subI, type});

        if (subI === rule.sub.length) { // no non-skipable sub
          addFiW(fiW, epsilon, null, 'end');
          break;
        }

        const sub = rule.sub[subI];

        if (sub['?'] !== 'id') { // sub is t – non-skipable
          addFiW(fiW, sub, null, 't');

          break;
        }
        // sub is nt

        const fiSubA = fiAs.get(sub.x);
        if (fiSubA == null)
          throw new Error(`No definition for non-terminal ${sub.x} found.`);

        for (const [fi,] of fiSubA) { // assume nt is matched, add all of fi of nt
          if (partEq(fi, epsilon))
            continue;
          addFiW(fiW, fi, sub.x, 'fiA');
        }

        if (!fiSubA.has(epsilon)) // fi of nt has no epsilon – non-skipable
          break;
      }

      // fi of every rule of nt is subset of fi of nt
      const addFiA = (set, x) => add(set, x, {i});
      for (const [fi,] of fiW)
        addFiA(fiA, fi);
    }
  }

  return {fiWs, fiAs};
};
