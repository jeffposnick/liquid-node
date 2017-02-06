import Liquid from '../../liquid';
import Block from '../block';
import PromiseReduce from '../../promise_reduce';
import Iterable from '../iterable';
import helpers from '../helpers';

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

let SyntaxHelp = undefined;
let Syntax = undefined;

export default class For extends Block {
  static initClass() {
    SyntaxHelp = "Syntax Error in 'for loop' - Valid syntax: for [item] in [collection]";
    Syntax = new RegExp(
      `\
(\\w+)\\s+in\\s+\
((?:${Liquid.QuotedFragment.source})+)\
\\s*(reversed)?\
`
    );
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    let match = Syntax.exec(markup);

    if (match) {
      this.variableName = match[1];
      this.collectionName = match[2];
      this.registerName = `${match[1]}=${match[2]}`;
      this.reversed = match[3];
      this.attributes = {};

      helpers.scan(markup, Liquid.TagAttributes).forEach(attr => {
        return this.attributes[attr[0]] = attr[1];
      });
    } else {
      throw new Liquid.SyntaxError(SyntaxHelp);
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
        if (__guard__(collection, x => x.forEach)) {
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
            return PromiseReduce(
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

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
