import {logdeep} from './logdeep';

const rol = x => {
  const r = x.r;
  x.r = r.l;
  r.l = x;
  return r;
};
const ror = x => {
  const l = x.l;
  x.l = l.r;
  l.r = x;
  return l;
};

const roll = x => x.l = rol(x.l);
const rorr = x => x.r = ror(x.r);

export class SplayTree {
  constructor() {
    this.root = null;
  }

  splay(x) {
    let root = this.root;
    while (root != null) {
      if (root.k === x)
        return;

      if (x < root.k) {
        if (root.l == null)
          return;

        if (root.l.k === x) {
          //  p
          // x _

          root = this.root = ror(root);
          //  x
          // _ p

          return;
        }

        if (x < root.l.k) {
          if (root.l.l == null) {
            //  p
            // x _

            root = this.root = ror(root);
            //  x
            // _ p

            return;
          }

          //    g
          //  p   _
          // x _
          // zig-zig

          root = this.root = ror(root);
          //    p
          //  x   g
          // _ _ _ _

          root = this.root = ror(root);
          //    x
          //  _   p
          //     _ g
        }
        else {
          if (root.l.r == null) {
            //  p
            // x _

            root = this.root = ror(root);
            //  x
            // _ p

            return;
          }

          //    g
          //  p   _
          // _ x
          // zig-zag

          roll(root);
          //    g
          //  x   _
          // p _

          root = this.root = ror(root);
          //    x
          //  p   g
          // _ _ _ _
        }
      }
      else if (x > root.k) {
        if (root.r == null)
          return;

        if (root.r.k === x) {
          //  p
          // _ x

          root = this.root = rol(root);
          //  x
          // p _

          return;
        }

        if (x < root.r.k) {
          if (root.r.l == null) {
            //  p
            // _ x

            root = this.root = rol(root);
            //  x
            // p _

            return;
          }

          //    g
          //  _   p
          //     x _
          // zag-zig

          rorr(root);
          //    g
          //  _   x
          //     _ p

          root = this.root = rol(root);
          //    x
          //  g   p
          // _ _ _ _
        }
        else {
          if (root.r.r == null) {
            //  p
            // _ x

            root = this.root = rol(root);
            //  x
            // p _

            return;
          }

          //    g
          //  _   p
          //     _ x
          // zag-zag

          root = this.root = rol(root);
          //    p
          //  g   x
          // _ _ _ _

          root = this.root = rol(root);
          //    x
          //  p   _
          // g _
        }
      }
    }
  }

  pred(k) {
    if (this.root == null)
      return null;

    this.splay(k);
    if (this.root.k <= k)
      return this.root;

    this.splay(k);
    if (this.root.k > k) {
      if (this.root.l == null)
        return null;

      logdeep(this.root);
      throw new Error(`splay-splay invariant obviously invalid for pred of ${k}`);
    }
    return this.root;
  }

  succ(k) {
    if (this.root == null)
      return null;

    this.splay(k);
    if (this.root.k >= k)
      return this.root;

    this.splay(k);
    if (this.root.k < k) {
      if (this.root.r == null)
        return null;

      logdeep(this.root);
      throw new Error(`splay-splay invariant obviously invalid for succ of ${k}`);
    }
    return this.root;
  }

  set(k, v) {
    const node = {k, v, l: null, r: null};

    if (this.root == null) {
      this.root = node;
      return;
    }

    this.splay(k);
    if (this.root.k === k)
      this.root.v = v;
    else if (k < this.root.k) {
      if (this.root.l != null && this.root.l.k > k) {
        logdeep(this.root);
        throw new Error(`key ${k} splayed incorrectly`);
      }

      node.r = this.root;
      node.l = this.root.l;
      this.root.l = null;
      this.root = node;
    }
    else {
      if (this.root.r != null && this.root.r.k < k) {
        logdeep(this.root);
        throw new Error(`key ${k} splayed incorrectly`);
      }

      node.l = this.root;
      node.r = this.root.r;
      this.root.r = null;
      this.root = node;
    }
  }

  get(k) {
    if (this.root == null)
      return null;

    this.splay(k);
    return this.root.k === k ? this.root.v : null;
  }

  del(k) {
    this.splay(k);

    if (this.root == null || this.root.k !== k)
      throw new Error(`could not delete key ${k} as it is not present`);

    if (this.root.l == null) {
      this.root = this.root.r;
      return;
    }
    if (this.root.r == null) {
      this.root = this.root.l;
      return;
    }

    const oldRoot = this.root;
    this.root = this.root.l;
    this.splay(Infinity);

    if (this.root.r != null)
      throw new Error(`maxkey was splayed incorrectly while deleting ${k}`);
    this.root.r = oldRoot.r;
  }
}
