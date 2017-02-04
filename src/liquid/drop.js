// A drop in liquid is a class which allows you to to export DOM
// like things to liquid.
// Methods of drops are callable.
// The main use for liquid drops is the implement lazy loaded objects.
// If you would like to make data available to the web designers
// which you don't want loaded unless needed then a drop is a great
// way to do that
//
// Example:
//
//   ProductDrop = Liquid.Drop.extend
//     topSales: ->
//       Shop.current.products.all order: 'sales', limit: 10
//
//   tmpl = Liquid.Template.parse """
//     {% for product in product.top_sales %}
//       {{ product.name }}
//     {%endfor%}
//     """
//
//   tmpl.render(product: new ProductDrop) # will invoke topSales query.
//
// Your drop can either implement the methods sans any parameters or implement the
// before_method(name) method which is a
// catch all
export default class Drop {
  static initClass() {
  
    this.prototype.context = null;
  }

  hasKey(key) {
    return true;
  }

  invokeDrop(methodOrKey) {
    if (this.constructor.isInvokable(methodOrKey)) {
      let value = this[methodOrKey];

      if (typeof value === "function") {
        return value.call(this);
      } else {
        return value;
      }
    } else {
      return this.beforeMethod(methodOrKey);
    }
  }

  beforeMethod(method) {}

  static isInvokable(method) {
    if (this.invokableMethods == null) { this.invokableMethods = (() => {
      let blacklist = Object.keys(Drop.prototype);
      let whitelist = ["toLiquid"];

      Object.keys(this.prototype).forEach(function(k) {
        if (blacklist.indexOf(k) < 0) { return whitelist.push(k); }
      });

      return whitelist;
    })(); }

    return this.invokableMethods.indexOf(method) >= 0;
  }

  get(methodOrKey) {
    return this.invokeDrop(methodOrKey);
  }

  toLiquid() {
    return this;
  }

  toString() {
    return `[Liquid.Drop ${this.constructor.name}]`;
  }
};
Drop.initClass();
