import {logdeep} from './util/logdeep';
import {NFAEvalManager} from './alg/regex/nfa/manager';
import {topotable, values as topotableValues} from './util/topotable';
import {IntervalMap} from './util/IntervalMap';

const tokenMap = {
  '[ \n\r\t\v]': 'space',
  '(?<![A-Za-z])[A-Z][A-Za-z0-9]*(?![A-Za-z0-9])\'*(?!\')[+*?]?(?![+*?])': 'id',
  '&?(?<![A-Za-z])[a-z][A-Za-z0-9]*(?![A-Za-z0-9])|&': 'token',
  '.': 'char'
};


const tokenPrecedenceAdj = [];
const tokenN = new Map();
{
  let i = 0;
  for (const v of Object.values(tokenMap)) {
    tokenN.set(v, i);
    tokenPrecedenceAdj[i] = [];
    ++i;
  }
}
const preferToken = (a, b) => {
  tokenPrecedenceAdj[tokenN.get(a)].push(tokenN.get(b));
};

for (const v of Object.values(tokenMap)) {
  if (v === 'char')
    continue;
  preferToken(v, 'char');
}

const tokenTopotable = topotable(tokenN.size, tokenPrecedenceAdj);


const tokenTokens = new Set(['id', 'token']);

const regexManagers = [];
const tokenNames = [];
export const numTokens = [];

for (const [rawRegex, tok] of Object.entries(tokenMap)) {
  const i = tokenN.get(tok);

  const regex = `.*(${rawRegex})`;
  regexManagers[i] = new NFAEvalManager(regex);
  tokenNames[i] = tok;
  numTokens[i] = 0;
}

export const tokenize = (str) => {
  for (const m of regexManagers)
    m.setStr(str);

  const res = [];
  let column = 0;
  let line = 1;

  // todo: check that each character is somehow parsed
  const tokMatches = new IntervalMap();
  for (let i = 0; i < str.length; ++i) {
    if (tokMatches.getEndingAt(i-1) != null)
      res.push(tokMatches.getEndingAt(i-1));
    tokMatches.cleanUpTo(i-1);

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

      const oldMatch = tokMatches.get(wholeTokenGroup.start, wholeTokenGroup.end);
      if (oldMatch != null) {
        const oldMatchI = tokenN.get(oldMatch['?']);

        if (tokenTopotable[j][oldMatchI] === topotableValues.before) {
          console.log(`not changing ${wholeTokenGroup.start}-${wholeTokenGroup.end} from ${tokenNames[oldMatchI]} to ${tok}`);
          continue;
        }
        else if (tokenTopotable[j][oldMatchI] === topotableValues.after) {
          console.log(`changing ${wholeTokenGroup.start}-${wholeTokenGroup.end} from ${tokenNames[oldMatchI]} to ${tok}`);
          --numTokens[oldMatchI];
        }
        else
          throw new Error(`two matches at ${wholeTokenGroup.start}: ${tok} and ${tokenNames[oldMatchI]}`);
      }

      ++numTokens[j];
      let cur = null;
      if (tokenTokens.has(tok))
        cur = {
          '?': 'token',
          x: tok,
          match: wholeTokenGroup,
          captures: match.slice(1),
        };
      else
        cur = {
          '?': tok,
          x: wholeTokenGroup.str,
          match: wholeTokenGroup,
          captures: match.slice(1),
        };
      tokMatches.set(wholeTokenGroup.start, wholeTokenGroup.end, cur);
    }

    if (!nonTrivialStateFound)
      throw new Error(`no token could meaningfully parse ${c} at ${line}:${column}. Unexpected character`);
  }

  return res;
};
