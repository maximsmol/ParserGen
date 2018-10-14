import util from 'util';

import escapeString from 'js-string-escape';

import {coerceWDefault} from './coerceWDefault';

const tok = x => ({
  '?': 'tok', x
});
const ref = x => ({
  '?': 'ref', x
});
const lit = x => ({
  '?': 'lit', x
});
const epsilon = {
  '?': 'epsilon'
};
const special = x => ({
  '?': 'special', x
});



class TokenKeyedMap {
  constructor() {
    this.data = new Map();
  }
  get(k) {
    const m = this.data.get(k['?']);
    return m == null ? null : m.get(k.x);
  }
  set(k, v) {
    let m = this.data.get(k['?']);
    if (m == null) {
      m = new Map();
      this.data.set(k['?'], m);
    }
    m.set(k.x, v);
  }
  has(k) {
    const m = this.data.get(k['?']);
    return m == null ? false : m.has(k.x);
  }
  *[Symbol.iterator]() {
    for (const [type, m] of this.data.entries())
      for (const [x, v] of m)
        yield [{
          '?': type, x
        }, v];
  }
}

class TokenSet {
  constructor() {
    this.data = new TokenKeyedMap();
  }
  add(v) {
    this.data.set(v, [true, this.getMeta(v)]);
  }
  has(v) {
    const data = this.data.get(v);
    return data != null && data[0];
  }
  *[Symbol.iterator]() {
    for (const [v,] of this.data)
      yield v;
  }

  setMeta(k, meta) {
    this.data.set(k, [this.has(k), meta]);
  }
  getMeta(k) {
    const data = this.data.get(k);
    return data != null ? data[1] : null;
  }
}



const eq = (a, b) =>
  a['?'] === b['?'] && a.x === b.x;


const unpackTerminal = x =>
  x['?'] === 'lit' ? Array.from(x.x).map(c => lit(c)) : [x];

const buildGrammar = desc => {
  const res = {
    rules: [],
    nts: new Set()
  };

  for (const [nt, subs] of Object.entries(desc)) {
    res.nts.add(nt);
    for (const sub of subs)
      res.rules.push({
        nt,
        sub: Array.prototype.concat.apply([], sub.map(x => unpackTerminal(x)))
      });
  }

  res.nts = Array.from(res.nts);
  return res;
};


const firstOf = x =>
  x['?'] === 'lit' ? lit(x.x[0]) : x;

const buildFirstSets = g => {
  const fiWs = new Array(g.rules.length);
  for (let i = 0; i < fiWs.length; ++i)
    fiWs[i] = new TokenSet();

  const fiAs = new Map();
  for (const nt of g.nts)
    fiAs.set(nt, new TokenSet());

  let changed = false;
  do {
    changed = false;

    //
    // for every rule:
    // take the first part of sub
    // if it is a terminal, add to the first-set
    // otherwise
    //   take the first-set of the non-terminal
    //   if it does not contain epsilon, add it to the first-set
    //   otherwise, add everything except epsilon to the first-set and search until
    //     found something that does not accept epsilon
    //     found the end of the sub, indicating that it can entirely collapse to epsilon
    //
    for (let i = 0; i < g.rules.length; ++i) {
      const fiW = fiWs[i];
      const rule = g.rules[i];

      let subI = 0;
      let f = firstOf(rule.sub[subI]);

      const addFiW = (f, source) => {
        let meta = fiW.getMeta(f);
        if (meta == null) {
          meta = new Set();
          fiW.setMeta(f, meta);
        }

        if (!fiW.has(f))
          changed = true;
        if (!meta.has(source))
          changed = true;
        fiW.add(f);
        meta.add(source);
      };

      let finished = false;
      while (f['?'] === 'ref') {
        if (!fiAs.has(f.x))
          throw new Error(`Undefined NT ${f.x}. Referenced from rule ${i}.`);

        const nt = f.x;
        const fiA = fiAs.get(nt);
        if (!fiA.has(epsilon)) {
          for (const f of fiA)
            addFiW(f, nt);
          finished = true;
          break;
        }

        for (const f of fiA) {
          if (f['?'] === 'epsilon')
            continue;

          addFiW(f, nt);
        }

        if (++subI === rule.sub.length) {
          fiW.add(epsilon);
          finished = true;
          break;
        }
        f = firstOf(rule.sub[subI]);
      }
      if (finished)
        continue;

      addFiW(f, i);
    }

    for (let i = 0; i < g.rules.length; ++i) {
      const fiW = fiWs[i];
      const rule = g.rules[i];

      const fiA = fiAs.get(rule.nt);

      for (const f of fiW) {
        let meta = fiA.getMeta(f);
        if (meta == null) {
          meta = new Set();
          fiA.setMeta(f, meta);
        }

        if (!fiA.has(f))
          changed = true;
        if (!meta.has(i))
          changed = true;
        fiA.add(f);
        meta.add(i);
      }
    }
  } while (changed);

  return {fiWs, fiAs};
};

