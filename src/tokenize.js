import {logdeep} from './util/logdeep';
import {NFAEvalManager} from './alg/regex/nfa/manager';

const tokenMap = {
  '[ \n\r\t\v]': 'space',
  '(?<![A-Za-z])[A-Z][A-Za-z0-9]*(?![A-Za-z0-9])\'*(?!\')[+*?]?(?![+*?])': 'id',
  '(?<![A-Za-z])[a-z][A-Za-z0-9]*(?![A-Za-z0-9])': 'token'/*,
  '.': 'char'*/
};

const regexManagers = [];
const tokenNames = [];
export const numTokens = [];

for (const [rawRegex, tok] of Object.entries(tokenMap)) {
  const regex = `.*(${rawRegex})`;
  regexManagers.push(new NFAEvalManager(regex));
  tokenNames.push(tok);
  numTokens.push(0);
}

export const tokenize = (str) => {
  for (const m of regexManagers)
    m.setStr(str);

  const res = [];
  let column = 0;
  let line = 1;

  const tokMatches = new Map();
  for (let i = 0; i < str.length; ++i) {
    tokMatches.delete(i-1);

    const c = str[i];

    if (c === '\n') {
      ++line;
      column = 1;
    }
    else
      ++column;

    let nonTrivialStateFound = false;
    for (let j = 0; j < regexManagers.length; ++j) {
      const tok = tokenNames[j];

      const m = regexManagers[j];
      const nfaEval = m.nfaEval;
      nfaEval.step(c);
      nonTrivialStateFound = nonTrivialStateFound || nfaEval.hasNontrivialParseState();

      const regexResults = m.results();
      if (!regexResults.hasMatches)
        continue;

      const matches = regexResults.matches;
      if (matches.length !== 1)
        throw new Error(`token ${tok} has many match-states at ${line}:${column}`);

      const match = matches[0];
      if (match.length < 1)
        throw new Error(`token ${tok} has no capture groups at all at ${line}:${column}`);

      const wholeTokenGroup = match[0];
      if (tokMatches.has(wholeTokenGroup.end))
        throw new Error(`two matches at ${wholeTokenGroup.end}: ${tok} and ${tokMatches.get(wholeTokenGroup.end)}`);
      tokMatches.set(wholeTokenGroup.end, tok);
      ++numTokens[j];

      res.push({
        '?': tok,
        match: wholeTokenGroup,
        captures: match.slice(1),
      });
    }

    if (!nonTrivialStateFound) {
      res.push({
        '?': 'char',
        match: {
          start: i, end: i,
          str: c
        },
        captures: []
      });
      // throw new Error(`no token could meaningfully parse ${c} at ${line}:${column}. Unexpected character`);
    }
  }

  return res;
};
