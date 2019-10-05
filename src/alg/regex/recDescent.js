import escapeString from 'js-string-escape';

import {coerceWDefault} from '../../util/coerceWDefault';

const withSourceMapping = (arr, mapping) => {
  if (arr.sourceMapInfo != null)
    throw new Error('trying to add a sourcemap twice');

  arr.sourceMapInfo = mapping;
  return arr;
};

// http://pubs.opengroup.org/onlinepubs/9699919799/
export class RegexDescent {
  // add ^ and $ special symbols
  constructor(regex, config) {
    if (regex === '')
      throw new Error('Cannot parse an empty RegEx.');

    this.regex = regex;
    this.i = 0;
    this.errorReport = [];

    this.config = coerceWDefault({ // POSIX ERE
      dumpErrorReports: true,

      errOnUnmatchedParen: false,
      errOnOrphanPipe: true,

      allowEmptyGroup: false,
      allowEOFEscape: false,
      verifyEscapes: true,

      anchor: {
        // handling mode for anchors in the middle of the expression
        // ignore – leave as is
        // autoescape – match literally
        // err – throw
        impossibilityHandling: 'ignore'
      },
      escapes: {
        allowHex: false
      },
      charClass: {
        allowRanges: true, // strictly conforming applications shall not rely on this
        errOnInvalidRange: true,

        disableEscaping: true, // POSIX ERE mode, where \ is not special in []
        autoescape: {
          closingBracketInFirstPlace: true, // []]
          dashAtTheStart: true, // [-] [-x]
          dashAtTheEnd: true, // [x-] [a-b-]
          caretInNonfirstPlace: true // [x^]
        }
      },
      bound: {
        errOnOrphanModifier: true,
        minMax: {
          autoescapeIfInvalid: false,
          allowEmptyMin: false,
          allowMinGTMax: false,
          limit: 255
        }
      },
      features: {
        lookaround: false
      }
    }, config);

    this.sourceMapInfo = null;
  }

  peek() {
    if (this.isEOF())
      this.err('Internal bug: detected an invariant violation. Peek went out of bounds.');
    return this.regex[this.i];
  }
  lookahead() {
    if (this.isPreEOF())
      this.err('Internal bug: detected an invariant violation. Lookahead went out of bounds.');
    return this.regex[this.i+1];
  }
  next() {
    this.i++;
    if (this.i > this.regex.length)
      this.err('Internal bug: detected an invariant violation. Parser went out of bounds.');
  }
  expected(x) {
    const c = this.isEOF() ? 'EOF' : this.peek();
    this.err(`Found an unexpected character ${c} at ${this.i}, was expecting ${x}.`);
  }
  isPreEOF() {
    return this.i+1 === this.regex.length;
  }
  isEOF() {
    return this.i === this.regex.length;
  }

  addErrorToReport(err) {
    if (this.config.dumpErrorReports) {
      console.log(err);
    }

    this.errorReport.push(err);
  }
  printRange() {
    let n = Math.min(40, this.i);
    this.addErrorToReport(this.regex.substring(this.i-n, this.i+n));

    if (n-1 < 0) {
      this.addErrorToReport('^');
      return;
    }
    this.addErrorToReport(' '.repeat(n-1)+'^');
  }
  err(x) {
    this.printRange();
    this.addErrorToReport(x);
    throw new Error(x);
  }

  mayConsume(x) {
    if (this.isEOF() || x !== this.peek())
      return false;

    this.next();
    return true;
  }
  mustConsume(x) {
    if (!this.mayConsume(x))
      this.expected(x);

    return true;
  }

  parseNat() {
    if (!'0123456789'.includes(this.peek()))
      this.expected('\\d');

    let res = 0;
    while ('0123456789'.includes(this.peek())) {
      res *= 10;
      res += this.peek().charCodeAt(0) - '0'.charCodeAt(0);
      this.next();
    }
    return res;
  }

  startSourceMapping() {
    return {
      range: {
        start: this.i,
        end: null
      },
      anchor: null
    };
  }
  setSourceMappingAnchor(mapping) {
    if (mapping.anchor != null)
      throw new Error('Internal bug: detected an invariant violation. Tried to anchor a sourcemap twice.');

    mapping.anchor = this.i;
  }
  endSourceMapping(mapping) {
    if (mapping.range.end != null)
      throw new Error('Internal bug: detected an invariant violation. Tried to end a sourcemap twice.');

    mapping.range.end = this.i;
  }

