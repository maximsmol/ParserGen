import {parse as parseRegex} from './alg/regex/recDescent';
import {printASTTree as printRegexASTTree} from './alg/regex/regexStrAST_renderer';
import {buildNFA} from './alg/regex/nfa/thompson';
import {NFAEval} from './alg/regex/nfa/eval';
import {nfaToGrafviz} from './alg/regex/nfa/nfaToGrafviz';
import {logdeep} from './util/logdeep';
import {escapeUnprintable} from './util/escapeUnprintable';

// const regex = '(A|B+(?!B))(?!A)';
const regex = '.*[A-Z][a-z]*((?![a-z])|(\'*[?+*]|\'+)(?![\'?+*]))';
const parsed = parseRegex(regex);
const nfa = buildNFA(parsed);
// logdeep(nfa);
const nfaEval = new NFAEval(nfa);


const print = (nfaEval) => {
  console.log(`  ${nfaEval.statusString()}. # L-Bs: ${nfaEval.lookbehindEvals.size}`);

  for (const s of nfaEval.states) {
    let pos = nfaEval.nfa.stateSourcePosition[s.nfaState];
    const str = regex;

    if (pos === -1)
      pos = str.length;

    // have to re-escape or additional symbols added after escaping will mess up pos
    const prefix = escapeUnprintable(regex.substring(0, pos));

    console.log(`  #${s.nfaState}@${prefix.length}. # L-As: ${Array.from(s.lookaheadEvals).length}`);
    console.log('  '+prefix+' '+str.substring(prefix.length));
    console.log('  '+' '.repeat(prefix.length)+'^');
  }
};
print(nfaEval);
const str = 'BBA';
for (let i = 0; i < str.length; ++i) {
  nfaEval.step(str[i]);

  console.log(i, str[i]);
  print(nfaEval);
}

/*const tokenMap = {
  '.*[ \n\r\t\v]': 'space',
  '.*[A-Z][a-z]*[\'?+*]?(?![A-Z][a-z]*[\'?+*]?)': 'id',
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

const escapedRegexes = [];
for (const regex of regexes)
  escapedRegexes.push(escapeUnprintable(regex));
const printStates = () => {
  for (let i = 0; i < nfaEvals.length; ++i) {
    console.log(i);
    for (const state of nfaEvals[i].states) {
      let pos = nfaEvals[i].nfa.stateSourcePosition[state];
      const str = escapedRegexes[i];

      if (pos === -1)
        pos = str.length;

      // have to re-escape or additional symbols added after escaping will mess up pos
      const prefix = escapeUnprintable(regexes[i].substring(0, pos));

      console.log(`  #${state}@${prefix.length}:`);
      console.log('  '+prefix+' '+str.substring(prefix.length));
      console.log('  '+' '.repeat(prefix.length)+'^');
    }
  }
};

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
})();*/
