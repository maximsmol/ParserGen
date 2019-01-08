import {tok, lit, ref, special, epsilon, buildGrammar} from './grammarTools';

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
