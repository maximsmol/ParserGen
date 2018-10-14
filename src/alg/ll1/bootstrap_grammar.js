import {tok as gtok, ref, special, epsilon, buildGrammar} from './grammarTools';
import escapeString from 'js-string-escape';

const tok = x => {
  if (!/[a-z]/.test(x[0]))
    throw new Error(`Token id ${x} is invalid.`);
  return gtok(x);
};
const lit = x => gtok(`'${escapeString(x)}'`);

export const grammarRep = {
  S: [[ref('Rules')]],

  Rules: [[ref('Rules\'')], [ref('Rule'), ref('Rules\'')]],
  'Rules\'': [
    [epsilon],
    [lit('\n'), ref('Rules')]
  ],

  Rule: [[tok('id'), lit('-'), lit('>'), ref('AllowNL'), ref('Subs')]],

  Subs: [[ref('Sub'), ref('Subs\'')]],
  'Subs\'': [
    [epsilon],
    [ref('Subs')],
    [lit('|'), ref('AllowNL'), ref('Subs')]
  ],

  Sub: [
    [tok('id')],
    [ref('Str')]
  ],

  Str: [[lit('\''), ref('StrChar')]],
  StrChar: [
    [lit('\'')],
    [lit('\\'), special('any'), ref('StrChar')],
    [special('any'), ref('StrChar')]
  ],

  AllowNL: [[lit('\n')], [epsilon]]
};
export const grammar = buildGrammar(grammarRep);
