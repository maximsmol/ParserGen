import util from 'util';

import {DictKeyedMap} from './DictKeyedMap';

export class DictKeyedSet {
  constructor(keyOrder) {
    this.data = new DictKeyedMap(keyOrder);
  }

  add(v) {
    this.data.set(v, v);
  }
  has(v) {
    return this.data.has(v);
  }

  *[Symbol.iterator]() {
    for (const entry of this.data)
      yield entry[0];
  }
  values() {
    return this[Symbol.iterator]();
  }

  [util.inspect.custom](depth, options) {
    if (depth < 0)
      return `{ DictKeyedSet ${this.keyOrder} }`;

    const res = ['DictKeyedSet {'];

    const indent = ' '.repeat(options.indentationLvl);
    if (options.depth !== null)
      --options.depth;
    options.indentationLvl += 3;

    for (const v of this)
      res.push(`${indent}   ${util.inspect(v, options)}`);
    res.push(indent+'}');

    if (options.depth !== null)
      ++options.depth;
    options.indentationLvl -= 3;

    return res.join('\n');
  }
}
