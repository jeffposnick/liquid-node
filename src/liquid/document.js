import Liquid from '../liquid';

export default (Liquid.Document = class Document extends Liquid.Block {
  // we don't need markup to open this block
  constructor(template) {
    super(...arguments);
    this.template = template;
  }

  // There isn't a real delimter
  blockDelimiter() {
    return [];
  }

  // Document blocks don't need to be terminated since they are
  // not actually opened
  assertMissingDelimitation() {
  }
});
