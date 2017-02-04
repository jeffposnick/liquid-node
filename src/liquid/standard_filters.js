import strftime from "strftime";

import Iterable from "./iterable";
import { flatten } from "./helpers";

let toNumber = input => Number(input);

let toObjectString = Object.prototype.toString;
let { hasOwnProperty } = Object.prototype;

let isString = input => toObjectString.call(input) === "[object String]";

let isArray = input => Array.isArray(input);

let isArguments = input => toObjectString(input) === "[object Arguments]";

// from jQuery
let isNumber = input => !isArray(input) && ((input - parseFloat(input)) >= 0);

var toString = function(input) {
  if (input == null) {
    return "";
  } else if (isString(input)) {
    return input;
  } else if (typeof input.toString === "function") {
    return toString(input.toString());
  } else {
    return toObjectString.call(input);
  }
};

let toIterable = input => Iterable.cast(input);

let toDate = function(input) {
  if (input == null) { return; }
  if (input instanceof Date) { return input; }
  if (input === 'now') { return new Date(); }

  if (isNumber(input)) {
    input = parseInt(input);
  } else {
    input = toString(input);
    if (input.length === 0) { return; }
    input = Date.parse(input);
  }

  if (input != null) { return new Date(input); }
};

// from underscore.js
let has = (input, key) => (input != null) && hasOwnProperty.call(input, key);

// from underscore.js
let isEmpty = function(input) {
  if (input == null) { return true; }
  if (isArray(input) || isString(input) || isArguments(input)) { return input.length === 0; }
  for (var key in input) { ((() => {
    if (has(key, input)) { return false;
}
  })()); }
  return true;
};

let isBlank = input => !(isNumber(input) || (input === true)) && isEmpty(input);

let HTML_ESCAPE = function(chr) {
  switch (chr) {
    case "&": return '&amp;';
    case ">": return '&gt;';
    case "<": return '&lt;';
    case '"': return '&quot;';
    case "'": return '&#39;';
  }
};

let HTML_ESCAPE_ONCE_REGEXP = /["><']|&(?!([a-zA-Z]+|(#\d+));)/g;

let HTML_ESCAPE_REGEXP = /([&><"'])/g;


export default {

  size(input) {
    return __guard__(input, x => x.length) != null ? __guard__(input, x => x.length) : 0;
  },

  downcase(input) {
    return toString(input).toLowerCase();
  },

  upcase(input) {
    return toString(input).toUpperCase();
  },

  append(input, suffix) {
    return toString(input) + toString(suffix);
  },

  prepend(input, prefix) {
    return toString(prefix) + toString(input);
  },

  empty(input) {
    return isEmpty(input);
  },

  capitalize(input) {
    return toString(input).replace(/^([a-z])/, (m, chr) => chr.toUpperCase());
  },

  sort(input, property) {
    if (property == null) { return toIterable(input).sort(); }

    return toIterable(input)
    .map(item =>
      Promise.resolve(__guard__(item, x => x[property]))
      .then(key => ({ key, item })))
    .then(array =>
      array.sort(function(a, b) {
        let left, left1;
        return (left = a.key > b.key) != null ? left : {[1] : ((left1 = a.key === b.key) != null ? left1 : {[0] : -1})};}).map(a => a.item)
    );
  },

  map(input, property) {
    if (property == null) { return input; }

    return toIterable(input)
    .map(e => __guard__(e, x => x[property]));
  },

  escape(input) {
    return toString(input).replace(HTML_ESCAPE_REGEXP, HTML_ESCAPE);
  },

  escape_once(input) {
    return toString(input).replace(HTML_ESCAPE_ONCE_REGEXP, HTML_ESCAPE);
  },

  // References:
  // - http://www.sitepoint.com/forums/showthread.php?218218-Javascript-Regex-making-Dot-match-new-lines
  strip_html(input) {
    return toString(input)
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]*?>/g, "");
  },

  strip_newlines(input) {
    return toString(input).replace(/\r?\n/g, "");
  },

  newline_to_br(input) {
    return toString(input).replace(/\n/g, "<br />\n");
  },

  // To be accurate, we might need to escape special chars in the string
  //
  // References:
  // - http://stackoverflow.com/a/1144788/179691
  replace(input, string, replacement) {
    if (replacement == null) { replacement = ""; }
    return toString(input).replace(new RegExp(string, 'g'), replacement);
  },

  replace_first(input, string, replacement) {
    if (replacement == null) { replacement = ""; }
    return toString(input).replace(string, replacement);
  },

  remove(input, string) {
    return this.replace(input, string);
  },

  remove_first(input, string) {
    return this.replace_first(input, string);
  },

  truncate(input, length, truncateString) {
    if (length == null) { length = 50; }
    if (truncateString == null) { truncateString = '...'; }
    input = toString(input);
    truncateString = toString(truncateString);

    length = toNumber(length);
    let l = length - truncateString.length;
    if (l < 0) { l = 0; }

    if (input.length > length) { return input.slice(0, l) + truncateString; } else { return input; }
  },

  truncatewords(input, words, truncateString) {
    if (words == null) { words = 15; }
    if (truncateString == null) { truncateString = '...'; }
    input = toString(input);

    let wordlist = input.split(" ");
    words = Math.max(1, toNumber(words));

    if (wordlist.length > words) {
      return wordlist.slice(0, words).join(" ") + truncateString;
    } else {
      return input;
    }
  },

  split(input, pattern) {
    input = toString(input);
    if (!input) { return; }
    return input.split(pattern);
  },

  //# TODO!!!

  flatten(input) {
    return toIterable(input).toArray().then(a => flatten(a));
  },

  join(input, glue) {
    if (glue == null) { glue = ' '; }
    return this.flatten(input).then(a => a.join(glue));
  },

  //# TODO!!!


  // Get the first element of the passed in array
  //
  // Example:
  //    {{ product.images | first | to_img }}
  //
  first(input) {
    return toIterable(input).first();
  },

  // Get the last element of the passed in array
  //
  // Example:
  //    {{ product.images | last | to_img }}
  //
  last(input) {
    return toIterable(input).last();
  },

  plus(input, operand) {
    return toNumber(input) + toNumber(operand);
  },

  minus(input, operand) {
    return toNumber(input) - toNumber(operand);
  },

  times(input, operand) {
    return toNumber(input) * toNumber(operand);
  },

  dividedBy(input, operand) {
    return toNumber(input) / toNumber(operand);
  },

  divided_by(input, operand) {
    return this.dividedBy(input, operand);
  },

  round(input, operand) {
    return toNumber(input).toFixed(operand);
  },

  modulo(input, operand) {
    return toNumber(input) % toNumber(operand);
  },

  date(input, format) {
    input = toDate(input);

    if (input == null) {
      return "";
    } else if (toString(format).length === 0) {
      return input.toUTCString();
    } else {
      return strftime(format, input);
    }
  },

  default(input, defaultValue) {
    let left;
    if (arguments.length < 2) { defaultValue = ''; }
    let blank = (left = __guardMethod__(input, 'isBlank', o => o.isBlank())) != null ? left : isBlank(input);
    if (blank) { return defaultValue; } else { return input; }
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}