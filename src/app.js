import {parse as parseRegex} from './alg/regex/recDescent';
import {printASTTree as printRegexASTTree} from './alg/regex/regexStrAST_renderer';
import {buildNFA} from './alg/regex/nfa/thompson';
import {NFAEval} from './alg/regex/nfa/eval';
import {nfaToGrafviz} from './alg/regex/nfa/nfaToGrafviz';
import {logdeep} from './util/logdeep';

const regex = '(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])';
const ast = parseRegex(regex);
printRegexASTTree(ast, regex);

/*const tokenMap = {
  '[ \n\r\t\v]': 'space',
  '[A-Z][a-z]*[\'?+*]?': 'id'
};

const nfas = [];
const tokens = [];
for (const [regex, tok] of Object.entries(tokenMap)) {
  nfas.push(buildNFA(parseRegex(regex)));
  tokens.push(tok);
}

const nfaEvals = [];
for (const nfa of nfas) {
  nfaEvals.push(new NFAEval(nfa));
}

import {promises as fs} from 'fs';

(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  for (let i = 0; i < str.length; ++i) {
    const c = str[i];

    for (let j = 0; j < nfaEvals.length; ++j) {
      nfaEvals[j].step(c);
      console.log(`${j}: ${Array.from(nfaEvals[j].states.values())}`);
    }
  }
})();*/
