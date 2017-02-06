class Liquid$1 {
  static initClass() {
    this.FilterSeparator = /\|/;
    this.ArgumentSeparator = /,/;
    this.FilterArgumentSeparator = /\:/;
    this.VariableAttributeSeparator = /\./;
    this.TagStart = /\{\%/;
    this.TagEnd = /\%\}/;
    this.VariableSignature = /\(?[\w\-\.\[\]]\)?/;
    this.VariableSegment = /[\w\-]/;
    this.VariableStart = /\{\{/;
    this.VariableEnd = /\}\}/;
    this.VariableIncompleteEnd = /\}\}?/;
    this.QuotedString = /"[^"]*"|'[^']*'/;
    this.QuotedFragment = new RegExp(
      `${this.QuotedString.source}|(?:[^\\s,\\|'"]|${this.QuotedString.source})+`
    );
    this.StrictQuotedFragment = /"[^"]+"|'[^']+'|[^\s|:,]+/;
    this.FirstFilterArgument = new RegExp(
      `${this.FilterArgumentSeparator.source}(?:${this.StrictQuotedFragment.source})`
    );
    this.OtherFilterArgument = new RegExp(
      `${this.ArgumentSeparator.source}(?:${this.StrictQuotedFragment.source})`
    );
    this.SpacelessFilter = new RegExp(
      `^(?:'[^']+'|"[^"]+"|[^'"])*${this.FilterSeparator.source}(?:${this.StrictQuotedFragment.source})(?:${this.FirstFilterArgument.source}(?:${this.OtherFilterArgument.source})*)?`
    );
    this.Expression = new RegExp(
      `(?:${this.QuotedFragment.source}(?:${this.SpacelessFilter.source})*)`
    );
    this.TagAttributes = new RegExp(
      `(\\w+)\\s*\\:\\s*(${this.QuotedFragment.source})`
    );
    this.AnyStartingTag = /\{\{|\{\%/;
    this.PartialTemplateParser = new RegExp(
      `${this.TagStart.source}.*?${this.TagEnd.source}|${this.VariableStart.source}.*?${this.VariableIncompleteEnd.source}`
    );
    this.TemplateParser = new RegExp(
      `(${this.PartialTemplateParser.source}|${this.AnyStartingTag.source})`
    );
    this.VariableParser = new RegExp(
      `\\[[^\\]]+\\]|${this.VariableSegment.source}+\\??`
    );
  }
}
Liquid$1.initClass();
Liquid$1.Error = Error;

// Errors
[
  'ArgumentError',
  'ContextError',
  'FilterNotFound',
  'FileSystemError',
  'StandardError',
  'StackLevelError',
  'SyntaxError'
].forEach(className => Liquid$1[className] = Liquid$1.Error);

class Tag {
  constructor(template, tagName, markup) {
    this.template = template;
    this.tagName = tagName;
    this.markup = markup;
  }

  parseWithCallbacks(...args) {
    let parse;
    if (this.afterParse) {
      parse = () => this.parse(...args).then(() => this.afterParse(...args));
    } else {
      parse = () => this.parse(...args);
    }

    if (this.beforeParse) {
      return Promise.resolve(this.beforeParse(...args)).then(parse);
    } else {
      return parse();
    }
  }

  parse() {
  }

  name() {
    return this.constructor.name.toLowerCase();
  }

  render() {
    return '';
  }
}

let SyntaxHelp = undefined;
let Syntax = undefined;

class Assign extends Tag {
  static initClass() {
    SyntaxHelp = "Syntax Error in 'assign' - Valid syntax: assign [var] = [source]";
    Syntax = new RegExp(
      `\
((?:${Liquid$1.VariableSignature.source})+)\
\\s*=\\s*\
(.*)\\s*\
`
    );
  }

  constructor(template, tagName, markup) {
    let match;
    super(...arguments);
    if (match = Syntax.exec(markup)) {
      this.to = match[1];
      this.from = new Liquid$1.Variable(match[2]);
    } else {
      throw new Liquid$1.SyntaxError(SyntaxHelp);
    }
  }

  render(context) {
    context.lastScope()[this.to] = this.from.render(context);
    return super.render(context);
  }
}
Assign.initClass();

class BlankFileSystem {
  constructor() {
  }

  readTemplateFile(templatePath) {
    return Promise.reject(new Liquid$1.FileSystemError(
      "This file system doesn't allow includes"
    ));
  }
}

let reduce = (collection, reducer, value) =>
  Promise
    .all(collection)
    .then(items =>
      items.reduce(
        (promise, item, index, length) =>
          promise.then(value => reducer(value, item, index, length)),
        Promise.resolve(value)
      ));

var helpers = {
  flatten(array) {
    let output = [];

    var _flatten = array => array.forEach(function(item) {
      if (Array.isArray(item)) {
        return _flatten(item);
      } else {
        return output.push(item);
      }
    });

    _flatten(array);
    return output;
  },
  toFlatString(array) {
    return this.flatten(array).join('');
  },
  scan(string, regexp, globalMatch) {
    if (globalMatch == null) {
      globalMatch = false;
    }
    let result = [];

    var _scan = function(s) {
      let match = regexp.exec(s);

      if (match) {
        if (match.length === 1) {
          result.push(match[0]);
        } else {
          result.push(match.slice(1));
        }

        let l = match[0].length;
        if (globalMatch) {
          l = 1;
        }

        if (match.index + l < s.length) {
          return _scan(s.substring(match.index + l));
        }
      }
    };

    _scan(string);
    return result;
  }
};

// A drop in liquid is a class which allows you to to export DOM
// like things to liquid.
// Methods of drops are callable.
// The main use for liquid drops is the implement lazy loaded objects.
// If you would like to make data available to the web designers
// which you don't want loaded unless needed then a drop is a great
// way to do that
//
// Example:
//
//   ProductDrop = Liquid.Drop.extend
//     topSales: ->
//       Shop.current.products.all order: 'sales', limit: 10
//
//   tmpl = Liquid.Template.parse """
//     {% for product in product.top_sales %}
//       {{ product.name }}
//     {%endfor%}
//     """
//
//   tmpl.render(product: new ProductDrop) # will invoke topSales query.
//
// Your drop can either implement the methods sans any parameters or implement the
// before_method(name) method which is a
// catch all
class Drop {
  static initClass() {
    this.prototype.context = null;
  }

  hasKey(key) {
    return true;
  }

  invokeDrop(methodOrKey) {
    if (this.constructor.isInvokable(methodOrKey)) {
      let value = this[methodOrKey];

      if (typeof value === 'function') {
        return value.call(this);
      } else {
        return value;
      }
    } else {
      return this.beforeMethod(methodOrKey);
    }
  }

  beforeMethod(method) {
  }

  static isInvokable(method) {
    if (this.invokableMethods == null) {
      this.invokableMethods = (() => {
        let blacklist = Object.keys(Drop.prototype);
        let whitelist = ['toLiquid'];

        Object.keys(this.prototype).forEach(function(k) {
          if (blacklist.indexOf(k) < 0) {
            return whitelist.push(k);
          }
        });

        return whitelist;
      })();
    }

    return this.invokableMethods.indexOf(method) >= 0;
  }

  get(methodOrKey) {
    return this.invokeDrop(methodOrKey);
  }

  toLiquid() {
    return this;
  }

  toString() {
    return `[Liquid.Drop ${this.constructor.name}]`;
  }
}
Drop.initClass();

// Holds variables. Variables are only loaded "just in time"
// and are not evaluated as part of the render stage
//
//   {{ monkey }}
//   {{ user.name }}
//
// Variables can be combined with filters:
//
//   {{ user | link }}
//
let VariableNameFragment = undefined;
let FilterListFragment = undefined;
let FilterArgParser = undefined;

class Variable {
  static initClass() {
    this.FilterParser = new RegExp(
      `(?:${Liquid$1.FilterSeparator.source}|(?:\\s*(?!(?:${Liquid$1.FilterSeparator.source}))(?:${Liquid$1.QuotedFragment.source}|\\S+)\\s*)+)`
    );
    VariableNameFragment = new RegExp(
      `\\s*(${Liquid$1.QuotedFragment.source})(.*)`
    );
    FilterListFragment = new RegExp(`${Liquid$1.FilterSeparator.source}\\s*(.*)`);
    FilterArgParser = new RegExp(
      `(?:${Liquid$1.FilterArgumentSeparator.source}|${Liquid$1.ArgumentSeparator.source})\\s*(${Liquid$1.QuotedFragment.source})`
    );
  }

  constructor(markup) {
    this.markup = markup;
    this.name = null;
    this.filters = [];

    let match = VariableNameFragment.exec(this.markup);
    if (!match) {
      return;
    }

    this.name = match[1];

    match = FilterListFragment.exec(match[2]);
    if (!match) {
      return;
    }

    let filters = helpers.scan(match[1], Variable.FilterParser);
    filters.forEach(filter => {
      match = /\s*(\w+)/.exec(filter);
      if (!match) {
        return;
      }
      let filterName = match[1];
      let filterArgs = helpers.scan(filter, FilterArgParser);
      filterArgs = helpers.flatten(filterArgs);
      return this.filters.push([filterName, filterArgs]);
    });
  }

  render(context) {
    let filtered;
    if (this.name == null) {
      return '';
    }

    let reducer = (input, filter) => {
      let filterArgs = filter[1].map(a => context.get(a));

      return Promise.all([input, ...filterArgs]).then(results => {
        input = results.shift();
        try {
          return context.invoke(filter[0], input, ...results);
        } catch (e) {
          if (!(e instanceof Liquid$1.FilterNotFound)) {
            throw e;
          }
          throw new Liquid$1.FilterNotFound(
            `Error - filter '${filter[
              0
            ]}' in '${this.markup}' could not be found.`
          );
        }
      });
    };

    let value = Promise.resolve(context.get(this.name));

    switch (this.filters.length) {
      case 0:
        filtered = value;
        break;
      case 1:
        // Special case since Array#reduce doesn't call
        // reducer if element has only a single element.
        filtered = reducer(value, this.filters[0]);
        break;
      default:
        filtered = reduce(this.filters, reducer, value);
    }

    return filtered
      .then(function(f) {
        if (!(f instanceof Drop)) {
          return f;
        }
        f.context = context;
        return f.toString();
      })
      .catch(e => context.handleError(e));
  }
}
Variable.initClass();

// Iterates over promises sequentially
let Promise_each = function(promises, cb) {
  var iterator = function(index) {
    if (index >= promises.length) {
      return Promise.resolve();
    }
    let promise = promises[index];

    return Promise
      .resolve(promise)
      .then(value =>
        Promise.resolve(cb(value)).then(() => iterator(index + 1)));
  };

  return iterator(0);
};

class Block extends Tag {
  static initClass() {
    this.IsTag = new RegExp(`^${Liquid$1.TagStart.source}`);
    this.IsVariable = new RegExp(`^${Liquid$1.VariableStart.source}`);
    this.FullToken = new RegExp(
      `^${Liquid$1.TagStart.source}\\s*(\\w+)\\s*(.*)?${Liquid$1.TagEnd.source}$`
    );
    this.ContentOfVariable = new RegExp(
      `^${Liquid$1.VariableStart.source}(.*)${Liquid$1.VariableEnd.source}$`
    );
  }

  beforeParse() {
    if (this.nodelist == null) {
      this.nodelist = [];
    }
    return this.nodelist.length = 0; // clear array
  }

  afterParse() {
    // Make sure that its ok to end parsing in the current block.
    // Effectively this method will throw and exception unless the
    // current block is of type Document
    return this.assertMissingDelimitation();
  }

  parse(tokens) {
    if (tokens.length === 0 || this.ended) {
      return Promise.resolve();
    }
    let token = tokens.shift();

    return Promise
      .resolve()
      .then(() => {
        return this.parseToken(token, tokens);
      })
      .catch(function(e) {
        e.message = `${e.message}\n    at ${token.value} (${token.filename}:${token.line}:${token.col})`;
        if (e.location == null) {
          e.location = {
            col: token.col,
            line: token.line,
            filename: token.filename
          };
        }
        throw e;
      })
      .then(() => {
        return this.parse(tokens);
      });
  }

  parseToken(token, tokens) {
    if (Block.IsTag.test(token.value)) {
      let match = Block.FullToken.exec(token.value);

      if (!match) {
        throw new Liquid$1.SyntaxError(
          `Tag '${token.value}' was not properly terminated with regexp: ${Liquid$1.TagEnd.inspect}`
        );
      }

      if (this.blockDelimiter() === match[1]) {
        return this.endTag();
      }

      let Tag$$1 = this.template.tags[match[1]];
      if (!Tag$$1) {
        return this.unknownTag(match[1], match[2], tokens);
      }

      let tag = new Tag$$1(this.template, match[1], match[2]);
      this.nodelist.push(tag);
      return tag.parseWithCallbacks(tokens);
    } else if (Block.IsVariable.test(token.value)) {
      return this.nodelist.push(this.createVariable(token));
    } else if (token.value.length === 0) {
      // skip empty tokens
    } else {
      return this.nodelist.push(token.value);
    }
  }

  endTag() {
    return this.ended = true;
  }

  unknownTag(tag, params, tokens) {
    if (tag === 'else') {
      throw new Liquid$1.SyntaxError(
        `${this.blockName()} tag does not expect else tag`
      );
    } else if (tag === 'end') {
      throw new Liquid$1.SyntaxError(
        `'end' is not a valid delimiter for ${this.blockName()} tags. use ${this.blockDelimiter()}`
      );
    } else {
      throw new Liquid$1.SyntaxError(`Unknown tag '${tag}'`);
    }
  }

  blockDelimiter() {
    return `end${this.blockName()}`;
  }

  blockName() {
    return this.tagName;
  }

  createVariable(token) {
    let match = __guard__(
      Block.ContentOfVariable.exec(token.value),
      x => x[1]
    );
    if (match) {
      return new Variable(match);
    }
    throw new Liquid$1.SyntaxError(
      `Variable '${token.value}' was not properly terminated with regexp: ${Liquid$1.VariableEnd.inspect}`
    );
  }

  render(context) {
    return this.renderAll(this.nodelist, context);
  }

  assertMissingDelimitation() {
    if (!this.ended) {
      throw new Liquid$1.SyntaxError(`${this.blockName()} tag was never closed`);
    }
  }

  renderAll(list, context) {
    let accumulator = [];

    return Promise_each(list, function(token) {
      if (typeof __guard__(token, x => x.render) !== 'function') {
        accumulator.push(token);
        return;
      }

      return Promise
        .resolve()
        .then(() => token.render(context))
        .then(s => accumulator.push(s), e =>
          accumulator.push(context.handleError(e)));
    }).then(() => accumulator);
  }
}
Block.initClass();

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}

