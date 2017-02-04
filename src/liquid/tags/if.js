let SyntaxHelp;
import Liquid from '../../liquid';

import PromiseReduce from '../../promise_reduce';

export default (SyntaxHelp = undefined);
let Syntax = undefined;
let ExpressionsAndOperators = undefined;
class If extends Liquid.Block {
  static initClass() {
    SyntaxHelp = "Syntax Error in tag 'if' - Valid syntax: if [expression]";

    Syntax = new RegExp(
      `\
(${Liquid.QuotedFragment.source})\\s*\
([=!<>a-z_]+)?\\s*\
(${Liquid.QuotedFragment.source})?\
`
    );

    ExpressionsAndOperators = new RegExp(
      `\
(?:\
\\b(?:\\s?and\\s?|\\s?or\\s?)\\b\
|\
(?:\\s*\
(?!\\b(?:\\s?and\\s?|\\s?or\\s?)\\b)\
(?:${Liquid.QuotedFragment.source}|\\S+)\
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
        return new Liquid.ElseCondition();
      } else {
        let expressions = Liquid.Helpers.scan(markup, ExpressionsAndOperators);
        expressions = expressions.reverse();
        let match = Syntax.exec(expressions.shift());

        if (!match) {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        let condition = new Liquid.Condition(...match.slice(1, 4));

        while (expressions.length > 0) {
          let operator = String(expressions.shift()).trim();

          match = Syntax.exec(expressions.shift());
          if (!match) {
            throw new SyntaxError(SyntaxHelp);
          }

          let newCondition = new Liquid.Condition(...match.slice(1, 4));
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
