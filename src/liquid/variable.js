import Liquid from '../liquid';
import PromiseReduce from '../promise_reduce';
import helpers from './helpers';
import Drop from './drop';

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

export default class Variable {
  static initClass() {
    this.FilterParser = new RegExp(
      `(?:${Liquid.FilterSeparator.source}|(?:\\s*(?!(?:${Liquid.FilterSeparator.source}))(?:${Liquid.QuotedFragment.source}|\\S+)\\s*)+)`
    );
    VariableNameFragment = new RegExp(
      `\\s*(${Liquid.QuotedFragment.source})(.*)`
    );
    FilterListFragment = new RegExp(`${Liquid.FilterSeparator.source}\\s*(.*)`);
    FilterArgParser = new RegExp(
      `(?:${Liquid.FilterArgumentSeparator.source}|${Liquid.ArgumentSeparator.source})\\s*(${Liquid.QuotedFragment.source})`
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
          if (!(e instanceof Liquid.FilterNotFound)) {
            throw e;
          }
          throw new Liquid.FilterNotFound(
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
        filtered = PromiseReduce(this.filters, reducer, value);
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
