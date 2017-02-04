export default class Range {
  constructor(start, end, step) {
    this.start = start;
    this.end = end;
    if (step == null) {
      step = 0;
    }
    this.step = step;
    if (this.step === 0) {
      if (this.end < this.start) {
        this.step = -1;
      } else {
        this.step = 1;
      }
    }

    Object.seal(this);
  }

  some(f) {
    let current = this.start;
    let { end } = this;
    let { step } = this;

    if (step > 0) {
      while (current < end) {
        if (f(current)) {
          return true;
        }
        current += step;
      }
    } else {
      while (current > end) {
        if (f(current)) {
          return true;
        }
        current += step;
      }
    }

    return false;
  }

  forEach(f) {
    return this.some(function(e) {
      f(e);
      return false;
    });
  }

  toArray() {
    let array = [];
    this.forEach(e => array.push(e));
    return array;
  }
}

Object.defineProperty(Range.prototype, 'length', {
  get() {
    return Math.floor((this.end - this.start) / this.step);
  }
});
