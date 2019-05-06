import {tok, lit, space, ref, special, epsilon, buildGrammar} from './grammarTools';

export const grammarRep = {
  S: [[ref('Rules')]],

  Rules: [[ref('Rules\'')], [ref('Rule'), ref('Rules\'')]],
  'Rules\'': [
    [epsilon],
    [space('\n'), ref('Rules')]
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
    [tok('token')],
    [ref('Str')]
  ],

  Str: [[lit('\''), ref('StrChar')]],
  StrChar: [
    [lit('\'')],
    [lit('\\'), special('any'), ref('StrChar')],
    [special('any'), ref('StrChar')]
  ],

  AllowNL: [[space('\n')], [epsilon]]
};
export const grammar = buildGrammar(grammarRep);
