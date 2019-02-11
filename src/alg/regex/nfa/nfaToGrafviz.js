import {renderArrow} from './thompson';

export const nfaToGrafviz = (nfa) => {
  const res = [];
  res.push('digraph nfa {');
  for (const a of nfa) {
    res.push(`  ${a.s} -> ${a.f} [label = "${renderArrow(a).replace(/\\([^\\"])/g, '\\\\$1')}"];`);
  }
  res.push('}');
  return res.join('\n');
};