  // special characters
  // ERE:
  //   .[\( except in bracket
  //     () – undefined
  //   ) iff matched with (
  //   *+?{ except in bracket
  //     undefined if
  //       first char
  //       right after unescaped |^$(
  //       left brace not part of a valid interval expression
  //       adjacent to each other
  //   | except in bracket
  //     undefined if
  //       first or last char
  //       right after |(
  //       right before )
  //   ^ if anchor
  //   $ if anchor
  parseChar(controlChars, autoescape) {
    const mapping = this.startSourceMapping();
    let x = this.peek();
    this.next();

    if (autoescape.includes(x)) {
      this.endSourceMapping(mapping);
      return withSourceMapping({
        '?': 'char',
        x, escaped: true
      }, mapping);
    }

    if (x === '\\') {
      if (this.isEOF()) {
        if (!this.config.allowEOFEscape)
          this.err('Found an unfinished escape at EOF. You can silence this error with `allowEOFEscape`.');
        return {'?': '&'};
      }

      let c = this.peek();

      const hexCharsUC = 'ABCDEF';
      const hexChars = '0123456789abcdef'+hexCharsUC;
      if (this.config.escapes.allowHex && c === 'x' &&
          hexChars.includes(this.lookahead())) {
        this.next();

        let n = 0;
        while (hexChars.includes(this.peek())) {
          const c = this.peek();
          this.next();

          n *= 16;
          n += hexCharsUC.includes(c) ? 10+hexCharsUC.indexOf(c) : hexChars.indexOf(c);
        }
        this.endSourceMapping(mapping);

        return withSourceMapping({
          '?': 'char',
          x: String.fromCharCode(n), escaped: true
        }, mapping);
      }


      if (this.config.verifyEscapes && !controlChars.includes(c))
        this.err(`Found an invalid escape \\${c} at ${this.i}, was expecting an escape of any of ${escapeString(controlChars)}. You can silence this error with \`verifyEscapes\`.`);

      this.next();
      this.endSourceMapping(mapping);
      return withSourceMapping({
        '?': 'char',
        x: c, escaped: true
      }, mapping);
    }

    if (x === '.') {
      this.endSourceMapping(mapping);
      return withSourceMapping({'?': '.'}, mapping);
    }

    if (x === ')' && this.config.errOnUnmatchedParen)
      this.err(`Found unmatched parenthesis at ${this.i}. You can silence this error with \`errOnUnmatchedParen\`.`);
    if ('*+?{'.includes(x) && this.config.bound.errOnOrphanModifier)
      this.err(`Found an orphan bound modifier ${x} at ${this.i}. You can silence this error with \`bound.errOnOrphanModifier\`.`);
    if (x === '|' && this.config.errOnOrphanPipe)
      this.err(`Found an orphan | at ${this.i}. You can silence this error with \`errOnOrphanPipe\`.`);

    this.endSourceMapping(mapping);
    return withSourceMapping({
      '?': 'char',
      x, escaped: false
    }, mapping);
  }

