import {inspectdeep} from './inspectdeep';

const padCenter = (x, l) => {
  const dl = l - x.length;
  return ' '.repeat((dl+1)/2)+x+' '.repeat(dl/2);
};

export const renderTabular = desc => {
  const maxLs = [];

  for (const line of desc) {
    for (let i = 0; i < line.length; ++i) {
      const p = line[i];

      let x = '';
      if (typeof p === 'string')
        x = p;
      else if (typeof p === 'object')
        x = p.x;
      else throw new Error(`Unexpected tabular description part: ${inspectdeep(p)}.`);

      maxLs[i] = maxLs.length <= i ? x.length : Math.max(x.length, maxLs[i]);
    }
  }

  const res = [];
  for (const line of desc) {
    const lineRes = [];
    for (let i = 0; i < line.length; ++i) {
      const p = line[i];

      let x = '';
      let align = 'left';
      if (typeof p === 'string')
        x = p;
      else if (typeof p === 'object') {
        x = p.x;
        align = p.align;
      }

      if (align === 'left')
        x = x.padEnd(maxLs[i]);
      else if (align === 'right')
        x = x.padStart(maxLs[i]);
      else if (align === 'center')
        x = padCenter(x, maxLs[i]);
      else throw new Error(`Unknown align type: ${inspectdeep(align)} for ${inspectdeep(x)}.`);

      lineRes.push(x);
    }
    res.push(lineRes.join(' ')); // │

    // let sep = '';
    // for (const l of maxLs) {
    //   sep += '─'.repeat(l);
    //   sep += '┼';
    // }
    // res.push(sep);
  }

  return res.join('\n');
};
