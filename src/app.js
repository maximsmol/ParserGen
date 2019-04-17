import {NFAEvalManager} from './alg/regex/nfa/manager';
import {cloneN} from './alg/regex/nfa/eval';
import {logdeep} from './util/logdeep';
import {escapeUnprintable} from './util/escapeUnprintable';


const tokenMap = {
  '.*([ \n\r\t\v])': 'space',
  '.*((?<![A-Za-z])[A-Z][A-Za-z0-9]*(?![A-Za-z0-9])\'*(?!\')[+*?]?(?![+*?]))': 'id',
  '.*((?<![A-Za-z])[a-z][A-Za-z0-9]*(?![A-Za-z0-9]))': 'token',
  '.*(.)': 'char'
};
const regexManagers = [];
const tokens = [];
const numTokens = [];

for (const [regex, tok] of Object.entries(tokenMap)) {
  regexManagers.push(new NFAEvalManager(regex));
  tokens.push(tok);
  numTokens.push(0);
}

import {promises as fs} from 'fs';

(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  for (const m of regexManagers)
    m.setStr(str);

  for (let i = 0; i < str.length; ++i) {
    const c = str[i];
    console.log(`step('${escapeUnprintable(c)}')`);

    for (let j = 0; j < regexManagers.length; ++j) {
      const m = regexManagers[j];
      const nfaEval = m.nfaEval;
      nfaEval.step(c);

      const res = m.results();

      if (res.hasMatches) {
        console.log(`${i}: found ${tokens[j]}`);
        ++numTokens[j];
      }
      for (const group of res.matches)
        for (const match of group)
          console.log(`  ${match.start}-${match.end}: ${escapeUnprintable(match.str)}`);
    }
  }

  console.log(cloneN);
  console.log(numTokens);
})();
