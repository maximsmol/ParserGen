import {inspectdeep} from '../../util/inspectdeep';
import {renderSubPart, ruleToStr, tablePartToStr} from './grammar_renderer';
import escapeString from 'js-string-escape';

import {ref, tok, epsilon, partEq} from './grammarTools';

import {logdeep} from '../../util/logdeep';

const renderToken = (t) => t['?'];

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
    const t = toks[i];

    if (t['?'] === 'space') {
      if (t.x === '\n') {
        pos.col = 1;
        ++pos.line;
      }
      else { // todo: don't ignore spaces?
        pos.col += t.x.length;

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
        throw new Error(`Parse stack corrupt: unknown non-terminal.\nT=${renderToken(t)} <-| ${escapeString(t.x)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);

      const ruleI = row.get(tok(t['?']));
      if (ruleI == null) {
        const errorReport = `${pos.line}:${pos.col}: Unexpected token ${renderToken(t)} <-| ${escapeString(t.x)}`;
        console.log(errorReport);

        const fiA = Array.from(fiAs.get(nt).keys()).map(renderSubPart);
        const foA = Array.from(foAs.get(nt).keys()).map(renderSubPart);
        console.log(`Expected one of: ${fiA.concat(foA).join(', ')}`);
        console.log(tablePartToStr(g, table, [nt]));
        console.log(`No transition from ${nt} on ${t['?']}`);

        let pathTree = [];
        // tree of all paths through the AST that lead to any node on the parseStack
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
            pathTree.push(path);
        }

        const unrollParseTreeSourceString = (node) => {
          let res = [];
          for (const c of node.children) {
            const x = c.x;
            if (x['?'] === 'id')
              res.push(unrollParseTreeSourceString(c));
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

          return `${x.x} <-| ${unrollParseTreeSourceString(n)}`;
        };
        const visit = (node, pathTree, indentLevel) => {
          const indent = '  '.repeat(indentLevel);

          const forestPaths = pathTree.map(([i,]) => i);
          for (let i = 0; i < node.children.length; ++i) {
            const child = node.children[i];

            const subTreeI = forestPaths.indexOf(i);
            const parseStackI = parseStack.indexOf(child);
            const prefix = `${indent}${parseStackI !== -1 ? (parseStack.length - parseStackI)+': ' : ''}`;
            if (subTreeI !== -1) {
              console.log(`${prefix}${child.x.x}`);
              visit(child, pathTree[subTreeI][1], indentLevel+1);
            }
            else
              console.log(`${prefix}${parseTreeNodeToString(child)}`);
          }
        };
        visit(start, pathTree, 0);

        throw new Error(`Parser error. ${errorReport}`);
      }
      const rule = g.rules[ruleI];

      if (trace)
        console.log(`${pos.line}:${pos.col}: Matched ${renderToken(t)} <-| '${escapeString(t.x)}' -- ${ruleI}: ${ruleToStr(rule)}`);
      for (let j = rule.sub.length-1; j >= 0; --j) {
        const child = {x: rule.sub[j], children: [], parent: node};
        node.children.push(child);
        parseStack.push(child);
      }
      node.children.reverse();
    }
    else if (x['?'] === 'token') {
      if (x.x !== t['?'])
        throw new Error(`Parsing error.\nT=${renderToken(t)} <-| ${escapeString(t.x)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);
      if (trace)
        console.log(`Matched ${t['?']} <-| '${escapeString(t.x)}'`);
      node.str = t.x;
      ++i;
      pos.col += t.x.length;
    }
    else if (partEq(x, epsilon)) {
      if (trace)
        console.log(`Matched &`);
      node.str = '';
    }
    else
      throw new Error(`Parse stack corrupt.\nT=${renderToken(t)} <-| ${escapeString(t.x)}\nExpected: ${renderSubPart(x)}\n${inspectdeep(parseStack)}`);
  }

  return start;
};
