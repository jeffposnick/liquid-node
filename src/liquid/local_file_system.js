let PathPattern;
import Liquid from '../liquid';

import Fs from 'fs';
import Path from 'path';

let readFile = (fpath, encoding) => new Promise((resolve, reject) =>
  Fs.readFile(fpath, encoding, function(err, content) {
    if (err) {
      return reject(err);
    } else {
      return resolve(content);
    }
  }));

export default (PathPattern = undefined);
Liquid.LocalFileSystem = class LocalFileSystem extends Liquid.BlankFileSystem {
  static initClass() {
    PathPattern = new RegExp(`^[^.\\/][a-zA-Z0-9-_\\/]+$`);
  }

  constructor(root, extension) {
    if (extension == null) {
      extension = 'html';
    }
    super(...arguments);
    this.root = root;
    this.fileExtension = extension;
  }

  readTemplateFile(templatePath) {
    return this.fullPath(templatePath).then(fullPath =>
      readFile(fullPath, 'utf8').catch(function(err) {
        throw new Liquid.FileSystemError(
          `Error loading template: ${err.message}`
        );
      }));
  }

  fullPath(templatePath) {
    if (PathPattern.test(templatePath)) {
      return Promise.resolve(
        Path.resolve(
          Path.join(this.root, templatePath + `.${this.fileExtension}`)
        )
      );
    } else {
      return Promise.reject(new Liquid.ArgumentError(
        `Illegal template name '${templatePath}'`
      ));
    }
  }
};
undefined.initClass();
