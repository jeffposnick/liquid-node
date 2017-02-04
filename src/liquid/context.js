import Liquid from '../liquid';

export default class Context {
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
    this.environments = Liquid.Helpers.flatten([environments]);
    this.scopes = [outerScope];
    this.registers = registers;
    this.errors = [];
    this.rethrowErrors = rethrowErrors;
    this.strainer = (left = __guard__(engine, x => new x.Strainer(this))) !=
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

    if (e instanceof Liquid.SyntaxError) {
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
      throw new Liquid.FilterNotFound(
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

      if (__guard__(result, x => x.nodeify) != null) {
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
    if (Liquid.Context.Literals.hasOwnProperty(key)) {
      return Liquid.Context.Literals[key];
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
        return new Liquid.Range(lo, hi + 1);
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
      let parts = Liquid.Helpers.scan(markup, Liquid.VariableParser);
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
                (__guardMethod__(object, 'hasKey', o => o.hasKey(part)) ||
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
    if (obj instanceof Liquid.Drop) {
      return obj.get(key);
    } else {
      return __guard__(obj, x => x[key]);
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

      if (object instanceof Liquid.Drop) {
        object.context = this;
      }
      return object;
    });
  }
}
Context.initClass();

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
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
