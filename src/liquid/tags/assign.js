import Liquid from '../../liquid';
import Tag from '../tag';

let SyntaxHelp = undefined;
let Syntax = undefined;

export default class Assign extends Tag {
  static initClass() {
    SyntaxHelp = "Syntax Error in 'assign' - Valid syntax: assign [var] = [source]";
    Syntax = new RegExp(
      `\
((?:${Liquid.VariableSignature.source})+)\
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
      this.from = new Liquid.Variable(match[2]);
    } else {
      throw new Liquid.SyntaxError(SyntaxHelp);
    }
  }

  render(context) {
    context.lastScope()[this.to] = this.from.render(context);
    return super.render(context);
  }
}
Assign.initClass();
