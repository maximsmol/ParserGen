import {epsilon} from './grammarTools';
import {renderTabular} from '../../util/renderTabular';
import {renderSubPart, renderRule, ruleToStr} from './grammar_renderer';
import {TokenMap} from '../../util/TokenMap';

export const parseTable = (g, {fiAs, fiWs, foAs}) => {
  const res = new Map();
  for (const nt of g.nts)
    res.set(nt, new TokenMap());

  const srcMap = new Map();
  for (const nt of g.nts)
    srcMap.set(nt, new TokenMap());

  for (let i = 0; i < g.rules.length; ++i) {
    const rule = g.rules[i];
    const nt = rule.nt;

    const fiW = fiWs[i];
    const foA = foAs.get(nt);

    for (const t of g.ts) {
      let src = null;
      if (fiW.has(t))
        src = 'fiW';
      else if (fiW.has(epsilon) && foA.has(t))
        src = 'foA';
      else
        continue;

      const m = res.get(nt);
      const oldI = m.get(t);
      if (oldI != null) {
        const oldSrc = srcMap.get(nt).get(t);

        let visitFiW1 = null;
        const visitFiA = (nt, indentLevel, visited) => {
          const indent = ' '.repeat(indentLevel);
          if (visited.has(nt)) {
            console.log(`${indent}${nt}...`);
            return;
          }
          visited.add(nt);

          const srcs = fiAs.get(nt).get(t);
          for (const src of srcs) {
            console.log(`${indent}fiW(${src.i}) | ${ruleToStr(g.rules[src.i])}`);

            visitFiW1(src.i, indentLevel+2, visited);
          }
        };
        visitFiW1 = (i, indentLevel, visitedAs) => {
          const indent = ' '.repeat(indentLevel);

          const srcs = fiWs[i].get(t);
          for (const src of srcs) {
            if (src.type === 't') {
              console.log(`${indent}${renderSubPart(t)} @ ${i}:${src.subI}`);
              break;
            }
            if (src.type === 'end') {
              console.log(`${indent}${renderSubPart(t)} @ ${i}:end (${i}:${src.subI})`);
              break;
            }
            console.log(`${indent}fiA(${src.nt}) ${i}:${src.subI}`);

            visitFiA(src.nt, indentLevel+2, visitedAs);
          }
        };
        const visitFiW = i => {
          console.log(`fiW(${i}) | ${ruleToStr(g.rules[i])}`);
          visitFiW1(i, 2, new Set());
        };

        const visitFoA1 = (nt, indentLevel, visited) => {
          const indent = ' '.repeat(indentLevel);
          if (visited.has(nt)) {
            console.log(`${indent}${nt}...`);
            return;
          }
          visited.add(nt);

          const srcs = foAs.get(nt).get(t);
          for (const src of srcs) {
            if (src.type === 't') {
              console.log(`${indent}${renderSubPart(t)} @ ${src.i}:${src.subI} | ${ruleToStr(g.rules[src.i])}`);
              break;
            }
            console.log(`${indent}${src.type}(${src.nt}) ${src.i}:${src.subI} | ${ruleToStr(g.rules[src.i])}`);
            if (src.type === 'fiA') {
              visitFiA(src.nt, indentLevel+2, new Set());
              break;
            }

            visitFoA1(src.nt, indentLevel+2, visited);
          }
        };
        const visitFoA = nt => {
          console.log(`foA(${nt})`);
          visitFoA1(nt, 2, new Set());
        };

        let name = null;
        if (oldSrc === 'fiW')
          name = 'First-first';
        else if (oldSrc === 'foA')
          name = 'First-follow';
        const conflictReport = `${name} conflict at ${nt}, ${renderSubPart(t)}: ${oldI} <- ${i}`;
        console.log(conflictReport);
        const prepend = (a, b) => {b.unshift(a); return b;};
        console.log(
          renderTabular([
            prepend({x: oldI+':', align: 'right'}, renderRule(g.rules[oldI])),
            prepend({x:    i+':', align: 'right'}, renderRule(g.rules[i]))
          ])
        );
        console.log();

        console.log('Source of A:');
        if (oldSrc === 'fiW')
          visitFiW(oldI);
        else if (oldSrc === 'foA')
          visitFoA(nt);
        console.log();

        console.log('Source of B:');
        if (src === 'fiW')
          visitFiW(i);
        else if (src === 'foA')
          visitFoA(nt);

        throw new Error(conflictReport);
      }
      srcMap.get(nt).set(t, src);
      m.set(t, i);
    }
  }

  return res;
};
