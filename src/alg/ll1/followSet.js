import {DictKeyedSet} from '../../util/DictKeyedSet';
import {TokenMap} from '../../util/TokenMap';

import {partEq, epsilon} from './grammarTools';

// fo = follow set
// fo of nt `x` - set of every `t` that can follow a match of `x`
export const followSet = (g, fiAs) => {
  // map: nt -> fo + what caused each addition to fo
  const foAs = new Map();

  for (const nt of g.nts)
    foAs.set(nt, new TokenMap());

  let changed = true;
  while (changed) {
    changed = false;

    // add t `x` to fo `set`
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
        changed = true; // todo: was commented out for some reason
        m.add(meta);
      }
    };

    // for all rules `r`:
    // for all nts `A` in `r`:
    // in subs following `A`:
    // for every skipable `x`:
    //   assuming that `x` is matched, each of fi of `x` can follow `A`
    //   assuming that `x` is skipped: consider the following subs
    // when reached non-skipable `x`, stop
    //   because no following sub `y` can be reached without matching `x`
    //   making `x` the beginning of every possible match that reached `x`
    //   making `x` the last t that can follow `A`
    // `x` is no-skipable:
    //   if `x` is a t
    //   if `x` is a nt that cannot start with epsilon
    // if no non-skipable sub exists, each of fo of `rule.nt` can follow `A`,
    //   because `A` is the last nt of `rule`,
    //   making it precede anything that follows `rule.nt`, when matched by `rule`
    for (let i = 0; i < g.rules.length; ++i) {
      const rule = g.rules[i];

      for (let subI = 0; subI < rule.sub.length; ++subI) {
        const sub = rule.sub[subI];

        if (sub['?'] !== 'id') // don't collect fo of ts
          continue;
        // sub is nt

        const foA = foAs.get(sub.x);

        for (let x = subI+1; ; ++x) { // subs following `A`
          const addFoA = (set, x, nt, type) => add(set, x, {nt, i, subI, type});

          if (x === rule.sub.length) { // no non-skipable sub
            // ignore the redundant assertion that
            // x can be followed by whatever can follow x
            if (rule.nt === sub.x)
              break;


            const foArule = foAs.get(rule.nt);

            for (const [fo,] of foArule) // add all of fo of `rule.nt` to fo of `A`
              addFoA(foA, fo, rule.nt, 'foA');

            break;
          }

          const subX = rule.sub[x];

          if (subX['?'] !== 'id') { // subX is t – non-skipable
            addFoA(foA, subX, null, 't');
            break;
          }
          // subX is nt

          const fiAx = fiAs.get(subX.x);

          for (const [fi,] of fiAx) { // each of fi of `x` can follow `A`
            if (partEq(fi, epsilon))
              continue;
            addFoA(foA, fi, subX.x, 'fiA');
          }

          if (!fiAx.has(epsilon)) // fi of `x` has no epsilon – non-skipable
            break;
        }
      }
    }
  }

  return foAs;
};
