import {inspectdeep} from '../../util/inspectdeep';
import {renderSubPart, ruleToStr, tablePartToStr} from './grammar_renderer';
import escapeString from 'js-string-escape';

import {ref, epsilon, special, partEq} from './grammarTools';

import {logdeep} from '../../util/logdeep';

export const parse = (g, {table, fiAs, foAs}, toks, trace) => {
  if (trace !== true)
    trace = false;

  const start = {x: ref('S'), children: [], parent: null};
  const parseStack = [start];

  let i = 0;
  const pos = {
    col: 1, line: 1
  };
  while (i < toks.length) {
    const newStyleTok = toks[i];
    const str = newStyleTok.match.str;
    const t = newStyleTok; // todo: transition properly

    if (t['?'] === 'space') {
      if (str === '\n') {
        pos.col = 1;
        ++pos.line;
      }
      else { // todo: don't ignore spaces?
        pos.col += str.length;

        ++i;
        continue;
      }
    }

    if (parseStack.length === 0)
      break;

    const node = parseStack.pop();
    const x = node.x;

    if (x['?'] === 'id') {
      const nt = x.x;
      const row = table.get(nt);

      if (row == null)
        throw new Error(`Parse stack corrupt: unknown non-terminal.\nT=${renderSubPart(t)} <-| ${escapeString(str)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);

      const ruleI = row.get(t);
      if (ruleI == null) {
        logdeep(row);
        logdeep(t);

        const errorReport = `${pos.line}:${pos.col}: Unexpected token ${renderSubPart(t)} <-| ${escapeString(str)}`;
        console.log(errorReport);

        const fiA = Array.from(fiAs.get(nt).keys()).map(renderSubPart);
        const foA = Array.from(foAs.get(nt).keys()).map(renderSubPart);
        console.log(`Expected one of: ${fiA.concat(foA).join(', ')}`);
        console.log(tablePartToStr(g, table, [nt]));
        console.log(`No transition from ${nt} on ${renderSubPart(t)}`);

        let pathForest = [];
        const visited = new Map();
        for (let i = 0; i < parseStack.length; ++i) {
          let path = null;
          let cur = parseStack[i];

          let merged = false;
          while (cur.parent != null) {
            const prevPathVisit = visited.get(cur);
            if (prevPathVisit != null) {
              merged = true;
              prevPathVisit[1].push(path);
              break;
            }

            path = [cur.parent.children.indexOf(cur), path == null ? [] : [path]];
            visited.set(cur, path);
            cur = cur.parent;
          }

          if (!merged)
            pathForest.push(path);
        }

        const parseTreeNodeSource = (node) => {
          let res = [];
          for (const c of node.children) {
            const x = c.x;
            if (x['?'] === 'id')
              res.push(parseTreeNodeSource(c));
            else
              res.push(c.str.replace('\n', '\\n').replace('\r', '\\r'));
          }
          return res.filter(x => x.length !== 0).join(' ');
        };
        const parseTreeNodeToString = (n) => {
          const x = n.x;
          if (node === n) // the parsing error
            return `ERROR: ${x.x}`;

          if (x['?'] !== 'id')
            return renderSubPart(x);

          return `${x.x} <-| ${parseTreeNodeSource(n)}`;
        };
        const visit = (node, pathForest, indentLevel) => {
          const indent = '  '.repeat(indentLevel);

          const forestPaths = pathForest.map(([i,]) => i);
          for (let i = 0; i < node.children.length; ++i) {
            const child = node.children[i];

            const subForestI = forestPaths.indexOf(i);
            const parseStackI = parseStack.indexOf(child);
            const prefix = `${indent}${parseStackI !== -1 ? (parseStack.length - parseStackI)+': ' : ''}`;
            if (subForestI !== -1) {
              console.log(`${prefix}${child.x.x}`);
              visit(child, pathForest[subForestI][1], indentLevel+1);
            }
            else
              console.log(`${prefix}${parseTreeNodeToString(child)}`);
          }
        };
        visit(start, pathForest, 0);

        throw new Error(`Parser error. ${errorReport}`);
      }
      const rule = g.rules[ruleI];

      if (trace)
        console.log(`${pos.line}:${pos.col}: Matched ${renderSubPart(t)} <-| '${escapeString(str)}' -- ${ruleI}: ${ruleToStr(rule)}`);
      for (let j = rule.sub.length-1; j >= 0; --j) {
        const child = {x: rule.sub[j], children: [], parent: node};
        node.children.push(child);
        parseStack.push(child);
      }
      node.children.reverse();
    }
    else if (x['?'] === 'token' || x['?'] === 'char' || x['?'] === 'space') {
      if (!partEq(t, x))
        throw new Error(`Parsing error.\nT=${renderSubPart(t)} <-| ${escapeString(str)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);
      if (trace)
        console.log(`Matched ${renderSubPart(t)} <-| '${escapeString(str)}'`);
      node.str = str;
      ++i;
      pos.col += str.length;
    }
    else if (partEq(x, epsilon)) {
      if (trace)
        console.log(`Matched &`);
      node.str = '';
    }
    else if (partEq(x, special('any'))) {
      if (trace)
        console.log(`Matched &any <-| '${escapeString(str)}'`);
      node.str = str;
      ++i;
      pos.col += str.length;
    }
    else
      throw new Error(`Parse stack corrupt.\nT=${renderSubPart(t)} <-| ${escapeString(str)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);
  }

  return start;
};
