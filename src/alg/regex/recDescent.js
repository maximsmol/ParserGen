import escapeString from 'js-string-escape';

import {coerceWDefault} from '../../util/coerceWDefault';

// http://pubs.opengroup.org/onlinepubs/9699919799/
class RegexDescent {
  regex;
  i;
  res;
  config;

  // add ^ and $ special symbols
  constructor(regex, config) {
    this.regex = regex;
    this.i = 0;

    this.config = coerceWDefault({ // POSIX ERE
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
      }
    }, config);
  }

  peek() {
    if (this.isEOF())
      this.err('parser error. peek out of bounds');
    return this.regex[this.i];
  }
  lookahead() {
    if (this.isPreEOF())
      this.err('parser error. lookahead out of bounds');
    return this.regex[this.i+1];
  }
  next() {
    this.i++;
    if (this.i > this.regex.length)
      this.err('parser error. went out of bounds');
  }
  expected(x) {
    const c = this.isEOF() ? 'EOF' : this.peek();
    this.err(`expected: ${x}, got ${c} at ${this.i}`);
  }
  isPreEOF() {
    return this.i+1 === this.regex.length;
  }
  isEOF() {
    return this.i === this.regex.length;
  }

  printRange() {
    console.log(this.regex.substring(this.i-40, this.i+40));
    console.log(' '.repeat(39)+'^');
  }
  err(x) {
    this.printRange();
    console.log(x);
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
    if (this.mayConsume('\\')) {
      if (this.isEOF()) {
        if (!this.config.allowEOFEscape)
          this.err('regex ends in escape');
        return {'?': '&'};
      }

      let x = this.peek();

      const hexCharsUC = 'ABCDEF';
      const hexChars = '0123456789abcdef'+hexCharsUC;
      if (this.config.escapes.allowHex && x === 'x' &&
          hexChars.includes(this.lookahead())) {
        this.next();

        let n = 0;
        while (hexChars.includes(this.peek())) {
          const c = this.peek();
          this.next();

          n *= 16;
          n += hexCharsUC.includes(c) ? 10+hexCharsUC.indexOf(c) : hexChars.indexOf(c);
        }

        return {
          '?': 'char',
          x: String.fromCharCode(n), escaped: true
        };
      }


      if (this.config.verifyEscapes && !controlChars.includes(x))
        this.err(`invalid escape \\${x} at ${this.i}. can escape any of ${escapeString(controlChars)}`);

      this.next();
      return {
        '?': 'char',
        x, escaped: true
      };
    }

    let x = this.peek();
    this.next();
    if (x === '.')
      return {'?': '.'};

    if (autoescape.includes(x))
      return {
        '?': 'char',
        x, escaped: true
      };

    if (x === ')' && this.config.errOnUnmatchedParen)
      this.err(`unmatched parenthesis at ${this.i}`);
    if ('*+?{'.includes(x) && this.config.bound.errOnOrphanModifier)
      this.err(`orphan bound modifier ${x} at ${this.i}`);
    if (x === '|' && this.config.errOnOrphanPipe)
      this.err(`orphan | at ${this.i}`);

    return {
      '?': 'char',
      x, escaped: false
    };
  }

  parseAtom() {
    if (this.mayConsume('(')) {
      if (this.mayConsume(')')) {
        if (!this.config.allowEmptyGroup)
          this.err(`empty group at ${this.i}`);
        return {
          '?': '&'
        };
      }

      const res = [];

      let capture = true;
      if (this.mayConsume('?'))
        if (this.mayConsume(':'))
          capture = false;
        else
          res.push({'?': 'char', x: '?'});

      res.push(this.parse_());
      this.mustConsume(')');

      return {
        '?': '()',
        x: res,
        capture
      };
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
          chars.push({
            '?': 'char',
            x: this.peek(), escaped: true
          });
          this.next();
        }

        while (!this.mayConsume(']')) {
          const a = this.peek();
          this.next();

          if (a === '-' && this.peek() !== ']')
            this.err(`ranges share an endpoint at ${this.i}`);

          if (this.mayConsume('-')) {
            if (this.peek() !== ']') {
              if (!this.config.charClass.allowRanges)
                this.err(`unacceptable range ${a.x}-${b.x} at ${this.i} as range support is disabled`);

              const b = this.peek();
              this.next();

              if (this.config.charClass.errOnInvalidRange && a.charCodeAt(0) > b.charCodeAt(0))
                this.err(`invalid range ${a}-${b} at ${this.i} as ${a} > ${b}`);

              chars.push({
                '?': 'a-b',
                a: {'?': 'char', x: a, escaped: true}, b: {'?': 'char', x: b, escaped: true}
              });
            }
            else {
              chars.push({'?': 'char', x: a, escaped: true});
              chars.push({
                '?': 'char',
                x: '-', escaped: true
              });
            }
          }
          else
            chars.push({'?': 'char', x: a, escaped: true});
        }
      }
      else if (this.config.charClass.autoescape.closingBracketInFirstPlace || this.peek() !== ']') {
        if (!this.config.charClass.autoescape.dashAtTheStart && this.peek() === '-')
          this.err(`unescaped - at ${this.i}`);

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
          const a = this.parseChar(controlChars, autoescapeChars);
          if (a.x === '^' && !a.escaped) {
            if (!this.config.charClass.autoescape.caretInNonfirstPlace)
              this.err(`unescaped ^ at ${this.i}`);
            a.escaped = true;
          }
          if (a.x === '-' && !a.escaped) {
            if (this.peek() !== ']')
              this.err(`ranges share an endpoint at ${this.i}`);

            if (!this.config.charClass.autoescape.dashAtTheEnd)
              this.err(`unescaped - at ${this.i}`);
          }

          if (this.mayConsume('-')) {
            if (this.peek() !== ']') {
              if (!this.config.charClass.allowRanges)
                this.err(`unacceptable range ${a.x}-${b.x} at ${this.i} as range support is disabled`);

              const b = this.parseChar(controlChars, autoescapeChars);

              if (this.config.charClass.errOnInvalidRange && a.x.charCodeAt(0) > b.x.charCodeAt(0))
                this.err(`invalid range ${a.x}-${b.x} at ${this.i} as ${a.x} > ${b.x}`);

              chars.push({
                '?': 'a-b',
                a, b
              });
            }
            else if (this.config.charClass.autoescape.dashAtTheEnd) {
              chars.push(a);
              chars.push({
                '?': 'char',
                x: '-', escaped: true
              });
            }
            else
              this.err(`invalid range at ${this.i}`);
          }
          else
            chars.push(a);
        } while (!this.mayConsume(']'));
      }
      else
        this.err(`empty charClass at ${this.i}`);

      return {
        '?': '[]',
        x: chars,
        inverse
      };
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
    const x = this.parseAtom();
    if (this.isEOF())
      return x;

    if ('+*?'.includes(this.peek())) {
      const res = {
        '?': this.peek(),
        x
      };
      this.next();
      return res;
    }

    if (this.peek() === '{') {
      if (!',0123456789'.includes(this.lookahead())) {
        if (!this.config.bound.minMax.autoescapeIfInvalid)
          this.err(`invalid interval expression at ${this.i}: expected number for min`);
        return x;
      }

      this.next();
      let min = 0; let max = null;

      if (this.mayConsume(',')) {
        if (!this.config.bound.minMax.allowEmptyMin)
          this.err(`invalid interval expression at ${this.i}: missing a min`);
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
          return {
            '?': '{n}',
            x,
            n: min
          };
        }
      }
      this.mustConsume('}');

      if (!this.config.bound.allowMinGTMax && min > max)
        this.err(`invalid interval expression bind at ${this.i}: min > max`);

      if (this.config.bound.limit != null) {
        if (min > this.config.bound.limit)
          this.err(`invalid interval expression bind at ${this.i}: min > ${this.config.bound.limit}`);
        if (max > this.config.bound.limit)
          this.err(`invalid interval expression bind at ${this.i}: max > ${this.config.bound.limit}`);
      }

      return {
        '?': '{a,b}',
        x,
        min, max
      };
    }

    return x;
  }

  parseConcatenation() {
    const x = [];
    while (!this.isEOF() && !'|)'.includes(this.peek())) { // todo: |), any other?
      if ('^$'.includes(this.peek())) {
        if (this.peek() === '^' && x.length === 0 ||
            this.peek() === '$' && ( this.isPreEOF() || '|)'.includes(this.lookahead()) )
        ) {
          x.push({
            '?': this.peek()
          });
          this.next();
        }
        else {
          if (this.config.anchor.impossibilityHandling === 'err')
            this.err(`impossible anchor ${this.peek()} at ${this.i}`);

          if (this.config.anchor.impossibilityHandling === 'ignore') {
            x.push({
              '?': this.peek()
            });
            this.next();
          }
          else if (this.config.anchor.impossibilityHandling === 'autoescape') {
            x.push({
              '?': 'char',
              x: this.peek(), escaped: true
            });
            this.next();
          }
        }
      }
      else
        x.push(this.parseBound());
    }

    if (x.length === 1)
      return x[0];

    return {
      '?': '()',
      x, capture: false
    };
  }

  // ERE:
  //   | undefined if
  //     first or last char – see parse
  //     right after |( – orphan in parseChar
  //     right before ) – orphan in parseChar
  parseAlternation() {
    const a = this.parseConcatenation();
    if (this.isEOF())
      return a;

    if (this.mayConsume('|'))
      return {
        '?': '|',
        a, b: this.parseAlternation()
      };
    return a;
  }

  parse_() {
    return this.parseAlternation();
  }

  parse() {
    if (this.peek() === '|' && this.errOnOrphanPipe)
      this.err('pipe cannot start a regex');

    let x = this.parse_();

    if (!this.isEOF())
      this.err('parser error: did not reach EOF after parse');
    if (this.regex[this.i-1] === '|' && this.errOnOrphanPipe)
      this.err('pipe cannot end a regex');

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
    }
  }).parse();
};
