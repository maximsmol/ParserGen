import util from 'util';

export const logdeep = (...xs) =>
  console.log(...xs.map(x => util.inspect(x, {depth: null, colors: true})));