const buildFollowSet = (g, {fiAs}) => {
  const foAs = new Map();
  for (const nt of g.nts) {
    const s = new TokenSet();
    foAs.set(nt, s);
    s.add(epsilon);
  }

  let changed = false;
  do {
    changed = false;

    const add = (set, x, source) => {
      let meta = set.getMeta(x);
      if (meta == null) {
        meta = new Map();
        set.setMeta(x, meta);
      }

      if (!set.has(x))
        changed = true;
      if (!meta.has(source[0]))
        changed = true;
      set.add(x);
      meta.set(source[0], source[1]);
    };

    const addAll = (set1, set2, source) => {
      for (const f of set2)
        add(set1, f, source);
    };

    for (let i = 0; i < g.rules.length; ++i) {
      const rule = g.rules[i];
      const sub = rule.sub;

      if (sub.length !== 0) { // last part can be followed by everything we can be followed
        const last = sub[sub.length-1];

        if (last['?'] === 'ref')
          addAll(foAs.get(last.x), foAs.get(rule.nt), [rule.nt, 'Fo('+rule.nt+')@'+i]);
      }

      for (let j = 0; j < sub.length-1; ++j) {
        const sub1 = sub[j];

        let sub2I = j+1;
        let sub2 = sub[sub2I];

        if (sub1['?'] !== 'ref')
          continue;

        const foA = foAs.get(sub1.x);

        while (sub2I < sub.length) {
          if (sub2['?'] === 'ref') { // followed by any start of the next token
            addAll(foA, fiAs.get(sub2.x), [sub2.x, 'Fi('+sub2.x+')@'+i]);

            if (!fiAs.get(sub2.x).has(epsilon))
              break;

            ++sub2I;
            sub2 = sub[sub2I];
            continue;
          }

          add(foA, firstOf(sub2), [sub2.x, sub2.x+'@'+i]);
          break;
        }
      }
    }
  } while (changed);

  // console.log(util.inspect(foAs, {depth: null}));
  return foAs;
};

const findTerminals = g => {
  const res = new TokenSet();
  for (const rule of g.rules) {
    for (const s of rule.sub) {
      if (s['?'] === 'ref')
        continue;

      res.add(s);
    }
  }
  return Array.from(res);
};

const renderInclusionCauseArray = xs => {
  if (xs.length === 1)
    return xs[0];

  return `[${xs.join(', ')}]`;
};

const renderSetInclusionCause1 = (data, key, t, visited) => {
  const res = [];

  let set = data instanceof Map ? data.get(key) : data[key];
  if (set == null)
    return '-';

  let cause = set.getMeta(t);
  if (cause == null)
    return '-';

  for (const [c, str] of cause.entries()) {
    if (visited.has(c))
      continue;
    visited.add(c);

    res.push(str+' <- '+renderSetInclusionCause1(data, c, t, visited));
  }

  if (res.length === 0)
    return '-';
  return renderInclusionCauseArray(res);
};

