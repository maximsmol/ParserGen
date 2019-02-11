export const escapeUnprintable = (str) =>
  str
    .replace(/\x08/g, '\\b')
    .replace(/\f/g, '\\f')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\v/g, '\\v')
    .replace(/\a/g, '\\a')
    .replace(/\p{C}/ug, x => `\\u${x.codePointAt(0)}`)
    .replace(/(\p{Z})/ug, /\\$1/);
