import Liquid from '../liquid';

export default (Liquid.Engine = class Engine {
  constructor() {
    this.tags = {};
    this.Strainer = function(context) {
      this.context = context;
    };
    this.registerFilters(Liquid.StandardFilters);

    this.fileSystem = new Liquid.BlankFileSystem();

    var isSubclassOf = function(klass, ofKlass) {
      if (typeof klass !== 'function') {
        return false;
      } else if (klass === ofKlass) {
        return true;
      } else {
        return isSubclassOf(
          __guard__(klass.__super__, x => x.constructor),
          ofKlass
        );
      }
    };

    for (let tagName of Object.keys(Liquid || {})) {
      let tag = Liquid[tagName];
      if (!isSubclassOf(tag, Liquid.Tag)) {
        continue;
      }
      let isBlockOrTagBaseClass = [Liquid.Tag, Liquid.Block].indexOf(
        tag.constructor
      ) >=
        0;
      if (!isBlockOrTagBaseClass) {
        this.registerTag(tagName.toLowerCase(), tag);
      }
    }
  }

  registerTag(name, tag) {
    return this.tags[name] = tag;
  }

  registerFilters(...filters) {
    return filters.forEach(filter => {
      return (() => {
        let result = [];
        for (let k of Object.keys(filter || {})) {
          let v = filter[k];
          let item;
          if (v instanceof Function) {
            item = this.Strainer.prototype[k] = v;
          }
          result.push(item);
        }
        return result;
      })();
    });
  }

  parse(source) {
    let template = new Liquid.Template();
    return template.parse(this, source);
  }

  parseAndRender(source, ...args) {
    return this.parse(source).then(template => template.render(...args));
  }

  registerFileSystem(fileSystem) {
    if (!(fileSystem instanceof Liquid.BlankFileSystem)) {
      throw Liquid.ArgumentError('Must be subclass of Liquid.BlankFileSystem');
    }
    return this.fileSystem = fileSystem;
  }
});

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
