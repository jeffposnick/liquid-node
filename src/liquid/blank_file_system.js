import Liquid from '../liquid';

export default class BlankFileSystem {
  constructor() {
  }

  readTemplateFile(templatePath) {
    return Promise.reject(new Liquid.FileSystemError(
      "This file system doesn't allow includes"
    ));
  }
};
