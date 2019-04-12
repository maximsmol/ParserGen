import {escape} from '../../util/escape';

export const renderNode = (node) => {
  if (node['?'] === '&')
    return '&';
  if (node['?'] === '.')
    return '.';
  if (node['?'] === 'char')
    return escape(node.x);
  if (node['?'] === '[]')
    return `[${node.x.map(renderNode).join('')}]`;
  if (['(?=)', '(?!)', '(?<=)', '(?<!)'].includes(node['?']))
    return `(${node.groupType.slice(1, -1)}${node.x.map(renderNode).join('')})`;
  if (node['?'] === '*')
    return `${renderNode(node.x)}*`;
  if (node['?'] === '+')
    return `${renderNode(node.x)}+`;
  if (node['?'] === '?')
    return `${renderNode(node.x)}?`;
  if (node['?'] === 'a-b')
    return `${renderNode(node.a)}-${renderNode(node.b)}`;

  throw new Error(`unsupported: ${node['?']}`);
};

const renderASTSource1 = (node, source, indentStr) => {
  const mapping = node.sourceMapInfo;

  if (mapping == null)
    throw new Error(`mapping invalid in ${renderNode(node)}`);

  if (mapping.range.start == null)
    throw new Error(`mapping has no start in ${renderNode(node)}`);
  if (mapping.range.end == null)
    throw new Error(`mapping has no end in ${renderNode(node)}`);

  const res = [];
  res.push(indentStr+source.substring(mapping.range.start, mapping.range.end));
  if (mapping.anchor != null)
    res.push(indentStr+' '.repeat(mapping.anchor-mapping.range.start)+'^');
  return res;
};
export const renderASTSource = (node, source) => renderASTSource1(node, source, '');
export const printASTSource = (node, source) => console.log(renderASTSource(node, source).join('\n'));

const renderASTTree1 = (node, source, indentStr) => {
  const nextIndentStr = indentStr + '  ';

  if (['.', '&', 'char'].includes(node['?']))
    return renderASTSource1(node, source, indentStr);
  if (['[]', '()'].includes(node['?'])) {
    const res = [];
    res.push(...renderASTSource1(node, source, indentStr));
    for (let i = 0; i < node.x.length; ++i)
      res.push(...renderASTTree1(node.x[i], source, nextIndentStr));
    return res;
  }
  if (['|', 'a-b'].includes(node['?'])) {
    const res = [];
    res.push(...renderASTSource1(node, source, indentStr));
    res.push(...renderASTTree1(node.a, source, nextIndentStr));
    res.push(...renderASTTree1(node.b, source, nextIndentStr));
    return res;
  }
  if (['*', '+', '?', '{n}', '{a,b}'].includes(node['?'])) {
    const res = [];
    res.push(...renderASTSource1(node, source, indentStr));
    res.push(...renderASTTree1(node.x, source, nextIndentStr));
    return res;
  }

  return [indentStr+`can't render a node of type ${node['?']}`];
};
export const renderASTTree = (node, source) => renderASTTree1(node, source, '');
export const printASTTree = (node, source) => console.log(renderASTTree(node, source).join('\n'));
