import {renderArrow} from './thompson';

export const nfaToGrafviz = (nfa) => {
  const res = [];
  res.push('digraph nfa {');
  for (let i = 0; i < nfa.length; ++i)
    for (const a of nfa[i]) {
      res.push(`  ${i} -> ${a.f} [label = "${renderArrow(a).replace(/\\([^\\"])/g, '\\\\$1')}"];`);
    }
  res.push('}');
  return res.join('\n');
};
