import util from 'util';

export class DictKeyedMap {
  constructor(keyOrder) {
    this.data = new Map();
    this.keyOrder = keyOrder;
    this.size = 0;
  }

  set(dict, v) {
    let m = this.data;
    for (let i = 0; i < this.keyOrder.length-1; ++i) {
      const k = this.keyOrder[i];
      const v = dict[k];

      let m1 = m.get(v);
      if (m1 == null) {
        m1 = new Map();
        m.set(v, m1);
      }
      m = m1;
    }

    const key = dict[this.keyOrder[this.keyOrder.length-1]];
    if (!m.has(key))
      ++this.size;
    m.set(key, v);
  }
  get(dict) {
    let m = this.data;
    for (let i = 0; i < this.keyOrder.length-1; ++i) {
      const k = this.keyOrder[i];
      const v = dict[k];

      let m1 = m.get(v);
      if (m1 == null)
        return null;
      m = m1;
    }

    return m.get(dict[this.keyOrder[this.keyOrder.length-1]]);
  }
  has(dict) {
    return this.get(dict) != null;
  }
  clear() {
    this.data.clear();
    this.size = 0;
  }
  /*recomputeSize() {
    let res = 0;

    let q = [];
    q.push({map: this.data, depth: 0});
    while (q.length !== 0) {
      const step = q.pop();

      if (step.depth === this.keyOrder.length-1) {
        res += step.map.size;
        continue;
      }

      for (let [,subMap] of step.map)
        q.push({
          map: subMap,
          depth: step.depth+1
        });
    }

    return res;
  }*/

  [Symbol.iterator]() {
    const self = this;
    const iterate = function*(map, obj, i) {
      if (i === self.keyOrder.length) {
        yield [obj, map];
        return;
      }

      const key = self.keyOrder[i];

      for (const [val, submap] of map)
        for (const res of iterate(submap, Object.assign({}, obj, {[key]: val}), i+1))
          yield res;
    };

    return iterate(this.data, {}, 0);
  }
  *keys() {
    for (const [k,] of this)
      yield k;
  }
  *values() {
    for (const [,v] of this)
      yield v;
  }
  entries() {
    return this[Symbol.iterator]();
  }

  [util.inspect.custom](depth, options) {
    if (depth < 0)
      return `DictKeyedMap ${this.keyOrder}`;

    const res = ['DictKeyedMap {'];

    const indent = ' '.repeat(options.indentationLvl);
    if (options.depth !== null)
      --options.depth;
    options.indentationLvl += 3;

    for (const [k, v] of this)
      res.push(`${indent}   ${util.inspect(k, options)} => ${util.inspect(v, options)}`);
    res.push(indent+'}');

    if (options.depth !== null)
      ++options.depth;
    options.indentationLvl -= 3;

    return res.join('\n');
  }
}
