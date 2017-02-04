import Liquid from '../liquid';

export default (Liquid.Template = class Template {
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
      this.root = new Liquid.Document(this);
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
      if (assigns instanceof Liquid.Context) {
        return assigns;
      } else if (assigns instanceof Object) {
        assigns = [assigns, this.assigns];
        return new Liquid.Context(
          this.engine,
          assigns,
          this.instanceAssigns,
          this.registers,
          this.rethrowErrors
        );
      } else if (assigns == null) {
        return new Liquid.Context(
          this.engine,
          this.assigns,
          this.instanceAssigns,
          this.registers,
          this.rethrowErrors
        );
      } else {
        throw new Error(
          `Expected Object or Liquid::Context as parameter, but was ${typeof assigns}.`
        );
      }
    })();

    if (__guard__(options, x => x.registers)) {
      for (let k of Object.keys(options.registers || {})) {
        let v = options.registers[k];
        this.registers[k] = v;
      }
    }

    if (__guard__(options, x1 => x1.filters)) {
      context.registerFilters(...options.filters);
    }

    let copyErrors = actualResult => {
      this.errors = context.errors;
      return actualResult;
    };

    return this.root
      .render(context)
      .then(chunks => Liquid.Helpers.toFlatString(chunks))
      .then(
        function(result) {
          this.errors = context.errors;
          return result;
        },
        function(error) {
          this.errors = context.errors;
          throw error;
        }
      );
  }

  // Uses the <tt>Liquid::TemplateParser</tt> regexp to tokenize
  // the passed source
  _tokenize(source) {
    source = String(source);
    if (source.length === 0) {
      return [];
    }
    let tokens = source.split(Liquid.TemplateParser);

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
});

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
