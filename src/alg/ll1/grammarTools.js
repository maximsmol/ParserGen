import {TokenSet} from '../../util/TokenSet';

export const tagPart = (tag, x) => ({
  '?': tag, x
});

export const ref = x => tagPart('id', x);
export const tok = x => tagPart('token', x);
export const lit = x => tagPart('char', x);
export const space = x => tagPart('space', x);
export const special = x => tagPart('special', x);
export const epsilon = special('epsilon');

export const partEq = (a, b) => a['?'] === b['?'] && a.x === b.x;


export const buildGrammar = desc => {
  const g = {
    rules: [],
    ts: new TokenSet(),
    nts: new Set()
  };

  for (const [nt, subs] of Object.entries(desc))
    for (const sub of subs) {
      if (sub.length === 0)
        continue;

      for (const t of sub) {
        if (t['?'] === 'id')
          continue;
        g.ts.add(t);
      }

      g.rules.push({nt, sub});
      g.nts.add(nt);
    }

  g.ts = [...g.ts.values()];
  g.nts = [...g.nts.values()];
  return g;
};

export const repGrammar = g => {
  const res = {};
  for (const r of g.rules) {
    if (res[r.nt] == null)
      res[r.nt] = [];
    res[r.nt].push(r.sub);
  }
  return res;
};
