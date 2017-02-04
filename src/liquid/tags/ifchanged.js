import Liquid from '../../liquid';

export default class IfChanged extends Liquid.Block {
  render(context) {
    return context.stack(() => {
      let rendered = this.renderAll(this.nodelist, context);

      return Promise.resolve(rendered).then(function(output) {
        output = Liquid.Helpers.toFlatString(output);

        if (output !== context.registers.ifchanged) {
          return context.registers.ifchanged = output;
        } else {
          return '';
        }
      });
    });
  }
}
