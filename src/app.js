import {logdeep} from './util/logdeep';
import {tokenize} from './tokenize';

import {promises as fs} from 'fs';
(async ()=>{
  const str = (await fs.readFile('./src/grammarGrammar.ll')).toString();

  logdeep(tokenize(str));
})();
