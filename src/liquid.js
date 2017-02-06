export default class Liquid {
  static initClass() {
    this.FilterSeparator = /\|/;
    this.ArgumentSeparator = /,/;
    this.FilterArgumentSeparator = /\:/;
    this.VariableAttributeSeparator = /\./;
    this.TagStart = /\{\%/;
    this.TagEnd = /\%\}/;
    this.VariableSignature = /\(?[\w\-\.\[\]]\)?/;
    this.VariableSegment = /[\w\-]/;
    this.VariableStart = /\{\{/;
    this.VariableEnd = /\}\}/;
    this.VariableIncompleteEnd = /\}\}?/;
    this.QuotedString = /"[^"]*"|'[^']*'/;
    this.QuotedFragment = new RegExp(
      `${this.QuotedString.source}|(?:[^\\s,\\|'"]|${this.QuotedString.source})+`
    );
    this.StrictQuotedFragment = /"[^"]+"|'[^']+'|[^\s|:,]+/;
    this.FirstFilterArgument = new RegExp(
      `${this.FilterArgumentSeparator.source}(?:${this.StrictQuotedFragment.source})`
    );
    this.OtherFilterArgument = new RegExp(
      `${this.ArgumentSeparator.source}(?:${this.StrictQuotedFragment.source})`
    );
    this.SpacelessFilter = new RegExp(
      `^(?:'[^']+'|"[^"]+"|[^'"])*${this.FilterSeparator.source}(?:${this.StrictQuotedFragment.source})(?:${this.FirstFilterArgument.source}(?:${this.OtherFilterArgument.source})*)?`
    );
    this.Expression = new RegExp(
      `(?:${this.QuotedFragment.source}(?:${this.SpacelessFilter.source})*)`
    );
    this.TagAttributes = new RegExp(
      `(\\w+)\\s*\\:\\s*(${this.QuotedFragment.source})`
    );
    this.AnyStartingTag = /\{\{|\{\%/;
    this.PartialTemplateParser = new RegExp(
      `${this.TagStart.source}.*?${this.TagEnd.source}|${this.VariableStart.source}.*?${this.VariableIncompleteEnd.source}`
    );
    this.TemplateParser = new RegExp(
      `(${this.PartialTemplateParser.source}|${this.AnyStartingTag.source})`
    );
    this.VariableParser = new RegExp(
      `\\[[^\\]]+\\]|${this.VariableSegment.source}+\\??`
    );
  }
}
Liquid.initClass();
Liquid.Error = Error;

// Errors
[
  'ArgumentError',
  'ContextError',
  'FilterNotFound',
  'FileSystemError',
  'StandardError',
  'StackLevelError',
  'SyntaxError'
].forEach(className => Liquid[className] = Liquid.Error);
