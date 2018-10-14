import {DictKeyedSet} from '../../util/DictKeyedSet';
import {TokenMap} from '../../util/TokenMap';

import {partEq, epsilon} from './grammarTools';

export const firstSets = g => {
  const fiWs = [];
  const fiAs = new Map();

  for (let i = 0; i < g.rules.length; ++i)
    fiWs.push(new TokenMap());
  for (const nt of g.nts)
    fiAs.set(nt, new TokenMap());

  let changed = false;
  do {
    changed = false;
    for (let i = 0; i < g.rules.length; ++i) {
      const rule = g.rules[i];

      const fiW = fiWs[i];
      const fiA = fiAs.get(rule.nt);

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

      for (let subI = 0; ; ++subI) {
        const addFiW = (set, x, nt, type) => add(set, x, {nt, subI, type});

        if (subI === rule.sub.length) {
          addFiW(fiW, epsilon, null, 'end');
          break;
        }

        const sub = rule.sub[subI];

        if (sub['?'] !== 'ref') {
          addFiW(fiW, sub, null, 't');

          break;
        }

        const fiSubA = fiAs.get(sub.x);

        for (const [fi,] of fiSubA) {
          if (partEq(fi, epsilon))
            continue;
          addFiW(fiW, fi, sub.x, 'fiA');
        }

        if (!fiSubA.has(epsilon))
          break;
      }

      const addFiA = (set, x) => add(set, x, {i});
      for (const [fi,] of fiW)
        addFiA(fiA, fi);
    }
  } while (changed);

  return {fiWs, fiAs};
};