const renderSetInclusionCause = (data, key, t) => renderSetInclusionCause1(data, key, t, new Set());

const buildTable = (g, {fiWs, foAs}) => {
  const ts = findTerminals(g);

  const res = new Map();
  for (const nt of g.nts)
    res.set(nt, new TokenKeyedMap());

  for (let i = 0; i < g.rules.length; ++i) {
    const rule = g.rules[i];
    const nt = rule.nt;

    const m = res.get(nt);

    const fiW = fiWs[i];
    const foA = foAs.get(nt);
    for (const t of ts)
      if (fiW.has(t) || fiW.has(epsilon) && foA.has(t)) {
        if (m.has(t)) {
          const i1 = m.get(t);
          const nt1 = g.rules[i1].nt;
          const fiW1 = fiWs[i1];
          const foA1 = foAs.get(nt1);

          const isFi1 = fiW1.has(t);
          const isFi = fiW.has(t);

          const fiFo1 = isFi1 ? `Fi(${i1})` : `Fo(${nt1})`;
          const fiFo = isFi ? `Fi(${i})` : `Fo(${nt})`;

          throw new Error(`${isFi1 && isFi ? 'First-first' : 'Follow-first'} conflict at ${renderTerminal(t)} for ${nt} (rules ${i1} and ${i} both apply). `+
            `${fiFo1} intersects ${fiFo}. `+
            `${renderTerminal(t)} is in ${fiFo1} from ${renderSetInclusionCause(isFi1 ? fiWs : foAs, isFi1 ? i1 : nt1, t)} and in ${fiFo} from ${renderSetInclusionCause(isFi ? fiWs : foAs, isFi ? i : nt, t)}`);
        }
        m.set(t, i);
      }
  }

  return res;
};

const renderTerminal = x => {
  if (x['?'] === 'special')
    return '&'+x.x;
  if (x['?'] === 'epsilon')
    return '&';
  if (x['?'] === 'tok')
    return x.x;
  if (x['?'] === 'lit')
    return `'${escapeString(x.x)}'`;

  throw new Error(`Could not render terminal: "${util.inspect(x, {depth: null})}"`);
};

const renderPart = x =>
  x['?'] === 'ref' ? x.x : renderTerminal(x);

const padCenter = (x, l) => {
  const dl = l - x.length;
  return ' '.repeat((dl+1)/2)+x+' '.repeat(dl/2);
};

const renderTabular = (dat, options) => {
  options = coerceWDefault({
    centered: [],
    left: [],
    right: [0],
    default: 'centered'
  }, options);

  const maxLs = [];
  for (let x = 0; x < dat[0].length; ++x) {
    let maxL = 0;
    for (let y = 0; y < dat.length; ++y)
      maxL = Math.max(dat[y][x].length, maxL);
    maxLs.push(maxL);
  }

  for (const row of dat)
    for (let x = 0; x < row.length; ++x) {
      let padded = '';

      if (options.left.includes(x))
        padded = row[x].padEnd(maxLs[x]);
      else if (options.right.includes(x))
        padded = row[x].padStart(maxLs[x]);
      else if (options.centered.includes(x))
        padded = padCenter(row[x], maxLs[x]);
      else if (options.default === 'left')
        padded = row[x].padEnd(maxLs[x]);
      else if (options.default ==='right')
        padded = row[x].padStart(maxLs[x]);
      else if (options.default === 'centered')
        padded = padCenter(row[x], maxLs[x]);
      else
        throw new Error(`Unknown padding for tabular: "${options.default}"`);

      row[x] = padded;
    }

  return dat.map(x => x.join(' ')).join('\n');
};

const renderTable = (g, table) => {
  const ts = findTerminals(g);
  const res = [];

  const l = [''];
  for (const t of ts)
    l.push(renderTerminal(t));
  res.push(l);

  for (const [nt, row] of table) {
    const line = [nt];

    for (const t of ts) {
      const n = row.get(t);
      line.push(n == null ? '' : String(n));
    }
    res.push(line);
  }

  return renderTabular(res);
};