  parseAtom() {
    const atomMapping = this.startSourceMapping();
    if (this.mayConsume('(')) {
      if (this.mayConsume(')')) {
        if (!this.config.allowEmptyGroup)
          this.err(`Found an empty group at ${this.i}. You can silence this error with \`allowEmptyGroup\`.`);
        this.endSourceMapping(atomMapping);
        return withSourceMapping({
          '?': '&'
        }, atomMapping);
      }

      const res = [];

      let groupType = '()';

      const qMarkMapping = this.startSourceMapping();
      if (this.mayConsume('?')) {
        this.endSourceMapping(qMarkMapping);

        if (this.mayConsume(':'))
          groupType = '(?:)';
        else if (this.config.features.lookaround) {
          const lessThanMapping = this.startSourceMapping();
          if (this.mayConsume('='))
            groupType = '(?=)';
          else if (this.mayConsume('!'))
            groupType = '(?!)';
          else if (this.mayConsume('<')){
            this.endSourceMapping(lessThanMapping);

            if (this.mayConsume('='))
              groupType = '(?<=)';
            else if (this.mayConsume('!'))
              groupType = '(?<!)';

            if (groupType === '()')
              res.push(withSourceMapping({'?': 'char', x: '<'}), lessThanMapping);
          }
        }

        if (groupType === '()')
          res.push(withSourceMapping({'?': 'char', x: '?'}, qMarkMapping));
        else
          this.setSourceMappingAnchor(atomMapping);
      }

      res.push(this.parse_());
      this.mustConsume(')');

      this.endSourceMapping(atomMapping);
      return withSourceMapping({
        '?': groupType,
        x: res
      }, atomMapping);
    }

    // if in range a-b, a comes after b, it is either ignored or err'd
    // ERE
    //   ] can only be matched literally in the very beginning
    //   - is matched literally at the very beginning or very end or as the end of a range
    //     behaviour is undefined if ranges share endpoints
    //     must collate to use as beginning of range
    // disableEscaping: false
    //   ], ^, - are matched literally iff escaped or auto-escaped
    if (this.mayConsume('[')) {
      let inverse = false;
      if (this.mayConsume('^'))
        inverse = true;

      let chars = [];
      if (this.config.charClass.disableEscaping) { // POSIX ERE mode
        if ('-]'.includes(this.peek())) {
          const mapping = this.startSourceMapping();
          const x = this.peek();
          this.next();
          this.endSourceMapping(mapping);

          chars.push(withSourceMapping({
            '?': 'char',
            x, escaped: true
          }, mapping));
        }

        while (!this.mayConsume(']')) {
          const charMapping = this.startSourceMapping();
          const charRangeMapping = this.startSourceMapping();

          const a = this.peek();
          this.next();
          this.endSourceMapping(charMapping);

          if (a === '-' && this.peek() !== ']')
            this.err(`Found two ranges that share an endpoint at ${this.i}.`);

          const dashMapping = this.startSourceMapping();
          if (this.mayConsume('-')) {
            this.setSourceMappingAnchor(charRangeMapping);
            this.endSourceMapping(dashMapping);

            if (this.peek() !== ']') {
              if (!this.config.charClass.allowRanges)
                this.err(`Found a disallowed range ${a.x}-${b.x} at ${this.i}. You can enable character range support with \`charClass.allowRanges\`.`);

              const endCharMapping = this.startSourceMapping();
              const b = this.peek();
              this.next();
              this.endSourceMapping(endCharMapping);

              if (this.config.charClass.errOnInvalidRange && a.charCodeAt(0) > b.charCodeAt(0))
                this.err(`Found a range ${a}-${b} with switched endpoints at ${this.i}. You can silence this warning with \`charClass.errOnInvalidRange\`.`);

              this.endSourceMapping(charRangeMapping);
              chars.push(withSourceMapping({
                '?': 'a-b',
                a: withSourceMapping({'?': 'char', x: a, escaped: true}, charMapping),
                b: withSourceMapping({'?': 'char', x: b, escaped: true}, endCharMapping)
              }, charRangeMapping));
            }
            else {
              chars.push(withSourceMapping({'?': 'char', x: a, escaped: true}, charMapping));
              chars.push(withSourceMapping({
                '?': 'char',
                x: '-', escaped: true
              }, dashMapping));
            }
          }
          else
            chars.push(withSourceMapping({'?': 'char', x: a, escaped: true}, charMapping));
        }
      }
      else if (this.config.charClass.autoescape.closingBracketInFirstPlace || this.peek() !== ']') {
        if (!this.config.charClass.autoescape.dashAtTheStart && this.peek() === '-')
          this.err(`Found an unescaped - at the start of a character class at ${this.i}. You can silence this error with \`charClass.autoescape.dashAtTheStart\`.`);

        let autoescapeChars = '.[$()|*+?{\\';
        let controlChars = ']';
        if (!this.config.charClass.autoescape.caretInNonfirstPlace)
          controlChars += '^';
        else
          autoescapeChars += '^';
        if (!this.config.charClass.autoescape.dashAtTheEnd)
          controlChars += '-';
        else
          autoescapeChars += '-';

        do {
          const charRangeMapping = this.startSourceMapping();

          const a = this.parseChar(controlChars, autoescapeChars);
          if (a.x === '^' && !a.escaped) {
            if (!this.config.charClass.autoescape.caretInNonfirstPlace)
              this.err(`Found an unescaped ^ inside a character class at ${this.i}. Silence this error with \`autoescape.caretInNonfirstPlace\``);
            a.escaped = true;
          }
          if (a.x === '-' && !a.escaped) {
            if (this.peek() !== ']')
              this.err(`Found two ranges that share an endpoint at ${this.i}.`);

            if (!this.config.charClass.autoescape.dashAtTheEnd)
              this.err(`Found an unescaped - at the end of a character class at ${this.i}. You can silence this error with \`charClass.autoescape.dashAtTheEnd\`.`);
          }

          const dashMapping = this.startSourceMapping();
          if (this.mayConsume('-')) {
            this.setSourceMappingAnchor(charRangeMapping);
            this.endSourceMapping(dashMapping);

            if (this.peek() !== ']') {
              if (!this.config.charClass.allowRanges)
                this.err(`Found a disallowed range ${a.x}-${b.x} at ${this.i}. You can enable character range support with \`charClass.allowRanges\`.`);

              const b = this.parseChar(controlChars, autoescapeChars);

              if (this.config.charClass.errOnInvalidRange && a.x.charCodeAt(0) > b.x.charCodeAt(0))
                this.err(`Found a range ${a.x}-${b.x} with switched endpoints at ${this.i}. You can silence this warning with \`charClass.errOnInvalidRange\`.`);

              this.endSourceMapping(charRangeMapping);
              chars.push(withSourceMapping({
                '?': 'a-b',
                a, b
              }, charRangeMapping));
            }
            else if (this.config.charClass.autoescape.dashAtTheEnd) {
              chars.push(a);
              chars.push(withSourceMapping({
                '?': 'char',
                x: '-', escaped: true
              }, dashMapping));
            }
            else
              this.err(`Found an unescaped - at the end of a character class at ${this.i}. You can silence this warning with \`charClass.autoescape.dashAtTheEnd\``);
          }
          else
            chars.push(a);
        } while (!this.mayConsume(']'));
      }
      else
        this.err(`Found an empty character class at ${this.i}.`);

      this.endSourceMapping(atomMapping);
      return withSourceMapping({
        '?': '[]',
        x: chars,
        inverse
      }, atomMapping);
    }

    return this.parseChar('^.[$()|*+?{\\]', '');
  }

