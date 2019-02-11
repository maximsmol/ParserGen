import escapeString from 'js-string-escape';
import {escapeUnprintable} from './escapeUnprintable';

export const escape = (str) =>
  escapeUnprintable(str.replace(/\\/g, '\\\\')).replace(/"/g, '\\"');
