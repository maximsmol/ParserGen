export const escapeUnprintable = (str) =>
  str
    .replace(/\x08/g, '\\b')
    .replace(/\f/g, '\\f')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\v/g, '\\v')
    // .replace(/\a/g, '\\a') // todo: ?
    .replace(/\p{C}/ug, x => `\\u${x.codePointAt(0)}`);
