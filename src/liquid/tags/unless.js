import If from './if';

export default class Unless extends If {
  // Unless is a conditional just like 'if' but works on the inverse logic.
  //
  //   {% unless x < 0 %} x is greater than zero {% end %}
  //
  parse() {
    return super.parse(...arguments).then(() => {
      return this.blocks[0].negate = true;
    });
  }
}
