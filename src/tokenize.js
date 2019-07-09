import {logdeep} from './util/logdeep';
import {NFAEvalManager} from './alg/regex/nfa/manager';
import {topotable, values as topotableValues} from './util/topotable';
import {IntervalMap} from './util/IntervalMap';

const tokenMap = {
  '[ \n\r\t\v]': 'space',
  '(?<![A-Za-z])[A-Z][A-Za-z0-9]*(?![A-Za-z0-9])\'*(?!\')[+*?]?(?![+*?])': 'id',
  '&?(?<![A-Za-z])[a-z][A-Za-z0-9]*(?![A-Za-z0-9])|&': 'token',
  '[^\'\\]': 'strchar',
  '\'': '\'',
  '\\\\': '\\',
  '-': '-',
  '>': '>',
  '\\|': '|',
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

preferToken('space', 'strchar');

preferToken('id', 'strchar');
preferToken('id', '\'');
preferToken('id', '\\');
preferToken('id', '-');
preferToken('id', '>');
preferToken('id', '|');

preferToken('token', 'strchar');
preferToken('token', '\'');
preferToken('token', '\\');
preferToken('token', '-');
preferToken('token', '>');
preferToken('token', '|');

preferToken('\'', 'strchar');
preferToken('\\', 'strchar');
preferToken('-', 'strchar');
preferToken('>', 'strchar');
preferToken('|', 'strchar');

const tokenTopotable = topotable(tokenN.size, tokenPrecedenceAdj);


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

  const tokMatches = new IntervalMap();

  let latestEmitted = 0;
  let latestBusy = -1; // todo: commit tokens early based on precedence
  // todo: manually clear regex states that will emit tokens that will be thrown away based on precedence

  for (let i = 0; i < str.length; ++i) {
    while (latestEmitted < latestBusy) {
      if (tokMatches.get(latestEmitted, latestEmitted+1) == null) {
        logdeep(tokMatches);
        throw new Error(`no match at ${latestEmitted}`);
      }

      if (tokMatches.getEndingAt(latestEmitted) != null)
        res.push(tokMatches.getEndingAt(latestEmitted));

      ++latestEmitted;
    }
    tokMatches.cleanUpTo(latestEmitted);

    const c = str[i];

    if (c === '\n') {
      ++line;
      column = 1;
    }
    else
      ++column;

    latestBusy = -1;
    let nonTrivialStateFound = false;
    for (let j = 0; j < regexManagers.length; ++j) {
      const tok = tokenNames[j];

      const m = regexManagers[j];
      const nfaEval = m.nfaEval;
      nfaEval.step(c);
      nonTrivialStateFound = nonTrivialStateFound || nfaEval.hasNontrivialParseState();

      for (const s of nfaEval.states) {
        const wholeTokenGroup = m.stateGroupMatch(s, 1);
        if (wholeTokenGroup.start == null || wholeTokenGroup.end == null)
          continue;

        if (latestBusy === -1)
          latestBusy = wholeTokenGroup.start;
        else
          latestBusy = Math.min(latestBusy, wholeTokenGroup.start);
      }

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

        if (tokenTopotable[j][oldMatchI] === topotableValues.before)
          continue;
        else if (tokenTopotable[j][oldMatchI] === topotableValues.after)
          --numTokens[oldMatchI];
        else {
          console.log(`${wholeTokenGroup.start}-${wholeTokenGroup.end}:`, str.substring(wholeTokenGroup.start, wholeTokenGroup.end));
          throw new Error(`two matches at ${wholeTokenGroup.start}: ${tok} and ${tokenNames[oldMatchI]}`);
        }
      }

      ++numTokens[j];
      const cur = {
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

  while (latestEmitted < str.length) { // todo: code duplication
    if (tokMatches.get(latestEmitted, latestEmitted+1) == null)
      throw new Error(`no match at ${latestEmitted}`);
    if (tokMatches.getEndingAt(latestEmitted) != null)
      res.push(tokMatches.getEndingAt(latestEmitted));
    ++latestEmitted;
  }

  return res;
};
