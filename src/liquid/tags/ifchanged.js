import helpers from '../helpers';
import Block from '../block';

export default class IfChanged extends Block {
  render(context) {
    return context.stack(() => {
      let rendered = this.renderAll(this.nodelist, context);

      return Promise.resolve(rendered).then(function(output) {
        output = helpers.toFlatString(output);

        if (output !== context.registers.ifchanged) {
          return context.registers.ifchanged = output;
        } else {
          return '';
        }
      });
    });
  }
}
