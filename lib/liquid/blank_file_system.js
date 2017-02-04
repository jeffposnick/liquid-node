// Generated by CoffeeScript 1.12.3
(function() {
  var Liquid;

  Liquid = require("../liquid");

  module.exports = Liquid.BlankFileSystem = (function() {
    function BlankFileSystem() {}

    BlankFileSystem.prototype.readTemplateFile = function(templatePath) {
      return Promise.reject(new Liquid.FileSystemError("This file system doesn't allow includes"));
    };

    return BlankFileSystem;

  })();

}).call(this);

//# sourceMappingURL=blank_file_system.js.map