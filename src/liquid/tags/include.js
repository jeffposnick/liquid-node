import Liquid from '../../liquid';
import Tag from '../tag';

let Syntax = undefined;
let SyntaxHelp = undefined;

export default class Include extends Tag {
  static initClass() {
    Syntax = /([a-z0-9\/\\_-]+)/i;
    SyntaxHelp = `Syntax Error in 'include' - \
Valid syntax: include [templateName]`;
  }

  constructor(template, tagName, markup, tokens) {
    super(...arguments);
    let match = Syntax.exec(markup);
    if (!match) {
      throw new Liquid.SyntaxError(SyntaxHelp);
    }

    this.filepath = match[1];
    this.subTemplate = template.engine.fileSystem
      .readTemplateFile(this.filepath)
      .then(src => template.engine.parse(src));
  }

  render(context) {
    return this.subTemplate.then(i => i.render(context));
  }
}
Include.initClass();
