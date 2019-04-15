import {parse as parseRegex} from './alg/regex/recDescent';
import {printASTTree as printRegexASTTree} from './alg/regex/regexStrAST_renderer';
import {buildNFA} from './alg/regex/nfa/thompson';
import {NFAEval, cloneN} from './alg/regex/nfa/eval';
import {nfaToGrafviz} from './alg/regex/nfa/nfaToGrafviz';
import {logdeep} from './util/logdeep';
import {escapeUnprintable} from './util/escapeUnprintable';

// // const regex = '(A|B+(?!B))(?!A)';
// const regex = '.*[A-Z][a-z]*((?![a-z])|(\'*[?+*]|\'+)(?![\'?+*]))';
// const parsed = parseRegex(regex);
// const nfa = buildNFA(parsed);
// // logdeep(nfa);
// const nfaEval = new NFAEval(nfa);

// nfaEval.prettyPrint(regex);
// const str = 'BBA';
// for (let i = 0; i < str.length; ++i) {
//   nfaEval.step(str[i]);

//   console.log(i, str[i]);
//   nfaEval.prettyPrint(regex, '  ');
// }


const tokenMap = {
  '.*[ \n\r\t\v]': 'space',
  '.*(?<![A-Za-z])[A-Z][A-Za-z0-9]*(?![A-Za-z0-9])\'*(?!\')[+*?]?(?![+*?])': 'id',
  '.*(?<![A-Za-z])[a-z][A-Za-z0-9]*(?![A-Za-z0-9])': 'token',
  '.*.': 'char'
};
const regexes = Object.keys(tokenMap);
const tokenNames = Object.values(tokenMap);

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
// import escape from 'js-string-escape';

(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  // printStates();
  for (let i = 0; i < str.length; ++i) {
    const c = str[i];
    console.log(`step('${escapeUnprintable(c)}')`);

    for (let j = 0; j < nfaEvals.length; ++j) {
      nfaEvals[j].step(c);

      if (nfaEvals[j].done())
        console.log(`found ${tokens[j]} at ${i}`);
    }

    // printStates();
  }

  console.log(cloneN);
})();
