let Syntax;
import Liquid from "../../liquid";

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
export default Syntax = undefined;
let SyntaxHelp = undefined;
class Capture extends Liquid.Block {
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
      return "";
    }
    );
  }
}
Capture.initClass();
