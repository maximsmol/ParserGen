class ThompsonConstructor {
  arrows;

  constructor() {
    this.lastState = 1; // s, f, ...
    this.arrows = [];
  }

  addArrow(s, f, type, x) {
    this.arrows.push({
      '?': type, s, f, x
    });
  }
  newStateId() {
    return ++this.lastState;
  }

  build_(s, regex) {
    if (regex['?'] === '&') {
      const ep = this.newStateId();
      this.addArrow(s, ep, '&', null);
      return ep;
    }
    if (regex['?'] === '.') {
      const ch = this.newStateId();
      this.addArrow(s, ch, '.', null);
      return ch;
    }
    if (regex['?'] === 'char') {
      const ch = this.newStateId();
      this.addArrow(s, ch, 'char', regex.x);
      return ch;
    }
    if (regex['?'] === '[]') {
      const ch = this.newStateId();
      this.addArrow(s, ch, 'class', regex.x);
      return ch;
    }
    if (regex['?'] === '|') {
      const a = this.newStateId();
      const b = this.newStateId();
      this.addArrow(s, a, '&', null);
      this.addArrow(s, b, '&', null);

      const aF = this.build_(a, regex.a);
      const bF = this.build_(b, regex.b);
      const f = this.newStateId();
      this.addArrow(aF, f, '&', null);
      this.addArrow(bF, f, '&', null);

      return f;
    }
    if (regex['?'] === '()') { // todo: handle captures
      let last = s;
      for (const x of regex.x)
        last = this.build_(last, x);
      return last;
    }
    if (regex['?'] === '*') { // todo: might be able to get rid of parse state
      const parse = this.newStateId();
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId();
      this.addArrow(s, afterParse, '&', null);

      const f = this.build_(parse, regex.x);
      this.addArrow(f, parse, '&', null);
      this.addArrow(f, afterParse, '&', null);

      return afterParse;
    }
    if (regex['?'] === '+') { // todo: might be able to get rid of parse state
      const parse = this.newStateId();
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId();

      const f = this.build_(parse, regex.x);
      this.addArrow(f, parse, '&', null);
      this.addArrow(f, afterParse, '&', null);

      return afterParse;
    }
    if (regex['?'] === '?') { // todo: might be able to get rid of parse state
      const parse = this.newStateId();
      this.addArrow(s, parse, '&', null);

      const afterParse = this.newStateId();
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
      const afterParse = this. newStateId();

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
    const lastState = this.build_(0, regex);
    this.addArrow(lastState, 1, '&', null);
    return this.arrows;
  }
}

import {escape} from '../../../util/escape';

import {renderNode} from '../regexStrAST_renderer';
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