// Capture stores the result of a block into a variable without rendering it inplace.
//
//   {% capture heading %}
//     Monkeys!
//   {% endcapture %}
//   ...
//   <h1>{{ heading }}</h1>
//
// Capture is useful for saving content for use later in your template, such as
// in a sidebar or footer.
//
let Syntax$1 = undefined;
let SyntaxHelp$1 = undefined;
class Capture extends Block {
  static initClass() {
    Syntax$1 = /(\w+)/;
    SyntaxHelp$1 = "Syntax Error in 'capture' - Valid syntax: capture [var]";
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    let match = Syntax$1.exec(markup);

    if (match) {
      this.to = match[1];
    } else {
      throw new Liquid$1.SyntaxError(SyntaxHelp$1);
    }
  }

  render(context) {
    return super.render(...arguments).then(chunks => {
      let output = Liquid$1.Helpers.toFlatString(chunks);
      context.lastScope()[this.to] = output;
      return '';
    });
  }
}
Capture.initClass();

class Range {
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

class Context {
  static initClass() {
    // PRIVATE API

    this.Literals = {
      null: null,
      nil: null,
      '': null,
      true: true,
      false: false
    };
  }

  constructor(engine, environments, outerScope, registers, rethrowErrors) {
    let left;
    if (environments == null) {
      environments = {};
    }
    if (outerScope == null) {
      outerScope = {};
    }
    if (registers == null) {
      registers = {};
    }
    if (rethrowErrors == null) {
      rethrowErrors = false;
    }
    this.environments = helpers.flatten([environments]);
    this.scopes = [outerScope];
    this.registers = registers;
    this.errors = [];
    this.rethrowErrors = rethrowErrors;
    this.strainer = (left = __guard__$2(engine, x => new x.Strainer(this))) !=
      null
      ? left
      : {};
    this.squashInstanceAssignsWithEnvironments();
  }

  // Adds filters to this context.
  //
  // Note that this does not register the filters with the main
  // Template object. see <tt>Template.register_filter</tt>
  // for that
  registerFilters(...filters) {
    for (let filter of Array.from(filters)) {
      for (let k of Object.keys(filter || {})) {
        let v = filter[k];
        if (v instanceof Function) {
          this.strainer[k] = v;
        }
      }
    }
  }

  handleError(e) {
    this.errors.push(e);
    if (this.rethrowErrors) {
      throw e;
    }

    if (e instanceof Liquid$1.SyntaxError) {
      return `Liquid syntax error: ${e.message}`;
    } else {
      return `Liquid error: ${e.message}`;
    }
  }

  invoke(methodName, ...args) {
    let method = this.strainer[methodName];

    if (method instanceof Function) {
      return method.apply(this.strainer, args);
    } else {
      let available = Object.keys(this.strainer);
      throw new Liquid$1.FilterNotFound(
        `Unknown filter \`${methodName}\`, available: [${available.join(', ')}]`
      );
    }
  }

