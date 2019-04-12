import {parse as parseRegex} from './alg/regex/recDescent';
import {printASTTree as printRegexASTTree} from './alg/regex/regexStrAST_renderer';
import {buildNFA} from './alg/regex/nfa/thompson';
import {NFAEval} from './alg/regex/nfa/eval';
import {nfaToGrafviz} from './alg/regex/nfa/nfaToGrafviz';
import {logdeep} from './util/logdeep';

const tokenMap = {
  '.*[ \n\r\t\v]': 'space',
  '.*[A-Z][a-z]*[\'?+*]?': 'id'
};
const regexes = Object.keys(tokenMap);
const tokenNames = Object.values(tokenMap);

const nfas = [];
const tokens = [];
for (const [regex, tok] of Object.entries(tokenMap)) {
  console.log('a');
  nfas.push(buildNFA(parseRegex(regex)));
  tokens.push(tok);
}

const nfaEvals = [];
for (const nfa of nfas) {
  nfaEvals.push(new NFAEval(nfa));
}

import {promises as fs} from 'fs';
import {escapeUnprintable} from './util/escapeUnprintable';
// import escape from 'js-string-escape';

const escapedRegexes = [];
for (const regex of regexes)
  escapedRegexes.push(escapeUnprintable(regex));
const printStates = () => {
  for (let i = 0; i < nfaEvals.length; ++i) {
    console.log(i);
    for (const state of nfaEvals[i].states.values()) {
      let pos = nfaEvals[i].nfa.stateSourcePosition[state];
      const str = escapedRegexes[i];

      // have to re-escape or additional symbols added after escaping will mess up pos
      const prefix = escapeUnprintable(regexes[i].substring(0, pos));

      if (pos === -1)
        pos = str.length;

      console.log(`  #${state}@${prefix.length}:`);
      console.log('  '+prefix+' '+str.substring(prefix.length));
      console.log('  '+' '.repeat(prefix.length)+'^');
    }
  }
};

(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  printStates();
  for (let i = 0; i < str.length; ++i) {
    const c = str[i];
    console.log(`step('${escapeUnprintable(c)}')`);

    for (let j = 0; j < nfaEvals.length; ++j)
      nfaEvals[j].step(c);
    printStates();
  }
})();
