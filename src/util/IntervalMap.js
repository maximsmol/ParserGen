import {SplayTree} from './SplayTree';

export class IntervalMap {
  constructor() {
    this.startOrder = new SplayTree();
    this.endOrder = new SplayTree();
  }

  set(start, end, v) {
    const cur = {start, end, v};

    { // todo: generalize this into a function?
      let pred = this.startOrder.pred(start);
      while (pred != null) {
        if (pred.start > start)
          throw new Error(`invalid predecessor: ${pred} for ${cur}`);
        if (pred.end > start)
          this.del(pred);
        else
          break;

        pred = this.startOrder.pred(start);
      }

      let succ = this.startOrder.succ(start);
      while (succ != null) {
        if (succ.start < start)
          throw new Error(`invalid successor: ${pred} for ${cur}`);
        if (succ.start < end)
          this.del(succ);
        else
          break;

        succ = this.startOrder.succ(start);
      }
    }
    {
      let pred = this.endOrder.pred(end);
      while (pred != null) {
        if (pred.end > end)
          throw new Error(`invalid predecessor: ${pred} for ${cur}`);
        if (pred.end > start)
          this.del(pred);
        else
          break;

        pred = this.endOrder.pred(end);
      }

      let succ = this.endOrder.succ(end);
      while (succ != null) {
        if (succ.end < end)
          throw new Error(`invalid successor: ${pred} for ${cur}`);
        if (succ.start < end)
          this.del(succ);
        else
          break;

        succ = this.endOrder.succ(end);
      }
    }

    this.startOrder.set(start, cur);
    this.endOrder.set(end, cur);
  }

  del(int) {
    this.startOrder.del(int.start);
    this.endOrder.del(int.end);
  }

  // returns whichever intersecting interval is more convenient
  // todo: make sure this is the expected behavior for a non-intersecting inteval map
  get(start, end) {
    let pred = this.startOrder.pred(end);
    if (pred != null && pred.end > start)
      return pred.v;

    let succ = this.endOrder.succ(start);
    if (succ != null && succ.start < end)
      return succ.v;

    return null;
  }

  intervalEndingAt(i) {
    let cur = this.startOrder.pred(i);
    if (cur == null)
      return null;
    if (i > cur.end)
      return null;

    return cur;
  }
  getEndingAt(i) {
    const int = this.intervalEndingAt(i);
    if (int == null)
      return null;
    return int.v;
  }

  cleanUpTo(i) {
    let int = this.endOrder.pred(i);
    while (int != null) {
      this.del(int);

      int = this.endOrder.pred(i);
    }
  }
}
