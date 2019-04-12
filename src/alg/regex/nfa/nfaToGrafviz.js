import {renderArrow} from './thompson';

export const nfaToGrafvizBody = (nfa) => {
  const res = [];
  for (let i = 0; i < nfa.arrows.length; ++i)
    for (const a of nfa.arrows[i]) {
      res.push(`  ${i} -> ${a.f} [label = "${renderArrow(a).replace(/\\([^\\"])/g, '\\\\$1')}"];`);
    }
  return res;
};

export const nfaToGrafviz = (nfa) => {
  let res = [];
  res.push('digraph nfa {');
  res = res.concat(nfaToGrafvizBody(nfa));
  res.push('}');
  return res.join('\n');
};
