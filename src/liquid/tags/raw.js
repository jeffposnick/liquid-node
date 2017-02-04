import Liquid from '../../liquid';

export default class Raw extends Liquid.Block {
  parse(tokens) {
    return Promise.resolve().then(() => {
      if (tokens.length === 0 || this.ended) {
        return Promise.resolve();
      }

      let token = tokens.shift();
      let match = Liquid.Block.FullToken.exec(token.value);

      if (__guard__(match, x => x[1]) === this.blockDelimiter()) {
        return this.endTag();
      }

      this.nodelist.push(token.value);
      return this.parse(tokens);
    });
  }
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined;
}
