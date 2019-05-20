export const values = {
  before: -1,
  after: 1,
  unspecified: 0
};
export const topotable = (n, adj) => {
  const res = [];
  for (let i = 0; i < n; ++i)
    res.push(new Array(n).fill(values.unspecified));

  const v = new Set();
  for (let i = 0; i < n; ++i) {
    // v.clear();

    const q = [];
    q.push(i);

    const stack = [];
    while (q.length !== 0) {
      const cur = q.pop();

      if (cur == null) {
        const finished = stack.pop();

        if (stack.length !== 0) {
          const prev = stack[stack.length-1];

          res[prev][finished] = values.after;
          res[finished][prev] = values.before;
        }

        continue;
      }

      if (v.has(cur)) {
        if (stack.length !== 0) {
          const prev = stack[stack.length-1];

          res[prev][cur] = values.after;
          res[cur][prev] = values.before;

          for (let j = 0; j < n; ++j) {
            if (res[cur][j] === values.after) {
              res[prev][j] = values.after;
              res[j][prev] = values.before;
            }
          }
        }

        continue;
      }
      v.add(cur);
      stack.push(cur);

      q.push(null);
      for (const a of adj[cur])
        q.push(a);
    }
  }

  return res;
};
