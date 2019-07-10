import {tok, ref, epsilon, buildGrammar} from './grammarTools';

export const grammarRep = {
  S: [[ref('Rules')]],

  Rules: [
    [epsilon],
    [tok('id'), tok('-'), tok('>'), ref('Subs'), ref('Rules\'')]
  ],
  'Rules\'': [
    [epsilon],
    [tok('space'), ref('Rules')]
  ],

  Subs: [
    [ref('Sub'), ref('Subs\'')]
  ],
  'Subs\'': [
    [epsilon],
    [ref('Subs')],
    [tok('|'), ref('Subs')]
  ],

  Sub: [
    [tok('id')],
    [tok('token')],
    [tok('\''), ref('StrPart')]
  ],

  StrPart: [
    [tok('\'')],
    [tok('\\'), ref('StrEscape')],
    [tok('strchar'), ref('StrPart')],
    [tok('id'), ref('StrPart')],
    [tok('token'), ref('StrPart')],
    [tok('space'), ref('StrPart')],
    [tok('-'), ref('StrPart')],
    [tok('>'), ref('StrPart')],
    [tok('|'), ref('StrPart')]
  ],
  StrEscape: [
    [tok('strchar'), ref('StrPart')],
    [tok('id'), ref('StrPart')],
    [tok('token'), ref('StrPart')],
    [tok('space'), ref('StrPart')],
    [tok('-'), ref('StrPart')],
    [tok('>'), ref('StrPart')],
    [tok('|'), ref('StrPart')],
    [tok('\''), ref('StrPart')],
    [tok('\\'), ref('StrPart')]
  ]
};
export const grammar = buildGrammar(grammarRep);