  push(newScope) {
    if (newScope == null) {
      newScope = {};
    }
    this.scopes.unshift(newScope);
    if (this.scopes.length > 100) {
      throw new Error('Nesting too deep');
    }
  }

  merge(newScope) {
    if (newScope == null) {
      newScope = {};
    }
    return (() => {
      let result = [];
      for (let k of Object.keys(newScope || {})) {
        let v = newScope[k];
        result.push(this.scopes[0][k] = v);
      }
      return result;
    })();
  }

  pop() {
    if (this.scopes.length <= 1) {
      throw new Error('ContextError');
    }
    return this.scopes.shift();
  }

  lastScope() {
    return this.scopes[this.scopes.length - 1];
  }

  // Pushes a new local scope on the stack, pops it at the end of the block
  //
  // Example:
  //   context.stack do
  //      context['var'] = 'hi'
  //   end
  //
  //   context['var]  #=> nil
  stack(newScope, f) {
    if (newScope == null) {
      newScope = {};
    }
    let popLater = false;

    try {
      if (arguments.length < 2) {
        f = newScope;
        newScope = {};
      }

      this.push(newScope);
      let result = f();

      if (__guard__$2(result, x => x.nodeify) != null) {
        popLater = true;
        result.nodeify(() => this.pop());
      }

      return result;
    } finally {
      if (!popLater) {
        this.pop();
      }
    }
  }

  clearInstanceAssigns() {
    return this.scopes[0] = {};
  }

  // Only allow String, Numeric, Hash, Array, Proc, Boolean
  // or <tt>Liquid::Drop</tt>
  set(key, value) {
    return this.scopes[0][key] = value;
  }

  get(key) {
    return this.resolve(key);
  }

  hasKey(key) {
    return Promise.resolve(this.resolve(key)).then(v => v != null);
  }

  // Look up variable, either resolve directly after considering the name.
  // We can directly handle Strings, digits, floats and booleans (true,false).
  // If no match is made we lookup the variable in the current scope and
  // later move up to the parent blocks to see if we can resolve
  // the variable somewhere up the tree.
  // Some special keywords return symbols. Those symbols are to be called on the rhs object in expressions
  //
  // Example:
  //   products == empty #=> products.empty?
  resolve(key) {
    let match;
    if (Context.Literals.hasOwnProperty(key)) {
      return Context.Literals[key];
    } else if (
      match = /^'(.*)'$/.exec(key) // Single quoted strings
    ) {
      return match[1];
    } else if (
      match = /^"(.*)"$/.exec(key) // Double quoted strings
    ) {
      return match[1];
    } else if (
      match = /^(\d+)$/.exec(key) // Integer and floats
    ) {
      return Number(match[1]);
    } else if (
      match = /^\((\S+)\.\.(\S+)\)$/.exec(key) // Ranges
    ) {
      let lo = this.resolve(match[1]);
      let hi = this.resolve(match[2]);

      return Promise.all([lo, hi]).then(function(...args) {
        [lo, hi] = Array.from(args[0]);
        lo = Number(lo);
        hi = Number(hi);
        if (isNaN(lo) || isNaN(hi)) {
          return [];
        }
        return new Range(lo, hi + 1);
      });
    } else if (
      match = /^(\d[\d\.]+)$/.exec(key) // Floats
    ) {
      return Number(match[1]);
    } else {
      return this.variable(key);
    }
  }

  findVariable(key) {
    let variableScope = undefined;
    let variable = undefined;

    this.scopes.some(function(scope) {
      if (scope.hasOwnProperty(key)) {
        variableScope = scope;
        return true;
      }
    });

    if (variableScope == null) {
      this.environments.some(env => {
        variable = this.lookupAndEvaluate(env, key);
        if (variable != null) {
          return variableScope = env;
        }
      });
    }

    if (variableScope == null) {
      if (this.environments.length > 0) {
        variableScope = this.environments[this.environments.length - 1];
      } else if (this.scopes.length > 0) {
        variableScope = this.scopes[this.scopes.length - 1];
      } else {
        throw new Error('No scopes to find variable in.');
      }
    }

    if (variable == null) {
      variable = this.lookupAndEvaluate(variableScope, key);
    }

    return Promise.resolve(variable).then(v => this.liquify(v));
  }

  variable(markup) {
    return Promise.resolve().then(() => {
      let match;
      let parts = helpers.scan(markup, Liquid$1.VariableParser);
      let squareBracketed = /^\[(.*)\]$/;

      let firstPart = parts.shift();

      if (match = squareBracketed.exec(firstPart)) {
        firstPart = match[1];
      }

      let object = this.findVariable(firstPart);
      if (parts.length === 0) {
        return object;
      }

      let mapper = (part, object) => {
        if (object == null) {
          return Promise.resolve(object);
        }

        return Promise
          .resolve(object)
          .then(this.liquify.bind(this))
          .then(object => {
            if (object == null) {
              return object;
            }

            let bracketMatch = squareBracketed.exec(part);
            if (bracketMatch) {
              part = this.resolve(bracketMatch[1]);
            }

            return Promise.resolve(part).then(part => {
              let isArrayAccess = Array.isArray(object) && isFinite(part);
              let isObjectAccess = object instanceof Object &&
                (__guardMethod__$1(object, 'hasKey', o => o.hasKey(part)) ||
                  part in object);
              let isSpecialAccess = !bracketMatch &&
                object &&
                (Array.isArray(object) ||
                  Object.prototype.toString.call(object) ===
                    '[object String]') &&
                ['size', 'first', 'last'].indexOf(part) >= 0;

              if (isArrayAccess || isObjectAccess) {
                // If object is a hash- or array-like object we look for the
                // presence of the key and if its available we return it
                return Promise
                  .resolve(this.lookupAndEvaluate(object, part))
                  .then(this.liquify.bind(this));
              } else if (isSpecialAccess) {
                // Some special cases. If the part wasn't in square brackets
                // and no key with the same name was found we interpret
                // following calls as commands and call them on the
                // current object
                switch (part) {
                  case 'size':
                    return this.liquify(object.length);
                  case 'first':
                    return this.liquify(object[0]);
                  case 'last':
                    return this.liquify(object[object.length - 1]);
                  default:
                    /* @covignore */
                    throw new Error(`Unknown special accessor: ${part}`);
                }
              }
            });
          });
      };

      // The iterator walks through the parsed path step
      // by step and waits for promises to be fulfilled.
      var iterator = function(object, index) {
        if (index < parts.length) {
          return mapper(parts[index], object).then(object =>
            iterator(object, index + 1));
        } else {
          return Promise.resolve(object);
        }
      };

      return iterator(object, 0).catch(function(err) {
        throw new Error(`Couldn't walk variable: ${markup}: ${err}`);
      });
    });
  }

  lookupAndEvaluate(obj, key) {
    if (obj instanceof Drop) {
      return obj.get(key);
    } else {
      return __guard__$2(obj, x => x[key]);
    }
  }

  squashInstanceAssignsWithEnvironments() {
    let lastScope = this.lastScope();

    return Object.keys(lastScope).forEach(key => {
      return this.environments.some(env => {
        if (env.hasOwnProperty(key)) {
          lastScope[key] = this.lookupAndEvaluate(env, key);
          return true;
        }
      });
    });
  }

