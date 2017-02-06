import Block from '../block';
import Condition from '../condition';
import ElseCondition from '../else_condition';
import helpers from '../helpers';
import Liquid from '../../liquid';
import PromiseReduce from '../../promise_reduce';

let SyntaxHelp = undefined;
let Syntax = undefined;
let WhenSyntax = undefined;

export default class Case extends Block {
  static initClass() {
    SyntaxHelp = "Syntax Error in tag 'case' - Valid syntax: case [expression]";

    Syntax = new RegExp(`(${Liquid.QuotedFragment.source})`);

    WhenSyntax = new RegExp(
      `\
(${Liquid.QuotedFragment.source})\
(?:\
(?:\\s+or\\s+|\\s*\\,\\s*)\
(${Liquid.QuotedFragment.source})\
)?\
`
    );
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    this.blocks = [];

    let match = Syntax.exec(markup);
    if (!match) {
      throw new Liquid.SyntaxError(SyntaxHelp);
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
      return PromiseReduce(
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
