export default {
  flatten(array) {
    let output = [];

    var _flatten = array =>
      array.forEach(function(item) {
        if (Array.isArray(item)) {
          return _flatten(item);
        } else {
          return output.push(item);
        }
      })
    ;

    _flatten(array);
    return output;
  },

  toFlatString(array) {
    return this.flatten(array).join("");
  },

  scan(string, regexp, globalMatch) {
    if (globalMatch == null) { globalMatch = false; }
    let result = [];

    var _scan = function(s) {
      let match = regexp.exec(s);

      if (match) {
        if (match.length === 1) {
          result.push(match[0]);
        } else {
          result.push(match.slice(1));
        }

        let l = match[0].length;
        if (globalMatch) { l = 1; }

        if ((match.index + l) < s.length) {
          return _scan(s.substring(match.index + l));
        }
      }
    };

    _scan(string);
    return result;
  }
};
