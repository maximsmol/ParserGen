import util from 'util';

import {logdeep} from './util/logdeep';
import {tokenize} from './tokenize';


import {grammar as bootstrapGrammar} from './alg/ll1/bootstrap_grammar';
import {firstSets} from './alg/ll1/firstSets';
import {followSet} from './alg/ll1/followSet';
import {parseTable} from './alg/ll1/parseTable';
import {parse} from './alg/ll1/parse';

const {fiWs, fiAs} = firstSets(bootstrapGrammar);
const foAs = followSet(bootstrapGrammar, fiAs);
const table = parseTable(bootstrapGrammar, {fiAs, fiWs, foAs});

import {promises as fs} from 'fs';
(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  const toks = tokenize(str);
  const res = parse(bootstrapGrammar, {table, fiAs, foAs}, toks, false);

  const visit = (ast, indent) => {
    if (ast.x['?'] === 'id')
      console.log(`${indent}${ast.x.x}:`);
    else if (ast.x['?'] !== 'epsilon')
      console.log(`${indent}${ast.str.replace('\n', '\\n').replace('\r', '\\r')}`);

    let newIndent = indent + '  ';
    for (let i = 0; i < ast.children.length; ++i)
      visit(ast.children[i], newIndent);
  };
  visit(res, '');
})();
