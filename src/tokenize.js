import {Transform} from 'stream';

import {tagPart, tok, special, partEq} from './alg/ll1/grammarTools';

import escapeStringRegexp from 'escape-string-regexp';
import escapeString from 'js-string-escape';
const lit = x => tok(`'${escapeString(x)}'`);

const internal = x => tagPart('internal', x);

export const tokenize = (str) => {
  const toks = [];

  const lits = ['\n', '-', '>', '|', '\'', '\\'];
  for (const l of lits)
    toks.push([new RegExp('^'+escapeStringRegexp(l)), lit(l)]);

  toks.push([/^[&\w][\w']*/, tok('id')]);

  toks.push([/^\s+/, internal('space')]);
  toks.push([/^./, special('any')]);
  const res = [];

  const escapeMap = {
    'n': '\n',
    '\\': '\\',
    '\'': '\''
  };

  let inStr = false;
  let escape = false;
  let inWinLF = false;
  while (str.length > 0) {
    if (escape) {
      res.push([special('any'), escapeMap[str[0]]]);
      str = str.slice(1);
      escape = false;
      continue;
    }

    if (str[0] === '\n') {
      if (str[1] === '\r') {
        inWinLF = true;
        res.push([internal('lf'), '\n\r']);
      }
      else
        res.push([internal('lf'), '\n']);
    }
    else if (str[0] === '\r') {
      if (inWinLF)
        inWinLF = false;
      else
        res.push([internal('lf'), '\r']);
    }

    if (inStr) {
      const c = str[0];
      if (c === '\'') {
        res.push([lit('\''), c]);
        inStr = false;
      }
      else if (c === '\\') {
        res.push([lit('\\'), c]);
        escape = true;
      }
      else
        res.push([special('any'), c]);
      str = str.slice(1);
      continue;
    }

    for (const [reg, tok] of toks) {
      const match = reg.exec(str);
      if (match == null)
        continue;

      if (tok != null) {
        if (partEq(tok, lit('\\')))
          escape = true;

        if (partEq(tok, lit('\'')))
          inStr = true;

        res.push([tok, match[0]]);
      }
      str = str.slice(match[0].length);
      break;
    }
  }

  return res;
};
