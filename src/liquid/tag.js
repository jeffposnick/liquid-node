export default class Tag {
  constructor(template, tagName, markup) {
    this.template = template;
    this.tagName = tagName;
    this.markup = markup;
  }

  parseWithCallbacks(...args) {
    let parse;
    if (this.afterParse) {
      parse = () => this.parse(...args).then(() => this.afterParse(...args));
    } else {
      parse = () => this.parse(...args);
    }

    if (this.beforeParse) {
      return Promise.resolve(this.beforeParse(...args)).then(parse);
    } else {
      return parse();
    }
  }

  parse() {
  }

  name() {
    return this.constructor.name.toLowerCase();
  }

  render() {
    return '';
  }
}
