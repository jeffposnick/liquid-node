import Range from './range';

let isString = input =>
  Object.prototype.toString.call(input) === '[object String]';

export default class Iterable {
  first() {
    return this.slice(0, 1).then(a => a[0]);
  }

  map() {
    let args = arguments;
    return this.toArray().then(a => Promise.all(a.map(...args)));
  }

  sort() {
    let args = arguments;
    return this.toArray().then(a => a.sort(...args));
  }

  toArray() {
    return this.slice(0);
  }

  slice() {
    throw new Error(`${this.constructor.name}.slice() not implemented`);
  }

  last() {
    throw new Error(`${this.constructor.name}.last() not implemented`);
  }

  static cast(v) {
    if (v instanceof Iterable) {
      return v;
    } else if (v instanceof Range) {
      return new IterableForArray(v.toArray());
    } else if (Array.isArray(v) || isString(v)) {
      return new IterableForArray(v);
    } else if (v != null) {
      return new IterableForArray([v]);
    } else {
      return new IterableForArray([]);
    }
  }
}

export class IterableForArray extends Iterable {
  constructor(array) {
    super(...arguments);
    this.array = array;
  }

  slice() {
    return Promise.resolve(this.array.slice(...arguments));
  }

  last() {
    return Promise.resolve(this.array[this.array.length - 1]);
  }
}
