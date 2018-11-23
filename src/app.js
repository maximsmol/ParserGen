import {tok as gtok, ref, special, epsilon, buildGrammar, partEq} from './alg/ll1/grammarTools';
import {grammarRep, grammar} from './alg/ll1/bootstrap_grammar';
import escapeString from 'js-string-escape';

const tok = x => {
  if (!/[a-z]/.test(x[0]))
    throw new Error(`Token id ${x} is invalid.`);
  return gtok(x);
};
const lit = x => gtok(`'${escapeString(x)}'`);

import {rulesToStrNumbered, tableToStr, grammarRepToString} from './alg/ll1/grammar_renderer';

import {logdeep} from './util/logdeep';
import {inspectdeep} from './util/inspectdeep';

import {firstSets} from './alg/ll1/firstSets';
import {followSet} from './alg/ll1/followSet';
import {parseTable} from './alg/ll1/parseTable';

const fis = firstSets(grammar);
const foAs = followSet(grammar, fis.fiAs);
const table = parseTable(grammar, {fiAs: fis.fiAs, fiWs: fis.fiWs, foAs});
console.log('Hardcoded grammar table:');
console.log(tableToStr(grammar, table));
console.log('Reading grammar from file "grammarGrammar.ll":');

const parseTableFromGrammar = g => {
  const fis = firstSets(g); const foAs = followSet(g, fis.fiAs);
  return parseTable(g, {fiAs: fis.fiAs, fiWs: fis.fiWs, foAs});
};
const parseTableFromGrammarRep = rep => parseTableFromGrammar(buildGrammar(rep));

import {promises as fs} from 'fs';

import {tokenize} from './tokenize';
import {parse} from './alg/ll1/parse';
(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  const toks = tokenize(str);
  const parseTree = parse(grammar, {table, fiAs: fis.fiAs, fiWs: fis.fiWs, foAs}, toks);

  const visited = new Set();
  const visitor = function*(node) {
    if (visited.has(node))
      return;
    visited.add(node);

    yield node;
    for (const c of node.children)
      yield* visitor(c);
  };
  const nodeToSub = subChild => {
    if (partEq(subChild.x, tok('id'))) {
      const id = subChild.str;
      if (id === '&')
        return [epsilon];
      if (id[0] === '&')
        return [special(id.substring(1))];
      if (/[a-z]/.test(id[0]))
        return [tok(id)];
      return [ref(id)];
    }
    if (!partEq(subChild.x, ref('Str')))
      throw new Error(`Parse tree invalid. Got ${inspectdeep(subChild)}.`);

    let res = [];
    for (const n of visitor(subChild)) {
      if (n.x.x !== 'StrChar')
        continue;

      for (const c of n.children) {
        if (c.x['?'] !== 'lit' && !partEq(c.x, special('any')))
          continue;
        res.push(lit(c.str));
      }
    }
    return res;
  };
  const collectSubs = subs => {
    const res = [];

    let cur = subs;
    let sub = [];
    for (;;) {
      let [x, subsPrime] = cur.children; // Subs -> Sub Subs'
      sub.push(nodeToSub(x.children[0]));

      let [a, , c] = subsPrime.children;
      if (partEq(a.x, epsilon)) { // Subs' -> &
        res.push([].concat.apply([], sub));
        break;
      }

      if (partEq(a.x, lit('|'))) { // Subs' -> '|' AllowNL Subs
        cur = c;
        res.push([].concat.apply([], sub));
        sub = [];
        continue;
      }
      else // Subs' -> Subs
        cur = a;
    }

    return res;
  };
  const readGrammarRep = {};
  for (const n of visitor(parseTree)) {
    if (n.x.x !== 'Rule')
      continue;

    const [id, , , , subs] = n.children;
    readGrammarRep[id.str] = collectSubs(subs);
  }

  try {
    const readG = buildGrammar(readGrammarRep);
    const readTable = parseTableFromGrammar(readG);
    console.log(tableToStr(readG, readTable));
  }
  catch(e) {

  }
})();
