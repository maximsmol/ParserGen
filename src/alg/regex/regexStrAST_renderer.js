import {escape} from '../../util/escape';

export const renderNode = (node) => {
  if (node['?'] === '&')
    return '&';
  if (node['?'] === 'char')
    return escape(node.x);
  if (node['?'] === '[]')
    return `[${node.x.map(renderNode).join('')}]`;
  if (node['?'] === '()')
    return `(${node.capture ? '' : '?:'}${node.x.map(renderNode).join('')})`;
  if (node['?'] === '*')
    return `${renderNode(node.x)}*`;
  if (node['?'] === '+')
    return `${renderNode(node.x)}+`;
  if (node['?'] === '?')
    return `${renderNode(node.x)}?`;
  if (node['?'] === 'a-b')
    return `${renderNode(node.a)}-${renderNode(node.b)}`;

  throw new Error('unsupported');
};
