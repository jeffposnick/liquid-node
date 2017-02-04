let Syntax;
import Liquid from "../../liquid";


export default Syntax = undefined;
let SyntaxHelp = undefined;
class Include extends Liquid.Tag {
  static initClass() {
    Syntax = /([a-z0-9\/\\_-]+)/i;
    SyntaxHelp = `Syntax Error in 'include' - \
Valid syntax: include [templateName]`;
  }

  constructor(template, tagName, markup, tokens) {
    super(...arguments);
    let match = Syntax.exec(markup);
    if (!match) { throw new Liquid.SyntaxError(SyntaxHelp); }

    this.filepath = match[1];
    this.subTemplate = template.engine.fileSystem.readTemplateFile(this.filepath)
      .then(src => template.engine.parse(src));
  }




  render(context) {
    return this.subTemplate.then(i => i.render(context));
  }
}
Include.initClass();
