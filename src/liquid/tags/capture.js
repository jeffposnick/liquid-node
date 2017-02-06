import Liquid from '../../liquid';
import Block from '../block';

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
let Syntax = undefined;
let SyntaxHelp = undefined;
export default class Capture extends Block {
  static initClass() {
    Syntax = /(\w+)/;
    SyntaxHelp = "Syntax Error in 'capture' - Valid syntax: capture [var]";
  }

  constructor(template, tagName, markup) {
    super(...arguments);
    let match = Syntax.exec(markup);

    if (match) {
      this.to = match[1];
    } else {
      throw new Liquid.SyntaxError(SyntaxHelp);
    }
  }

  render(context) {
    return super.render(...arguments).then(chunks => {
      let output = Liquid.Helpers.toFlatString(chunks);
      context.lastScope()[this.to] = output;
      return '';
    });
  }
}
Capture.initClass();
