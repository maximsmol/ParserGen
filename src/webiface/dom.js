import allTags from 'html-tags';
import singletonTags from 'html-tags/void';
import legalAttrs from 'html-element-attributes';

import htmlEscape from 'escape-html';

import {inspectdeep} from '../util/inspectdeep';

const globalLegalAttrs = legalAttrs['*'];

export const dom = (tag, attrs, ...children) => {
  if (!allTags.includes(tag))
    throw new Error(`Unknown HTML tag ${tag}.`);

  const curLegalAttrs = legalAttrs[tag];

  const attrStrs = [];
  if (attrs != null) {
    for (const [k, v] of Object.entries(attrs)) {
      if (!globalLegalAttrs.includes(k) &&
          curLegalAttrs != null &&
          !curLegalAttrs.includes(k) &&
          !k.startsWith('data-'))
        throw new Error(`Attribute ${k} illegal for tag ${tag}.`);

      if (k !== htmlEscape(k))
        throw new Error(`Attribute ${k} contains illegal characters.`);

      if (v === true)
        attrStrs.push(k);
      else
        attrStrs.push(`${k}="${htmlEscape(v)}"`);
    }
  }
  const attrStr = (attrStrs.length === 0 ? '' : ' ') + attrStrs.join('');

  if (singletonTags.includes(tag)) {
    if (children.length !== 0)
      throw new Error(`Have a child in a singleton tag ${tag}.`);

    return {str: `<${tag}${attrStr}>`};
  }

  let res = `<${tag}${attrStr}>`;
  for (const c of children) {
    if (typeof c === 'object') {
      if (Object.keys(c).length !== 1 || c.str == null) {
        console.log(inspectdeep(c));
        throw new Error(`Child ${c} is a weird object. Has keys: ${Object.keys(c)}, but must only have a \`str\` attribute.`);
      }
      res += c.str;
      continue;
    }

    if (typeof c !== 'string')
      throw new Error(`Child ${c} is not a string.`);

    res += htmlEscape(c);
  }

  res += `</${tag}>`;
  return {str: res};
};
