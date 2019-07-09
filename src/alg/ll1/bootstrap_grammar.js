import {tok, ref, epsilon, buildGrammar} from './grammarTools';

export const grammarRep = {
  S: [[ref('Rules')]],

  Rules: [[ref('Rules\'')], [ref('Rule'), ref('Rules\'')]],
  'Rules\'': [
    [epsilon],
    [tok('space'), ref('Rules')]
  ],

  Rule: [[tok('id'), tok('-'), tok('>'), ref('AllowNL'), ref('Subs')]],

  Subs: [[ref('Sub'), ref('Subs\'')]],
  'Subs\'': [
    [epsilon],
    [ref('Subs')],
    [tok('|'), ref('AllowNL'), ref('Subs')]
  ],

  Sub: [
    [tok('id')],
    [tok('token')],
    [ref('Str')]
  ],

  Str: [[tok('\''), ref('StrPart')]],
  StrPart: [
    [tok('\'')],
    [tok('\\'), ref('Any'), ref('StrPart')],
    [ref('StrChar'), ref('StrPart')]
  ],

  StrChar: [
    [tok('strchar')],
    [tok('id')],
    [tok('token')],
    [tok('space')],
    [tok('-')],
    [tok('>')],
    [tok('|')]
  ],
  Any: [
    [ref('StrChar')],
    [tok('\'')],
    [tok('\\')]
  ],
  AllowNL: [[tok('space')], [epsilon]]
};
export const grammar = buildGrammar(grammarRep);
