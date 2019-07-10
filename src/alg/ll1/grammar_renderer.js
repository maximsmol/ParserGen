import {renderTabular} from '../../util/renderTabular';
import {repGrammar} from './grammarTools';

export const renderGrammarRep = gr => {
  const table = [];
  for (const [nt, subs] of Object.entries(gr)) {
    table.push([{x: nt, align: 'right'}, '->',  subs.map(subToStr).join(' | ')]);
  }
  return table;
};
export const grammarRepToString = gr => renderTabular(renderGrammarRep(gr));

export const renderGrammar = g => renderGrammarRep(repGrammar(g));
export const grammarToString = g => renderTabular(renderGrammar(g));

export const renderSubPart = x => {
  if (x['?'] === 'id')
    return x.x;
  if (x['?'] === 'epsilon')
    return '&';
  if (x['?'] === 'token')
    return x.x;
  return `${x['?']}/${x.x}`;
};
export const renderSub = sub => sub.map(renderSubPart);
export const subToStr = sub => renderSub(sub).join(' ');
export const renderRuleAligned = rule => [{x: rule.nt, align: 'right'}, '->'].concat(renderSub(rule.sub));
export const renderRule = rule => [{x: rule.nt, align: 'right'}, '->', subToStr(rule.sub)];
export const ruleToStr = rule => renderTabular([renderRule(rule)]);

export const renderRules = rules => rules.map(renderRule);
export const rulesToStr = rules => renderTabular(renderRules(rules));
export const renderRulesNumbered = rules => {
  const res = [];
  for (let i = 0; i < rules.length; ++i)
    res.push([{x: i+':', align: 'right'}].concat(renderRule(rules[i])));
  return res;
};
export const rulesToStrNumbered = rules => renderTabular(renderRulesNumbered(rules));

export const renderTableHeader = (g) =>
  [''].concat(
    g.ts.map(x => ({x: renderSubPart(x), align: 'center'}))
  );
export const renderTableRow = (g, table, nt) => {
  const line = [{x: nt, align: 'right'}];
  for (const t of g.ts) {
    const x = table.get(nt).get(t);
    line.push({
      x: x == null ? '' : String(x),
      align: 'center'
    });
  }
  return line;
};
export const renderTablePart = (g, table, nts) => {
  const desc = [];
  desc.push(renderTableHeader(g));

  let printedEllipsis = false;
  for (const nt of g.nts) {
    if (!nts.includes(nt)) {
      if (!printedEllipsis) {
        printedEllipsis = true;
        desc.push(['...']);
      }
      continue;
    }

    printedEllipsis = false;
    desc.push(renderTableRow(g, table, nt));
  }

  return desc;
};
export const renderTable = (g, table) => {
  return renderTablePart(g, table, g.nts);
};
export const tablePartToStr = (g, table, nts) => renderTabular(renderTablePart(g, table, nts));
export const tableToStr = (g, table) => renderTabular(renderTable(g, table));