  // ERE
  //   *+?{ undefined if
  //     first char – orphan in parseChar
  //     right after unescaped |^$( – orphan in parseChar
  //     left brace not part of a valid interval expression – this.config.bound.minMax.autoescapeIfInvalid
  //     adjacent to each other – orphan in parseChar
  parseBound() {
    const boundMapping = this.startSourceMapping();

    const x = this.parseAtom();
    if (this.isEOF())
      return x;

    if ('+*?'.includes(this.peek())) {
      const repeatType = this.peek();
      this.next();
      this.setSourceMappingAnchor(boundMapping);

      this.endSourceMapping(boundMapping);
      return withSourceMapping({
        '?': repeatType,
        x
      }, boundMapping);
    }

    if (this.peek() === '{') {
      if (!',0123456789'.includes(this.lookahead())) {
        if (!this.config.bound.minMax.autoescapeIfInvalid)
          this.err(`Found a non-numerical min in an interval expression at ${this.i}. You can silence this error with \`bound.minMax.autoescapeIfInvalid\`.`);
        return x;
      }

      this.next();
      let min = 0; let max = null;

      if (this.mayConsume(',')) {
        this.setSourceMappingAnchor(boundMapping);

        if (!this.config.bound.minMax.allowEmptyMin)
          this.err(`Found an interval expression missing a min at ${this.i}. You can silence this error with \`bound.minMax.allowEmptyMin\`.`);
        max = this.parseNat(); // {,max}
      }
      else {
        min = this.parseNat();
        if (this.mayConsume(',')) {
          if (this.peek() !== '}')
            max = this.parseNat(); // {min,max}
          // else // {min,}
        }
        else { // {n}
          this.mustConsume('}');

          this.endSourceMapping(boundMapping);
          return withSourceMapping({
            '?': '{n}',
            x,
            n: min
          }, boundMapping);
        }
      }
      this.mustConsume('}');

      if (!this.config.bound.allowMinGTMax && min > max)
        this.err(`Found an interval expression bind {${min}, ${max}} with switched endpoints at ${this.i}. You can silence this error with \`bound.allowMinGTMax\`.`);

      if (this.config.bound.limit != null) {
        if (min > this.config.bound.limit)
          this.err(`Found an interval expression bind {${min}, ${max}} with a overly large min ${min} > ${this.config.bound.limit} at ${this.i}. You can set the maximum value for inteval expression bounds with \`bound.limit\`.`);
        if (max > this.config.bound.limit)
          this.err(`Found an interval expression bind {${min}, ${max}} with a overly large max ${max} > ${this.config.bound.limit} at ${this.i}. You can set the maximum value for inteval expression bounds with \`bound.limit\`.`);
      }

      this.endSourceMapping(boundMapping);
      return withSourceMapping({
        '?': '{a,b}',
        x,
        min, max
      }, boundMapping);
    }

    return x;
  }

