import util from 'util';

export const inspectdeep = (...xs) =>
  util.format(...xs.map(x => util.inspect(x, {depth: null, colors: true})));