const renderSub = sub => {
  let str = [];
  for (const s of sub)
    str.push(renderPart(s));
  return str.join(' ');
};

const renderRuleReference = g => {
  const res = [];
  for (let i = 0; i < g.rules.length; ++i) {
    const rule = g.rules[i];

    const line = [String(i)+':', rule.nt, '->', renderSub(rule.sub)];
    res.push(line);
  }

  return renderTabular(res, {
    right: [0, 2],
    default: 'left'
  });
};

const parseStep = (g, table, stack, tok, res) => {
  let top = stack[stack.length-1];
  for (;;) {
    if (top['?'] === 'NT end') {
      res.push(top);
      stack.pop();
    }
    else if (top['?'] === 'ref') {
      stack.pop();
      res.push({'?': 'NT start', x: top.x});
      stack.push({'?': 'NT end', x: top.x});

      let n = table.get(top.x).get(tok);
      if (n == null) {
        n = table.get(top.x).get(special('any'));
        if (n == null)
          throw new Error(`Unexpected token ${renderPart(tok)}, when parsing ${renderPart(top)}.`);
      }

      const rule = g.rules[n];
      const sub = rule.sub;
      for (let i = sub.length-1; i >= 0; --i) {
        if (tok['?'] !== 'epsilon' && sub[i]['?'] === 'epsilon')
          continue;
        stack.push(sub[i]);
      }

      // console.log(`${n}: ${rule.nt} -> ${renderSub(sub)}`);
    }
    else break;

    if (stack.length === 0)
      throw new Error('Ran out of stack');
    top = stack[stack.length-1];
  }

  if (!eq(tok, top) && !eq(top, special('any')))
    throw new Error(`Unexpected token ${renderPart(tok)}, when parsing ${renderPart(top)}.`);
  res.push(tok);
  stack.pop();
};


const grammar = buildGrammar({
  S: [[ref('Rules')]],

  Rules: [[epsilon], [ref('Rule'), ref('Rules\'')]],
  'Rules\'': [
    [epsilon],
    [lit('\n'), ref('Rules')]
  ],

  Rule: [[tok('id'), lit('->'), ref('Subs')]],

  Subs: [[ref('Sub'), ref('Subs\'')]],
  'Subs\'': [
    [epsilon],
    [ref('Subs')],
    [lit('|'), ref('Subs')]
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
  ]
});

// console.log(util.inspect(grammar, {depth: null, colors: true}));

console.log(renderRuleReference(grammar));
console.log();

const firstSets = buildFirstSets(grammar);
const followSets = buildFollowSet(grammar, firstSets);
const sets = {
  fiWs: firstSets.fiWs,
  foAs: followSets
};
// console.log(util.inspect(sets, {depth: null, colors: true}));
const table = buildTable(grammar, sets);
console.log(renderTable(grammar, table));


