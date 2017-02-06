import Assign from './tags/assign';
import BlankFileSystem from './blank_file_system';
import Capture from './tags/capture';
import Case from './tags/case';
import Comment from './tags/comment';
import Decrement from './tags/decrement';
import For from './tags/for';
import If from './tags/if';
import IfChanged from './tags/ifchanged';
import Include from './tags/include';
import Increment from './tags/increment';
import Raw from './tags/raw';
import StandardFilters from './standard_filters';
import Template from './template';
import Unless from './tags/unless';

export default class Engine {
  constructor() {
    this.tags = {
      assign: Assign,
      capture: Capture,
      case: Case,
      comment: Comment,
      decrement: Decrement,
      for: For,
      if: If,
      ifchanged: IfChanged,
      include: Include,
      increment: Increment,
      raw: Raw,
      unless: Unless
    };

    this.Strainer = function(context) {
      this.context = context;
    };
    this.registerFilters(StandardFilters);

    this.fileSystem = new BlankFileSystem();
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
    let template = new Template();
    return template.parse(this, source);
  }

  parseAndRender(source, ...args) {
    return this.parse(source).then(template => template.render(...args));
  }

  registerFileSystem(fileSystem) {
    if (!(fileSystem instanceof BlankFileSystem)) {
      throw Liquid.ArgumentError('Must be subclass of BlankFileSystem');
    }
    return this.fileSystem = fileSystem;
  }
};