  liquify(object) {
    return Promise.resolve(object).then(object => {
      if (object == null) {
        return object;
      } else if (typeof object.toLiquid === 'function') {
        object = object.toLiquid();
      } else if (typeof object === 'object') {
        true; // throw new Error "Complex object #{JSON.stringify(object)} would leak into template."
      } else if (typeof object === 'function') {
        object = '';
      } else {
        Object.prototype.toString.call(object);
      }

      if (object instanceof Drop) {
        object.context = this;
      }
      return object;
    });
  }
}
Context.initClass();

function __guard__$2(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
function __guardMethod__$1(obj, methodName, transform) {
  if (
    typeof obj !== 'undefined' &&
      obj !== null &&
      typeof obj[methodName] === 'function'
  ) {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}

// Container for liquid nodes which conveniently wraps decision making logic
//
// Example:
//
//   c = Condition.new('1', '==', '1')
//   c.evaluate #=> true
//
let LITERALS = undefined;
class Condition {
  static initClass() {
    this.operators = {
      ['=='](cond, left, right) {
        return cond.equalVariables(left, right);
      },
      ['is'](cond, left, right) {
        return cond.equalVariables(left, right);
      },
      ['!='](cond, left, right) {
        return !cond.equalVariables(left, right);
      },
      ['<>'](cond, left, right) {
        return !cond.equalVariables(left, right);
      },
      ['isnt'](cond, left, right) {
        return !cond.equalVariables(left, right);
      },
      ['<'](cond, left, right) {
        return left < right;
      },
      ['>'](cond, left, right) {
        return left > right;
      },
      ['<='](cond, left, right) {
        return left <= right;
      },
      ['>='](cond, left, right) {
        return left >= right;
      },
      ['contains'](cond, left, right) {
        return __guardMethod__(left, 'indexOf', o => o.indexOf(right)) >= 0;
      }
    };

    LITERALS = {
      empty(v) {
        return !(__guard__$1(v, x => x.length) > 0);
      }, // false for non-collections
      blank(v) {
        return !v || v.toString().length === 0;
      }
    };
  }

  constructor(left, operator, right) {
    this.left = left;
    this.operator = operator;
    this.right = right;
    this.childRelation = null;
    this.childCondition = null;
  }

  evaluate(context) {
    if (context == null) {
      context = new Context();
    }

    let result = this.interpretCondition(
      this.left,
      this.right,
      this.operator,
      context
    );

    switch (this.childRelation) {
      case 'or':
        return Promise.resolve(result).then(result => {
          return result || this.childCondition.evaluate(context);
        });
      case 'and':
        return Promise.resolve(result).then(result => {
          return result && this.childCondition.evaluate(context);
        });
      default:
        return result;
    }
  }

  or(childCondition) {
    this.childCondition = childCondition;
    return this.childRelation = 'or';
  }

  and(childCondition) {
    this.childCondition = childCondition;
    return this.childRelation = 'and';
  }

  // Returns first agument
  attach(attachment) {
    return this.attachment = attachment;
  }

  // private API

  equalVariables(left, right) {
    if (typeof left === 'function') {
      return left(right);
    } else if (typeof right === 'function') {
      return right(left);
    } else {
      return left === right;
    }
  }

  resolveVariable(v, context) {
    if (v in LITERALS) {
      return Promise.resolve(LITERALS[v]);
    } else {
      return context.get(v);
    }
  }

  interpretCondition(left, right, op, context) {
    // If the operator is empty this means that the decision statement is just
    // a single variable. We can just poll this variable from the context and
    // return this as the result.
    if (op == null) {
      return this.resolveVariable(left, context);
    }

    let operation = Condition.operators[op];
    if (operation == null) {
      throw new Error(`Unknown operator ${op}`);
    }

    left = this.resolveVariable(left, context);
    right = this.resolveVariable(right, context);

    return Promise.all([left, right]).then((...args) => {
      [left, right] = Array.from(args[0]);
      return operation(this, left, right);
    });
  }
}
Condition.initClass();

function __guardMethod__(obj, methodName, transform) {
  if (
    typeof obj !== 'undefined' &&
      obj !== null &&
      typeof obj[methodName] === 'function'
  ) {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guard__$1(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}

class ElseCondition extends Condition {
  evaluate() {
    return true;
  }
}

let SyntaxHelp$2 = undefined;
let Syntax$2 = undefined;
let WhenSyntax = undefined;

class Case extends Block {
  static initClass() {
    SyntaxHelp$2 = "Syntax Error in tag 'case' - Valid syntax: case [expression]";

    Syntax$2 = new RegExp(`(${Liquid$1.QuotedFragment.source})`);

    WhenSyntax = new RegExp(
      `\
(${Liquid$1.QuotedFragment.source})\
(?:\
(?:\\s+or\\s+|\\s*\\,\\s*)\
(${Liquid$1.QuotedFragment.source})\
)?\
`
    );
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    this.blocks = [];

    let match = Syntax$2.exec(markup);
    if (!match) {
      throw new Liquid$1.SyntaxError(SyntaxHelp$2);
    }

    this.markup = markup;
  }

  unknownTag(tag, markup) {
    if (['when', 'else'].includes(tag)) {
      return this.pushBlock(tag, markup);
    } else {
      return super.unknownTag(...arguments);
    }
  }

  render(context) {
    return context.stack(() => {
      return reduce(
        this.blocks,
        function(chosenBlock, block) {
          if (chosenBlock != null) {
            return chosenBlock;
          } // short-circuit
          return Promise
            .resolve()
            .then(() => block.evaluate(context))
            .then(function(ok) {
              if (ok) {
                return block;
              }
            });
        },
        null
      ).then(block => {
        if (block != null) {
          return this.renderAll(block.attachment, context);
        } else {
          return '';
        }
      });
    });
  }

  // private

  pushBlock(tag, markup) {
    let block;
    if (tag === 'else') {
      block = new ElseCondition();
      this.blocks.push(block);
      return this.nodelist = block.attach([]);
    } else {
      let expressions = helpers.scan(markup, WhenSyntax);

      let nodelist = [];

      return (() => {
        let result = [];
        for (let value of Array.from(expressions[0])) {
          let item;
          if (value) {
            block = new Condition(this.markup, '==', value);
            this.blocks.push(block);
            item = this.nodelist = block.attach(nodelist);
          }
          result.push(item);
        }
        return result;
      })();
    }
  }
}
Case.initClass();

class Raw extends Block {
  parse(tokens) {
    return Promise.resolve().then(() => {
      if (tokens.length === 0 || this.ended) {
        return Promise.resolve();
      }

      let token = tokens.shift();
      let match = Block.FullToken.exec(token.value);

      if (__guard__$3(match, x => x[1]) === this.blockDelimiter()) {
        return this.endTag();
      }

      this.nodelist.push(token.value);
      return this.parse(tokens);
    });
  }
}

function __guard__$3(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}

class Comment extends Raw {
  render() {
    return '';
  }
}

// decrement is used in a place where one needs to insert a counter
//     into a template, and needs the counter to survive across
//     multiple instantiations of the template.
//     NOTE: decrement is a pre-decrement, --i,
//           while increment is post:      i++.
//
//     (To achieve the survival, the application must keep the context)
//
//     if the variable does not exist, it is created with value 0.

//   Hello: {% decrement variable %}
//
// gives you:
//
//    Hello: -1
//    Hello: -2
//    Hello: -3
//
class Decrement extends Tag {
  constructor(template, tagName, markup) {
    super(...arguments);
    this.variable = markup.trim();
  }

  render(context) {
    let value = context.environments[0][this.variable] ||
      (context.environments[0][this.variable] = 0);
    value = value - 1;
    context.environments[0][this.variable] = value;
    return value.toString();
  }
}

let isString = input =>
  Object.prototype.toString.call(input) === '[object String]';

class Iterable {
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

class IterableForArray extends Iterable {
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

// "For" iterates over an array or collection.
// Several useful variables are available to you within the loop.
//
// == Basic usage:
//    {% for item in collection %}
//      {{ forloop.index }}: {{ item.name }}
//    {% endfor %}
//
// == Advanced usage:
//    {% for item in collection %}
//      <div {% if forloop.first %}class="first"{% endif %}>
//        Item {{ forloop.index }}: {{ item.name }}
//      </div>
//    {% else %}
//      There is nothing in the collection.
//    {% endfor %}
//
// You can also define a limit and offset much like SQL.  Remember
// that offset starts at 0 for the first item.
//
//    {% for item in collection limit:5 offset:10 %}
//      {{ item.name }}
//    {% end %}
//
//  To reverse the for loop simply use {% for item in collection reversed %}
//
// == Available variables:
//
// forloop.name:: 'item-collection'
// forloop.length:: Length of the loop
// forloop.index:: The current item's position in the collection;
//                 forloop.index starts at 1.
//                 This is helpful for non-programmers who start believe
//                 the first item in an array is 1, not 0.
// forloop.index0:: The current item's position in the collection
//                  where the first item is 0
// forloop.rindex:: Number of items remaining in the loop
//                  (length - index) where 1 is the last item.
// forloop.rindex0:: Number of items remaining in the loop
//                   where 0 is the last item.
// forloop.first:: Returns true if the item is the first item.
// forloop.last:: Returns true if the item is the last item.
//

let SyntaxHelp$3 = undefined;
let Syntax$3 = undefined;

class For extends Block {
  static initClass() {
    SyntaxHelp$3 = "Syntax Error in 'for loop' - Valid syntax: for [item] in [collection]";
    Syntax$3 = new RegExp(
      `\
(\\w+)\\s+in\\s+\
((?:${Liquid$1.QuotedFragment.source})+)\
\\s*(reversed)?\
`
    );
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    let match = Syntax$3.exec(markup);

    if (match) {
      this.variableName = match[1];
      this.collectionName = match[2];
      this.registerName = `${match[1]}=${match[2]}`;
      this.reversed = match[3];
      this.attributes = {};

      helpers.scan(markup, Liquid$1.TagAttributes).forEach(attr => {
        return this.attributes[attr[0]] = attr[1];
      });
    } else {
      throw new Liquid$1.SyntaxError(SyntaxHelp$3);
    }

    this.nodelist = this.forBlock = [];
  }

  unknownTag(tag, markup) {
    if (tag !== 'else') {
      return super.unknownTag(...arguments);
    }
    return this.nodelist = this.elseBlock = [];
  }

  render(context) {
    if (!context.registers.for) {
      context.registers.for = {};
    }

    return Promise
      .resolve(context.get(this.collectionName))
      .then(collection => {
        if (__guard__$4(collection, x => x.forEach)) {
          // pass
        } else if (collection instanceof Object) {
          collection = (() => {
            let result = [];
            for (let k of Object.keys(collection || {})) {
              let v = collection[k];
              result.push([k, v]);
            }
            return result;
          })();
        } else {
          return this.renderElse(context);
        }

        let from = this.attributes.offset === 'continue'
          ? Number(context.registers['for'][this.registerName]) || 0
          : Number(this.attributes.offset) || 0;

        let { limit } = this.attributes;
        let to = limit ? Number(limit) + from : null;

        return this.sliceCollection(collection, from, to).then(segment => {
          if (segment.length === 0) {
            return this.renderElse(context);
          }

          if (this.reversed) {
            segment.reverse();
          }

          let { length } = segment;

          // Store our progress through the collection for the continue flag
          context.registers['for'][this.registerName] = from + segment.length;

          return context.stack(() => {
            return reduce(
              segment,
              (output, item, index) => {
                context.set(this.variableName, item);
                context.set('forloop', {
                  name: this.registerName,
                  length,
                  index: index + 1,
                  index0: index,
                  rindex: length - index,
                  rindex0: length - index - 1,
                  first: index === 0,
                  last: index === length - 1
                });

                return Promise
                  .resolve()
                  .then(() => {
                    return this.renderAll(this.forBlock, context);
                  })
                  .then(function(rendered) {
                    output.push(rendered);
                    return output;
                  })
                  .catch(function(e) {
                    output.push(context.handleError(e));
                    return output;
                  });
              },
              []
            );
          });
        });
      });
  }

  sliceCollection(collection, from, to) {
    let args = [from];
    if (to != null) {
      args.push(to);
    }
    return Iterable.cast(collection).slice(...args);
  }

  renderElse(context) {
    if (this.elseBlock) {
      return this.renderAll(this.elseBlock, context);
    } else {
      return '';
    }
  }
}
For.initClass();

function __guard__$4(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}

let SyntaxHelp$4 = undefined;
let Syntax$4 = undefined;
let ExpressionsAndOperators = undefined;

class If extends Block {
  static initClass() {
    SyntaxHelp$4 = "Syntax Error in tag 'if' - Valid syntax: if [expression]";

    Syntax$4 = new RegExp(
      `\
(${Liquid$1.QuotedFragment.source})\\s*\
([=!<>a-z_]+)?\\s*\
(${Liquid$1.QuotedFragment.source})?\
`
    );

    ExpressionsAndOperators = new RegExp(
      `\
(?:\
\\b(?:\\s?and\\s?|\\s?or\\s?)\\b\
|\
(?:\\s*\
(?!\\b(?:\\s?and\\s?|\\s?or\\s?)\\b)\
(?:${Liquid$1.QuotedFragment.source}|\\S+)\
\\s*)\
+)\
`
    );
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    this.blocks = [];
    this.pushBlock('if', markup);
  }

  unknownTag(tag, markup) {
    if (['elsif', 'else'].includes(tag)) {
      return this.pushBlock(tag, markup);
    } else {
      return super.unknownTag(...arguments);
    }
  }

  render(context) {
    return context.stack(() => {
      return reduce(
        this.blocks,
        function(chosenBlock, block) {
          if (chosenBlock != null) {
            return chosenBlock;
          } // short-circuit
          return Promise
            .resolve()
            .then(() => block.evaluate(context))
            .then(function(ok) {
              if (block.negate) {
                ok = !ok;
              }
              if (ok) {
                return block;
              }
            });
        },
        null
      ).then(block => {
        if (block != null) {
          return this.renderAll(block.attachment, context);
        } else {
          return '';
        }
      });
    });
  }

  // private

  pushBlock(tag, markup) {
    let block = (() => {
      if (tag === 'else') {
        return new ElseCondition();
      } else {
        let expressions = helpers.scan(markup, ExpressionsAndOperators);
        expressions = expressions.reverse();
        let match = Syntax$4.exec(expressions.shift());

        if (!match) {
          throw new Liquid$1.SyntaxError(SyntaxHelp$4);
        }

        let condition = new Condition(...match.slice(1, 4));

        while (expressions.length > 0) {
          let operator = String(expressions.shift()).trim();

          match = Syntax$4.exec(expressions.shift());
          if (!match) {
            throw new SyntaxError(SyntaxHelp$4);
          }

          let newCondition = new Condition(...match.slice(1, 4));
          newCondition[operator].call(newCondition, condition);
          condition = newCondition;
        }

        return condition;
      }
    })();

    this.blocks.push(block);
    return this.nodelist = block.attach([]);
  }
}
If.initClass();

class IfChanged extends Block {
  render(context) {
    return context.stack(() => {
      let rendered = this.renderAll(this.nodelist, context);

      return Promise.resolve(rendered).then(function(output) {
        output = helpers.toFlatString(output);

        if (output !== context.registers.ifchanged) {
          return context.registers.ifchanged = output;
        } else {
          return '';
        }
      });
    });
  }
}

let Syntax$5 = undefined;
let SyntaxHelp$5 = undefined;

class Include extends Tag {
  static initClass() {
    Syntax$5 = /([a-z0-9\/\\_-]+)/i;
    SyntaxHelp$5 = `Syntax Error in 'include' - \
Valid syntax: include [templateName]`;
  }

  constructor(template, tagName, markup, tokens) {
    super(...arguments);
    let match = Syntax$5.exec(markup);
    if (!match) {
      throw new Liquid$1.SyntaxError(SyntaxHelp$5);
    }

    this.filepath = match[1];
    this.subTemplate = template.engine.fileSystem
      .readTemplateFile(this.filepath)
      .then(src => template.engine.parse(src));
  }

  render(context) {
    return this.subTemplate.then(i => i.render(context));
  }
}
Include.initClass();

// increment is used in a place where one needs to insert a counter
//     into a template, and needs the counter to survive across
//     multiple instantiations of the template.
//     (To achieve the survival, the application must keep the context)
//
//     if the variable does not exist, it is created with value 0.

//   Hello: {% increment variable %}
//
// gives you:
//
//    Hello: 0
//    Hello: 1
//    Hello: 2
//

class Increment extends Tag {
  constructor(template, tagName, markup) {
    super(...arguments);
    this.variable = markup.trim();
  }

  render(context) {
    let value = context.environments[0][this.variable] != null
      ? context.environments[0][this.variable]
      : context.environments[0][this.variable] = 0;
    context.environments[0][this.variable] = value + 1;
    return String(value);
  }
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var strftime = createCommonjsModule(function (module) {
//
// strftime
// github.com/samsonjs/strftime
// @_sjs
//
// Copyright 2010 - 2016 Sami Samhuri <sami@samhuri.net>
//
// MIT License
// http://sjs.mit-license.org
//

(function() {

    var Locales = {
        de_DE: {
            days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
            shortDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
            months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
            shortMonths: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d.%m.%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        en_CA: {
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
            shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ordinalSuffixes: [
                'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'st'
            ],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d/%m/%y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%r',
                x: '%D'
            }
        },

        en_US: {
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
            shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ordinalSuffixes: [
                'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th',
                'st'
            ],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%m/%d/%y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%r',
                x: '%D'
            }
        },

        es_MX: {
            days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
            shortDays: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
            months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',' diciembre'],
            shortMonths: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d/%m/%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        fr_FR: {
            days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
            shortDays: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
            months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
            shortMonths: ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d/%m/%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        it_IT: {
            days: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
            shortDays: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
            months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
            shortMonths: ['pr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d/%m/%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        nl_NL: {
            days: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
            shortDays: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
            months: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
            shortMonths: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d-%m-%y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        pt_BR: {
            days: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
            shortDays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
            shortMonths: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d-%m-%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        ru_RU: {
            days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
            shortDays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
            months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
            shortMonths: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
            AM: 'AM',
            PM: 'PM',
            am: 'am',
            pm: 'pm',
            formats: {
                c: '%a %d %b %Y %X',
                D: '%d.%m.%y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        tr_TR: {
            days: ['Pazar', 'Pazartesi', 'Salı','Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
            shortDays: ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'],
            months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
            shortMonths: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
            AM: 'ÖÖ',
            PM: 'ÖS',
            am: 'ÖÖ',
            pm: 'ÖS',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d-%m-%Y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%T',
                x: '%D'
            }
        },

        // By michaeljayt<michaeljayt@gmail.com>
        // https://github.com/michaeljayt/strftime/commit/bcb4c12743811d51e568175aa7bff3fd2a77cef3
        zh_CN: {
            days: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
            shortDays: ['日', '一', '二', '三', '四', '五', '六'],
            months: ['一月份', '二月份', '三月份', '四月份', '五月份', '六月份', '七月份', '八月份', '九月份', '十月份', '十一月份', '十二月份'],
            shortMonths: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
            AM: '上午',
            PM: '下午',
            am: '上午',
            pm: '下午',
            formats: {
                c: '%a %d %b %Y %X %Z',
                D: '%d/%m/%y',
                F: '%Y-%m-%d',
                R: '%H:%M',
                r: '%I:%M:%S %p',
                T: '%H:%M:%S',
                v: '%e-%b-%Y',
                X: '%r',
                x: '%D'
            }
        }
    };

    var DefaultLocale = Locales['en_US'],
        defaultStrftime = new Strftime(DefaultLocale, 0, false),
        isCommonJS = 'object' !== 'undefined',
        namespace;

    // CommonJS / Node module
    if (isCommonJS) {
        namespace = module.exports = defaultStrftime;
    }
    // Browsers and other environments
    else {
        // Get the global object. Works in ES3, ES5, and ES5 strict mode.
        namespace = (function() { return this || (1,eval)('this'); }());
        namespace.strftime = defaultStrftime;
    }

    // Polyfill Date.now for old browsers.
    if (typeof Date.now !== 'function') {
        Date.now = function() {
          return +new Date();
        };
    }

    function Strftime(locale, customTimezoneOffset, useUtcTimezone) {
        var _locale = locale || DefaultLocale,
            _customTimezoneOffset = customTimezoneOffset || 0,
            _useUtcBasedDate = useUtcTimezone || false,

            // we store unix timestamp value here to not create new Date() each iteration (each millisecond)
            // Date.now() is 2 times faster than new Date()
            // while millisecond precise is enough here
            // this could be very helpful when strftime triggered a lot of times one by one
            _cachedDateTimestamp = 0,
            _cachedDate;

        function _strftime(format, date) {
            var timestamp;

            if (!date) {
                var currentTimestamp = Date.now();
                if (currentTimestamp > _cachedDateTimestamp) {
                    _cachedDateTimestamp = currentTimestamp;
                    _cachedDate = new Date(_cachedDateTimestamp);

                    timestamp = _cachedDateTimestamp;

                    if (_useUtcBasedDate) {
                        // how to avoid duplication of date instantiation for utc here?
                        // we tied to getTimezoneOffset of the current date
                        _cachedDate = new Date(_cachedDateTimestamp + getTimestampToUtcOffsetFor(_cachedDate) + _customTimezoneOffset);
                    }
                }
                else {
                  timestamp = _cachedDateTimestamp;
                }
                date = _cachedDate;
            }
            else {
                timestamp = date.getTime();

                if (_useUtcBasedDate) {
                    var utcOffset = getTimestampToUtcOffsetFor(date);
                    date = new Date(timestamp + utcOffset + _customTimezoneOffset);
                    // If we've crossed a DST boundary with this calculation we need to
                    // adjust the new date accordingly or it will be off by an hour in UTC.
                    if (getTimestampToUtcOffsetFor(date) !== utcOffset) {
                        var newUTCOffset = getTimestampToUtcOffsetFor(date);
                        date = new Date(timestamp + newUTCOffset + _customTimezoneOffset);
                    }
                }
            }

            return _processFormat(format, date, _locale, timestamp);
        }

        function _processFormat(format, date, locale, timestamp) {
            var resultString = '',
                padding = null,
                isInScope = false,
                length = format.length,
                extendedTZ = false;

            for (var i = 0; i < length; i++) {

                var currentCharCode = format.charCodeAt(i);

                if (isInScope === true) {
                    // '-'
                    if (currentCharCode === 45) {
                        padding = '';
                        continue;
                    }
                    // '_'
                    else if (currentCharCode === 95) {
                        padding = ' ';
                        continue;
                    }
                    // '0'
                    else if (currentCharCode === 48) {
                        padding = '0';
                        continue;
                    }
                    // ':'
                    else if (currentCharCode === 58) {
                      if (extendedTZ) {
                          warn("[WARNING] detected use of unsupported %:: or %::: modifiers to strftime");
                      }
                      extendedTZ = true;
                      continue;
                    }

                    switch (currentCharCode) {

                        // Examples for new Date(0) in GMT

                        // '%'
                        // case '%':
                        case 37:
                            resultString += '%';
                            break;

                        // 'Thursday'
                        // case 'A':
                        case 65:
                            resultString += locale.days[date.getDay()];
                            break;

                        // 'January'
                        // case 'B':
                        case 66:
                            resultString += locale.months[date.getMonth()];
                            break;

                        // '19'
                        // case 'C':
                        case 67:
                            resultString += padTill2(Math.floor(date.getFullYear() / 100), padding);
                            break;

                        // '01/01/70'
                        // case 'D':
                        case 68:
                            resultString += _processFormat(locale.formats.D, date, locale, timestamp);
                            break;

                        // '1970-01-01'
                        // case 'F':
                        case 70:
                            resultString += _processFormat(locale.formats.F, date, locale, timestamp);
                            break;

                        // '00'
                        // case 'H':
                        case 72:
                            resultString += padTill2(date.getHours(), padding);
                            break;

                        // '12'
                        // case 'I':
                        case 73:
                            resultString += padTill2(hours12(date.getHours()), padding);
                            break;

                        // '000'
                        // case 'L':
                        case 76:
                            resultString += padTill3(Math.floor(timestamp % 1000));
                            break;

                        // '00'
                        // case 'M':
                        case 77:
                            resultString += padTill2(date.getMinutes(), padding);
                            break;

                        // 'am'
                        // case 'P':
                        case 80:
                            resultString += date.getHours() < 12 ? locale.am : locale.pm;
                            break;

                        // '00:00'
                        // case 'R':
                        case 82:
                            resultString += _processFormat(locale.formats.R, date, locale, timestamp);
                            break;

                        // '00'
                        // case 'S':
                        case 83:
                            resultString += padTill2(date.getSeconds(), padding);
                            break;

                        // '00:00:00'
                        // case 'T':
                        case 84:
                            resultString += _processFormat(locale.formats.T, date, locale, timestamp);
                            break;

                        // '00'
                        // case 'U':
                        case 85:
                            resultString += padTill2(weekNumber(date, 'sunday'), padding);
                            break;

                        // '00'
                        // case 'W':
                        case 87:
                            resultString += padTill2(weekNumber(date, 'monday'), padding);
                            break;

                        // '16:00:00'
                        // case 'X':
                        case 88:
                            resultString += _processFormat(locale.formats.X, date, locale, timestamp);
                            break;

                        // '1970'
                        // case 'Y':
                        case 89:
                            resultString += date.getFullYear();
                            break;

                        // 'GMT'
                        // case 'Z':
                        case 90:
                            if (_useUtcBasedDate && _customTimezoneOffset === 0) {
                                resultString += "GMT";
                            }
                            else {
                                // fixme optimize
                                var tzString = date.toString().match(/\(([\w\s]+)\)/);
                                resultString += tzString && tzString[1] || '';
                            }
                            break;

                        // 'Thu'
                        // case 'a':
                        case 97:
                            resultString += locale.shortDays[date.getDay()];
                            break;

                        // 'Jan'
                        // case 'b':
                        case 98:
                            resultString += locale.shortMonths[date.getMonth()];
                            break;

                        // ''
                        // case 'c':
                        case 99:
                            resultString += _processFormat(locale.formats.c, date, locale, timestamp);
                            break;

                        // '01'
                        // case 'd':
                        case 100:
                            resultString += padTill2(date.getDate(), padding);
                            break;

                        // ' 1'
                        // case 'e':
                        case 101:
                            resultString += padTill2(date.getDate(), padding == null ? ' ' : padding);
                            break;

                        // 'Jan'
                        // case 'h':
                        case 104:
                            resultString += locale.shortMonths[date.getMonth()];
                            break;

                        // '000'
                        // case 'j':
                        case 106:
                            var y = new Date(date.getFullYear(), 0, 1);
                            var day = Math.ceil((date.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
                            resultString += padTill3(day);
                            break;

                        // ' 0'
                        // case 'k':
                        case 107:
                            resultString += padTill2(date.getHours(), padding == null ? ' ' : padding);
                            break;

                        // '12'
                        // case 'l':
                        case 108:
                            resultString += padTill2(hours12(date.getHours()), padding == null ? ' ' : padding);
                            break;

                        // '01'
                        // case 'm':
                        case 109:
                            resultString += padTill2(date.getMonth() + 1, padding);
                            break;

                        // '\n'
                        // case 'n':
                        case 110:
                            resultString += '\n';
                            break;

                        // '1st'
                        // case 'o':
                        case 111:
                            // Try to use an ordinal suffix from the locale, but fall back to using the old
                            // function for compatibility with old locales that lack them.
                            var day = date.getDate();
                            if (locale.ordinalSuffixes) {
                                resultString += String(day) + (locale.ordinalSuffixes[day - 1] || ordinal(day));
                            }
                            else {
                                resultString += String(day) + ordinal(day);
                            }
                            break;

                        // 'AM'
                        // case 'p':
                        case 112:
                            resultString += date.getHours() < 12 ? locale.AM : locale.PM;
                            break;

                        // '12:00:00 AM'
                        // case 'r':
                        case 114:
                            resultString += _processFormat(locale.formats.r, date, locale, timestamp);
                            break;

                        // '0'
                        // case 's':
                        case 115:
                            resultString += Math.floor(timestamp / 1000);
                            break;

                        // '\t'
                        // case 't':
                        case 116:
                            resultString += '\t';
                            break;

                        // '4'
                        // case 'u':
                        case 117:
                            var day = date.getDay();
                            resultString += day === 0 ? 7 : day;
                            break; // 1 - 7, Monday is first day of the week

                        // ' 1-Jan-1970'
                        // case 'v':
                        case 118:
                            resultString += _processFormat(locale.formats.v, date, locale, timestamp);
                            break;

                        // '4'
                        // case 'w':
                        case 119:
                            resultString += date.getDay();
                            break; // 0 - 6, Sunday is first day of the week

                        // '12/31/69'
                        // case 'x':
                        case 120:
                            resultString += _processFormat(locale.formats.x, date, locale, timestamp);
                            break;

                        // '70'
                        // case 'y':
                        case 121:
                            resultString += ('' + date.getFullYear()).slice(2);
                            break;

                        // '+0000'
                        // case 'z':
                        case 122:
                            if (_useUtcBasedDate && _customTimezoneOffset === 0) {
                                resultString += extendedTZ ? "+00:00" : "+0000";
                            }
                            else {
                                var off;
                                if (_customTimezoneOffset !== 0) {
                                    off = _customTimezoneOffset / (60 * 1000);
                                }
                                else {
                                    off = -date.getTimezoneOffset();
                                }
                                var sign = off < 0 ? '-' : '+';
                                var sep = extendedTZ ? ':' : '';
                                var hours = Math.floor(Math.abs(off / 60));
                                var mins = Math.abs(off % 60);
                                resultString += sign + padTill2(hours) + sep + padTill2(mins);
                            }
                            break;

                        default:
                            if (isInScope) {
                                resultString += '%';
                            }
                            resultString += format[i];
                            break;
                    }

                    padding = null;
                    isInScope = false;
                    continue;
                }

                // '%'
                if (currentCharCode === 37) {
                    isInScope = true;
                    continue;
                }

                resultString += format[i];
            }

            return resultString;
        }

        var strftime = _strftime;

        strftime.localize = function(locale) {
            return new Strftime(locale || _locale, _customTimezoneOffset, _useUtcBasedDate);
        };

        strftime.localizeByIdentifier = function(localeIdentifier) {
            var locale = Locales[localeIdentifier];
            if (!locale) {
                warn('[WARNING] No locale found with identifier "' + localeIdentifier + '".');
                return strftime;
            }
            return strftime.localize(locale);
        };

        strftime.timezone = function(timezone) {
            var customTimezoneOffset = _customTimezoneOffset;
            var useUtcBasedDate = _useUtcBasedDate;

            var timezoneType = typeof timezone;
            if (timezoneType === 'number' || timezoneType === 'string') {
                useUtcBasedDate = true;

                // ISO 8601 format timezone string, [-+]HHMM
                if (timezoneType === 'string') {
                    var sign = timezone[0] === '-' ? -1 : 1,
                        hours = parseInt(timezone.slice(1, 3), 10),
                        minutes = parseInt(timezone.slice(3, 5), 10);

                    customTimezoneOffset = sign * ((60 * hours) + minutes) * 60 * 1000;
                    // in minutes: 420
                }
                else if (timezoneType === 'number') {
                    customTimezoneOffset = timezone * 60 * 1000;
                }
            }

            return new Strftime(_locale, customTimezoneOffset, useUtcBasedDate);
        };

        strftime.utc = function() {
            return new Strftime(_locale, _customTimezoneOffset, true);
        };

        return strftime;
    }

    function padTill2(numberToPad, paddingChar) {
        if (paddingChar === '' || numberToPad > 9) {
            return numberToPad;
        }
        if (paddingChar == null) {
            paddingChar = '0';
        }
        return paddingChar + numberToPad;
    }

    function padTill3(numberToPad) {
        if (numberToPad > 99) {
            return numberToPad;
        }
        if (numberToPad > 9) {
            return '0' + numberToPad;
        }
        return '00' + numberToPad;
    }

    function hours12(hour) {
        if (hour === 0) {
            return 12;
        }
        else if (hour > 12) {
            return hour - 12;
        }
        return hour;
    }

    // firstWeekday: 'sunday' or 'monday', default is 'sunday'
    //
    // Pilfered & ported from Ruby's strftime implementation.
    function weekNumber(date, firstWeekday) {
        firstWeekday = firstWeekday || 'sunday';

        // This works by shifting the weekday back by one day if we
        // are treating Monday as the first day of the week.
        var weekday = date.getDay();
        if (firstWeekday === 'monday') {
            if (weekday === 0) // Sunday
                weekday = 6;
            else
                weekday--;
        }

        var firstDayOfYearUtc = Date.UTC(date.getFullYear(), 0, 1),
            dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
            yday = Math.floor((dateUtc - firstDayOfYearUtc) / 86400000),
            weekNum = (yday + 7 - weekday) / 7;

        return Math.floor(weekNum);
    }

    // Get the ordinal suffix for a number: st, nd, rd, or th
    function ordinal(number) {
        var i = number % 10;
        var ii = number % 100;

        if ((ii >= 11 && ii <= 13) || i === 0 || i >= 4) {
            return 'th';
        }
        switch (i) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
        }
    }

    function getTimestampToUtcOffsetFor(date) {
        return (date.getTimezoneOffset() || 0) * 60000;
    }

    function warn(message) {
        if (typeof console !== 'undefined' && typeof console.warn == 'function') {
            console.warn(message);
        }
    }

}());
});

let toNumber = input => Number(input);

let toObjectString = Object.prototype.toString;
let { hasOwnProperty } = Object.prototype;

let isString$1 = input => toObjectString.call(input) === '[object String]';

let isArray = input => Array.isArray(input);

let isArguments = input => toObjectString(input) === '[object Arguments]';

// from jQuery
let isNumber = input => !isArray(input) && input - parseFloat(input) >= 0;

var toString = function(input) {
  if (input == null) {
    return '';
  } else if (isString$1(input)) {
    return input;
  } else if (typeof input.toString === 'function') {
    return toString(input.toString());
  } else {
    return toObjectString.call(input);
  }
};

let toIterable = input => Iterable.cast(input);

let toDate = function(input) {
  if (input == null) {
    return;
  }
  if (input instanceof Date) {
    return input;
  }
  if (input === 'now') {
    return new Date();
  }

  if (isNumber(input)) {
    input = parseInt(input);
  } else {
    input = toString(input);
    if (input.length === 0) {
      return;
    }
    input = Date.parse(input);
  }

  if (input != null) {
    return new Date(input);
  }
};

// from underscore.js
let has = (input, key) => input != null && hasOwnProperty.call(input, key);

// from underscore.js
let isEmpty = function(input) {
  if (input == null) {
    return true;
  }
  if (isArray(input) || isString$1(input) || isArguments(input)) {
    return input.length === 0;
  }
  for (var key in input) {
    (() => {
      if (has(key, input)) {
        return false;
      }
    })();
  }
  return true;
};

let isBlank = input => !(isNumber(input) || input === true) && isEmpty(input);

let HTML_ESCAPE = function(chr) {
  switch (chr) {
    case '&':
      return '&amp;';
    case '>':
      return '&gt;';
    case '<':
      return '&lt;';
    case '"':
      return '&quot;';
    case "'":
      return '&#39;';
  }
};

let HTML_ESCAPE_ONCE_REGEXP = /["><']|&(?!([a-zA-Z]+|(#\d+));)/g;

let HTML_ESCAPE_REGEXP = /([&><"'])/g;

var StandardFilters = {
  size(input) {
    return __guard__$5(input, x => x.length) != null
      ? __guard__$5(input, x => x.length)
      : 0;
  },
  downcase(input) {
    return toString(input).toLowerCase();
  },
  upcase(input) {
    return toString(input).toUpperCase();
  },
  append(input, suffix) {
    return toString(input) + toString(suffix);
  },
  prepend(input, prefix) {
    return toString(prefix) + toString(input);
  },
  empty(input) {
    return isEmpty(input);
  },
  capitalize(input) {
    return toString(input).replace(/^([a-z])/, (m, chr) => chr.toUpperCase());
  },
  sort(input, property) {
    if (property == null) {
      return toIterable(input).sort();
    }

    return toIterable(input)
      .map(item =>
        Promise
          .resolve(__guard__$5(item, x => x[property]))
          .then(key => ({ key, item })))
      .then(array => array
        .sort(function(a, b) {
          let left, left1;
          return (left = a.key > b.key) != null
            ? left
            : { [1]: (left1 = a.key === b.key) != null ? left1 : { [0]: -1 } };
        })
        .map(a => a.item));
  },
  map(input, property) {
    if (property == null) {
      return input;
    }

    return toIterable(input).map(e => __guard__$5(e, x => x[property]));
  },
  escape(input) {
    return toString(input).replace(HTML_ESCAPE_REGEXP, HTML_ESCAPE);
  },
  escape_once(input) {
    return toString(input).replace(HTML_ESCAPE_ONCE_REGEXP, HTML_ESCAPE);
  },
  // References:
  // - http://www.sitepoint.com/forums/showthread.php?218218-Javascript-Regex-making-Dot-match-new-lines
  strip_html(input) {
    return toString(input)
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]*?>/g, '');
  },
  strip_newlines(input) {
    return toString(input).replace(/\r?\n/g, '');
  },
  newline_to_br(input) {
    return toString(input).replace(/\n/g, '<br />\n');
  },
  // To be accurate, we might need to escape special chars in the string
  //
  // References:
  // - http://stackoverflow.com/a/1144788/179691
  replace(input, string, replacement) {
    if (replacement == null) {
      replacement = '';
    }
    return toString(input).replace(new RegExp(string, 'g'), replacement);
  },
  replace_first(input, string, replacement) {
    if (replacement == null) {
      replacement = '';
    }
    return toString(input).replace(string, replacement);
  },
  remove(input, string) {
    return this.replace(input, string);
  },
  remove_first(input, string) {
    return this.replace_first(input, string);
  },
  truncate(input, length, truncateString) {
    if (length == null) {
      length = 50;
    }
    if (truncateString == null) {
      truncateString = '...';
    }
    input = toString(input);
    truncateString = toString(truncateString);

    length = toNumber(length);
    let l = length - truncateString.length;
    if (l < 0) {
      l = 0;
    }

    if (input.length > length) {
      return input.slice(0, l) + truncateString;
    } else {
      return input;
    }
  },
  truncatewords(input, words, truncateString) {
    if (words == null) {
      words = 15;
    }
    if (truncateString == null) {
      truncateString = '...';
    }
    input = toString(input);

    let wordlist = input.split(' ');
    words = Math.max(1, toNumber(words));

    if (wordlist.length > words) {
      return wordlist.slice(0, words).join(' ') + truncateString;
    } else {
      return input;
    }
  },
  split(input, pattern) {
    input = toString(input);
    if (!input) {
      return;
    }
    return input.split(pattern);
  },
  //# TODO!!!

  flatten(input) {
    return toIterable(input).toArray().then(a => helpers.flatten(a));
  },
  join(input, glue) {
    if (glue == null) {
      glue = ' ';
    }
    return this.flatten(input).then(a => a.join(glue));
  },
  //# TODO!!!

  // Get the first element of the passed in array
  //
  // Example:
  //    {{ product.images | first | to_img }}
  //
  first(input) {
    return toIterable(input).first();
  },
  // Get the last element of the passed in array
  //
  // Example:
  //    {{ product.images | last | to_img }}
  //
  last(input) {
    return toIterable(input).last();
  },
  plus(input, operand) {
    return toNumber(input) + toNumber(operand);
  },
  minus(input, operand) {
    return toNumber(input) - toNumber(operand);
  },
  times(input, operand) {
    return toNumber(input) * toNumber(operand);
  },
  dividedBy(input, operand) {
    return toNumber(input) / toNumber(operand);
  },
  divided_by(input, operand) {
    return this.dividedBy(input, operand);
  },
  round(input, operand) {
    return toNumber(input).toFixed(operand);
  },
  modulo(input, operand) {
    return toNumber(input) % toNumber(operand);
  },
  date(input, format) {
    input = toDate(input);

    if (input == null) {
      return '';
    } else if (toString(format).length === 0) {
      return input.toUTCString();
    } else {
      return strftime(format, input);
    }
  },
  default(input, defaultValue) {
    let left;
    if (arguments.length < 2) {
      defaultValue = '';
    }
    let blank = (left = __guardMethod__$2(input, 'isBlank', o => o.isBlank())) !=
      null
      ? left
      : isBlank(input);
    if (blank) {
      return defaultValue;
    } else {
      return input;
    }
  }
};

function __guard__$5(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
function __guardMethod__$2(obj, methodName, transform) {
  if (
    typeof obj !== 'undefined' &&
      obj !== null &&
      typeof obj[methodName] === 'function'
  ) {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}

class Document extends Block {
  // we don't need markup to open this block
  constructor(template) {
    super(...arguments);
    this.template = template;
  }

  // There isn't a real delimter
  blockDelimiter() {
    return [];
  }

  // Document blocks don't need to be terminated since they are
  // not actually opened
  assertMissingDelimitation() {
  }
}

class Template {
  // creates a new <tt>Template</tt> from an array of tokens.
  // Use <tt>Template.parse</tt> instead
  constructor() {
    this.registers = {};
    this.assigns = {};
    this.instanceAssigns = {};
    this.tags = {};
    this.errors = [];
    this.rethrowErrors = true;
  }

  // Parse source code.
  // Returns self for easy chaining
  parse(engine, source) {
    this.engine = engine;
    if (source == null) {
      source = '';
    }
    return Promise.resolve().then(() => {
      let tokens = this._tokenize(source);

      this.tags = this.engine.tags;
      this.root = new Document(this);
      return this.root.parseWithCallbacks(tokens).then(() => this);
    });
  }

  // Render takes a hash with local variables.
  //
  // if you use the same filters over and over again consider
  // registering them globally
  // with <tt>Template.register_filter</tt>
  //
  // Following options can be passed:
  //
  //  * <tt>filters</tt> : array with local filters
  //  * <tt>registers</tt> : hash with register variables. Those can
  //    be accessed from filters and tags and might be useful to integrate
  //    liquid more with its host application
  //
  render(...args) {
    return Promise.resolve().then(() => this._render(...args));
  }

  _render(assigns, options) {
    if (this.root == null) {
      throw new Error('No document root. Did you parse the document yet?');
    }

    let context = (() => {
      if (assigns instanceof Context) {
        return assigns;
      } else if (assigns instanceof Object) {
        assigns = [assigns, this.assigns];
        return new Context(
          this.engine,
          assigns,
          this.instanceAssigns,
          this.registers,
          this.rethrowErrors
        );
      } else if (assigns == null) {
        return new Context(
          this.engine,
          this.assigns,
          this.instanceAssigns,
          this.registers,
          this.rethrowErrors
        );
      } else {
        throw new Error(
          `Expected Object or Context as parameter, but was ${typeof assigns}.`
        );
      }
    })();

    if (__guard__$6(options, x => x.registers)) {
      for (let k of Object.keys(options.registers || {})) {
        let v = options.registers[k];
        this.registers[k] = v;
      }
    }

    if (__guard__$6(options, x1 => x1.filters)) {
      context.registerFilters(...options.filters);
    }

    let copyErrors = actualResult => {
      this.errors = context.errors;
      return actualResult;
    };

    return this.root
      .render(context)
      .then(chunks => helpers.toFlatString(chunks))
      .then(result => {
          this.errors = context.errors;
          return result;
        },
        error => {
          this.errors = context.errors;
          throw error;
        }
      );
  }

  // Uses the <tt>Liquid.TemplateParser</tt> regexp to tokenize
  // the passed source
  _tokenize(source) {
    source = String(source);
    if (source.length === 0) {
      return [];
    }
    let tokens = source.split(Liquid$1.TemplateParser);

    let line = 1;
    let col = 1;

    return tokens
      .filter(token => token.length > 0)
      .map(function(value) {
        let result = { value, col, line };

        let lastIndex = value.lastIndexOf('\n');

        if (lastIndex < 0) {
          col += value.length;
        } else {
          let linebreaks = value.split('\n').length - 1;
          line += linebreaks;
          col = value.length - lastIndex;
        }

        return result;
      });
  }
}

function __guard__$6(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}

class Unless extends If {
  // Unless is a conditional just like 'if' but works on the inverse logic.
  //
  //   {% unless x < 0 %} x is greater than zero {% end %}
  //
  parse() {
    return super.parse(...arguments).then(() => {
      return this.blocks[0].negate = true;
    });
  }
}

class Engine {
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
}

// We don't want to pull in the fs module dependency.
// export {default as LocalFileSystem} from './liquid/local_file_system';

export { Engine, BlankFileSystem };