  parseConcatenation() {
    const concatMapping = this.startSourceMapping();

    const x = [];
    while (!this.isEOF() && !'|)'.includes(this.peek())) { // todo: |), any other?
      if ('^$'.includes(this.peek())) {
        if (this.peek() === '^' && x.length === 0 ||
            this.peek() === '$' && ( this.isPreEOF() || '|)'.includes(this.lookahead()) )
        ) {
          const anchorMapping = this.startSourceMapping();
          const anchorType = this.peek();
          this.next();
          this.endSourceMapping(anchorMapping);

          x.push(withSourceMapping({
            '?': anchorType
          }, anchorMapping));
        }
        else {
          if (this.config.anchor.impossibilityHandling === 'err')
            this.err(`Found a misplaced anchor ${this.peek()} at ${this.i}. You can change how misplaced anchors are handled with \`anchor.impossibilityHandling\`.`);

          if (this.config.anchor.impossibilityHandling === 'ignore') {
            const mapping = this.startSourceMapping();
            const char = this.peek();
            this.next();
            this.endSourceMapping(mapping);

            x.push(withSourceMapping({
              '?': char
            }, mapping));
          }
          else if (this.config.anchor.impossibilityHandling === 'autoescape') {
            const mapping = this.startSourceMapping();
            const char = this.peek();
            this.next();
            this.endSourceMapping(mapping);

            x.push(withSourceMapping({
              '?': 'char',
              x: char, escaped: true
            }, mapping));
          }
        }
      }
      else
        x.push(this.parseBound());
    }

    if (x.length === 1)
      return x[0];

    this.endSourceMapping(concatMapping);
    return withSourceMapping({
      '?': '(?:)', x
    }, concatMapping);
  }

  // ERE:
  //   | undefined if
  //     first or last char – see parse
  //     right after |( – orphan in parseChar
  //     right before ) – orphan in parseChar
  parseAlternation() {
    const altMapping = this.startSourceMapping();

    const a = this.parseConcatenation();
    if (this.isEOF())
      return a;

    if (this.mayConsume('|')) {
      this.setSourceMappingAnchor(altMapping);
      const b = this.parseAlternation();
      this.endSourceMapping(altMapping);

      return withSourceMapping({
        '?': '|',
        a, b
      }, altMapping);
    }
    return a;
  }

  parse_() {
    return this.parseAlternation();
  }

  parse() {
    if (this.peek() === '|' && this.config.errOnOrphanPipe)
      this.err('Found a pipe at the start of the RegEx. You can silence this error with `errOnOrphanPipe`.');

    let x = this.parse_();

    if (!this.isEOF())
      this.err('Internal bug: detected an invariant violation. Did not reach EOF after parsing.');
    if (this.regex[this.i-1] === '|' && this.errOnOrphanPipe)
      this.err('Found a pipe at the end of the RegEx. You can silence this error with `errOnOrphanPipe`.');

    return x;
  }
}

export const parse = (regex) => {
  return new RegexDescent(regex, {
    escapes: {
      allowHex: true
    },
    charClass: {
      disableEscaping: false
    },
    features: {
      lookaround: true
    }
  }).parse();
};
