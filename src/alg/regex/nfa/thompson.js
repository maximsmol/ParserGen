import {renderNode} from '../regexStrAST_renderer';

const getStartOfNode = (node) => {
  const mapping = node.sourceMapInfo;

  if (mapping == null)
    throw new Error(`mapping invalid in ${renderNode(node)}`);

  if (mapping.range.start == null)
    throw new Error(`mapping has no start in ${renderNode(node)}`);

  return mapping.range.start;
};
const getAnchorOfNode = (node) => {
  const mapping = node.sourceMapInfo;

  if (mapping == null)
    throw new Error(`mapping invalid in ${renderNode(node)}`);

  if (mapping.anchor == null)
    throw new Error(`mapping has no anchor in ${renderNode(node)}`);

  return mapping.anchor;
};
const getEndOfNode = (node) => {
  const mapping = node.sourceMapInfo;

  if (mapping == null)
    throw new Error(`mapping invalid in ${renderNode(node)}`);

  if (mapping.range.end == null)
    throw new Error(`mapping has no end in ${renderNode(node)}`);

  return mapping.range.end;
};

class ThompsonConstructor {
  constructor() {
    this.lastState = 1; // s, f, ...
    this.stateMappings = [];
    this.arrows = [];
    this.lookaroundNFAs = new Map();

    this.groupBoundaries = new Map();
    this.groupId = 1;
  }

  addArrow(s, f, type, x) {
    let adjL = this.arrows[s];
    if (adjL == null) {
      adjL = [];
      this.arrows[s] = adjL;
    }

    adjL.push({
      '?': type, f, x
    });
  }
  newStateId(sourcePosition) {
    ++this.lastState;
    this.stateMappings[this.lastState] = sourcePosition;
    return this.lastState;
  }

  build_(s, regex) {
    if (regex['?'] === '&') {
      const ep = this.newStateId(getEndOfNode(regex));
      this.addArrow(s, ep, '&', null);
      return ep;
    }
    if (regex['?'] === '.') {
      const ch = this.newStateId(getEndOfNode(regex));
      this.addArrow(s, ch, '.', null);
      return ch;
    }
    if (regex['?'] === 'char') {
      const ch = this.newStateId(getEndOfNode(regex));
      this.addArrow(s, ch, 'char', regex.x);
      return ch;
    }
    if (regex['?'] === '[]') {
      const ch = this.newStateId(getEndOfNode(regex));
      if (!regex.inverse)
        this.addArrow(s, ch, 'class', regex.x);
      else
        this.addArrow(s, ch, 'inv_class', regex.x);
      return ch;
    }
    if (regex['?'] === '|') {
      const a = this.newStateId(getStartOfNode(regex.a));
      const b = this.newStateId(getStartOfNode(regex.b));
      this.addArrow(s, a, '&', null);
      this.addArrow(s, b, '&', null);

      const aF = this.build_(a, regex.a);
      const bF = this.build_(b, regex.b);
      const f = this.newStateId(getEndOfNode(regex));
      this.addArrow(aF, f, '&', null);
      this.addArrow(bF, f, '&', null);

      return f;
    }
    if (regex['?'] === '(?:)') {
      let last = s;
      for (const x of regex.x)
        last = this.build_(last, x);
      return last;
    }
    if (regex['?'] === '()') {
      const entrance = this.newStateId(getStartOfNode(regex));
      const exit = this.newStateId(getEndOfNode(regex));

      this.groupBoundaries.set(entrance, this.groupId);
      this.groupBoundaries.set(exit, -this.groupId);
      ++this.groupId;

      this.addArrow(s, entrance, '&', null);
      let last = entrance;
      for (const x of regex.x)
        last = this.build_(last, x);
      this.addArrow(last, exit, '&', null);

      return exit;
    }
    if (['(?=)', '(?!)', '(?<=)', '(?<!)'].includes(regex['?'])) {
      const anchor = getAnchorOfNode(regex);
      const end = getEndOfNode(regex);
      let lookaround = this.newStateId(anchor);

      let x = [];
      if (regex['?'].startsWith('(?<'))
        x.push({
          '?': '*',
          x: {
            '?': '.',
            sourceMapInfo: {
              range: {start: anchor, end: anchor+1}
            }
          },
          sourceMapInfo: {
            range: {start: anchor, end: anchor+1}
          }
        });
      x.push(...regex.x);

      this.lookaroundNFAs.set(lookaround, {
        '?': regex['?'].slice(1, -1),
        nfa: new ThompsonConstructor().build({
          '?': '()', x,
          sourceMapInfo: {
            range: {start: anchor, end}
          }
        })
      });
      this.addArrow(s, lookaround, '&', null);
      return lookaround;
    }
    if (regex['?'] === '*') { // todo: might be able to get rid of parse state
      const parse = this.newStateId(getStartOfNode(regex));
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId(getEndOfNode(regex));
      this.addArrow(s, afterParse, '&', null);

      const f = this.build_(parse, regex.x);
      this.addArrow(f, parse, '&', null);
      this.addArrow(f, afterParse, '&', null);

      return afterParse;
    }
    if (regex['?'] === '+') { // todo: might be able to get rid of parse state
      const parse = this.newStateId(getStartOfNode(regex));
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId(getEndOfNode(regex));

      const f = this.build_(parse, regex.x);
      this.addArrow(f, parse, '&', null);
      this.addArrow(f, afterParse, '&', null);

      return afterParse;
    }
    if (regex['?'] === '?') { // todo: might be able to get rid of parse state
      const parse = this.newStateId(getStartOfNode(regex));
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId(getEndOfNode(regex));
      this.addArrow(s, afterParse, '&', null);

      const f = this.build_(parse, regex.x);
      this.addArrow(f, afterParse, '&', null);

      return afterParse;
    }
    if (regex['?'] === '{n}') { // handle more elegently?
      let last = s;
      for (let i = 0; i < regex.n; ++i)
        last = this.build_(last, regex.x);

      return last;
    }
    if (regex['?'] === '{a,b}') { // handle more elegently?
      const afterParse = this.newStateId(getEndOfNode(regex));

      let last = s;
      for (let i = 0; i < regex.min; ++i)
        last = this.build_(last, regex.x);
      this.addArrow(last, afterParse, '&', null);
      for (let i = regex.min; i < regex.max; ++i) {
        last = this.build_(last, regex.x);
        this.addArrow(last, afterParse, '&', null);
      }

      return afterParse;
    }
    // todo: handle anchoring
    throw new Error(`unsupported: ${JSON.stringify(regex)}`);
  }

  build(regex) {
    this.stateMappings[0] = getStartOfNode(regex);
    this.stateMappings[1] = getEndOfNode(regex);

    this.arrows[1] = []; // last state has no out arrows

    const lastState = this.build_(0, regex);
    this.addArrow(lastState, 1, '&', null);

    return {
      stateSourcePosition: this.stateMappings,
      arrows: this.arrows,
      lookaroundNFAs: this.lookaroundNFAs,
      groupBoundaries: this.groupBoundaries,
      lastGroupId: this.groupId
    };
  }
}

import {escape} from '../../../util/escape';

export const renderArrow = (arrow) => {
  if (arrow['?'] === '&')
    return '';
  if (arrow['?'] === '.')
    return 'any';
  if (arrow['?'] === 'char')
    return escape(arrow.x);
  if (arrow['?'] === 'class')
    return `[${arrow.x.map(renderNode).join('')}]`;
  return `${arrow['?']}: ${arrow.x}`;
};

export const buildNFA = (regex) => {
  return new ThompsonConstructor().build(regex);
};
