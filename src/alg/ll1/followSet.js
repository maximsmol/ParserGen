import {DictKeyedSet} from '../../util/DictKeyedSet';
import {TokenMap} from '../../util/TokenMap';

import {partEq, epsilon} from './grammarTools';

export const followSet = (g, fiAs) => {
  const foAs = new Map();

  for (const nt of g.nts)
    foAs.set(nt, new TokenMap());

  let changed = false;
  do {
    changed = false;

    const add = (set, x, meta) => {
      let m = set.get(x);
      if (m == null) {
        changed = true;
        m = new DictKeyedSet(Object.keys(meta));
        set.set(x, m);
      }
      if (!m.has(meta)) {
        // changed = true;
        m.add(meta);
      }
    };

    for (let i = 0; i < g.rules.length; ++i) {
      const rule = g.rules[i];

      for (let subI = 0; subI < rule.sub.length; ++subI) {
        const sub = rule.sub[subI];

        if (sub['?'] !== 'ref')
          continue;

        const foA = foAs.get(sub.x);

        for (let x = subI+1; ; ++x) {
          const addFoA = (set, x, nt, type) => add(set, x, {nt, i, subI, type});

          if (x === rule.sub.length) {
            // ignore the redundant assertion that
            // x can be followed by whatever can follow x
            if (rule.nt === sub.x)
              break;


            const foArule = foAs.get(rule.nt);

            for (const [fo,] of foArule)
              addFoA(foA, fo, rule.nt, 'foA');

            break;
          }

          const subX = rule.sub[x];

          if (subX['?'] !== 'ref') {
            addFoA(foA, subX, null, 't');
            break;
          }
          const fiAx = fiAs.get(subX.x);

          for (const [fi,] of fiAx) {
            if (partEq(fi, epsilon))
              continue;
            addFoA(foA, fi, subX.x, 'fiA');
          }

          if (!fiAx.has(epsilon))
            break;
        }
      }
    }
  } while (changed);

  return foAs;
};