const tokenize = (str) => {
  const res = [];
  let tok = null;

  let col = 1;
  let line = 1;
  const newTok = () => {
    tok.pos = {
      col, line
    };
    res.push(tok);
    tok = null;
  };

  let nextIsLiteral = false;
  let disableSpecials = false;

  for (const x of str) {
    if (!nextIsLiteral && x === '\n') {
      col = 0;
      ++line;
    }

    if (tok != null) {
      if (tok['?'] === 'tok') {
        if (tok.x === 'id')
          if (/[a-zA-Z']/.test(x))
            tok.data += x;
          else
            newTok();
      }
    }

    if (tok == null) {
      if (!disableSpecials && !nextIsLiteral && /[&a-zA-Z]/.test(x))
        tok = {
          '?': 'tok', x: 'id', data: x
        };
      else if (nextIsLiteral || disableSpecials || x !== ' ') {
        if (!nextIsLiteral && x === '\'')
          disableSpecials = !disableSpecials;
        if (!nextIsLiteral && x === '\\')
          nextIsLiteral = true;
        else
          nextIsLiteral = false;

        tok = {
          '?': 'lit', x
        };
        newTok();
      }
    }

    ++col;
  }

  return res;
};

const traverseAst = (node, traversers) => {
  const traverser = traversers[node['?']];
  if (traverser != null)
    traverser(node);

  if (node.children == null)
    return;

  for (const c of node.children)
    traverseAst(c, traversers);
};

console.log();

import {promises as fs} from 'fs';
(async () => {
  const f = await fs.readFile('./src_old/grammarGrammar.ll');
  const fstr = f.toString();
  const ftoks = tokenize(fstr);

  const res = [];
  const stack = [ref('S')];
  for (const tok of ftoks)
    parseStep(grammar, table, stack, tok, res);
  parseStep(grammar, table, stack, epsilon, res);


  const astStack = [];
  let cur = null;

  const pushCur = () => {
    astStack.push(cur);
    cur = null;
  };

  const popCur = () => {
    const newCur = astStack.pop();
    newCur.children.push(cur);
    cur = newCur;
  };

  for (const x of res) {
    if (x['?'] === 'NT start') {
      pushCur();
      cur = {
        '?': x.x,
        children: []
      };
    }
    else if (x['?'] === 'NT end')
      popCur();
    else
      cur.children.push(x);
  }

  while (astStack.length !== 1)
    popCur();


  const strToStr = str => {
    let res = '';

    const processStrChar = strChar => {
      let escape = false;
      for (const c of strChar.children) {
        if (c['?'] === 'lit') {
          if (!escape && c.x === '\\') {
            escape = true;
            continue;
          }

          if (escape) {
            if (c.x === '\\')
              res += '\\';
            else if (c.x === 'n')
              res += '\n';
            else
              res += c.x;

            escape = false;
            continue;
          }

          res += c.x;
        }
        else
          processStrChar(c);
      }
    };
    processStrChar(str.children[1]); // skip '

    return res.slice(0, -1); // remove ending '
  };

  const traverseSubs = subs => {
    const res = [];
    let subRes = [];

    const processSub = sub => {
      const tok = sub.children[0];
      if (tok['?'] === 'tok' && tok.x === 'id') {
        if (tok.data === '&')
          return epsilon;
        else if (tok.data[0] === '&')
          return special(tok.data.slice(1));

        return ref(tok.data);
      }
      else if (tok['?'] === 'Str')
        return lit(strToStr(tok));

      return tok;
    };

    let traverseSubsPrime = null;
    const iterateSubs = children => {
      subRes.push(processSub(children[0]));
      traverseSubsPrime(children[1].children);
    };
    traverseSubsPrime = children => {
      if (children.length === 0)
        return;

      const c0 = children[0];
      if (c0['?'] === 'lit' && c0.x === '|') {
        res.push(subRes);
        subRes = [];
        iterateSubs(children[1].children);
      }
      else if (c0['?'] === 'Subs')
        iterateSubs(c0.children);
      //else it's epsilon
    };
    iterateSubs(subs.children);

    res.push(subRes);
    return res;
  };

  const readDesc = {};
  traverseAst(cur, {
    'Rule': n => {
      readDesc[n.children[0].data] = traverseSubs(n.children[3]);
    }
  });
  // console.log(util.inspect(readDesc, {depth: null, colors: true}));

  const readGrammar = buildGrammar(readDesc);
  console.log(renderRuleReference(readGrammar));
  console.log();

  const readFirstSets = buildFirstSets(readGrammar);
  const readFollowSets = buildFollowSet(readGrammar, readFirstSets);
  const readSets = {
    fiWs: readFirstSets.fiWs,
    foAs: readFollowSets
  };
  console.log(util.inspect(readSets, {depth: null, colors: true}));
  const readTable = buildTable(readGrammar, readSets);
  console.log(renderTable(readGrammar, readTable));
})();
