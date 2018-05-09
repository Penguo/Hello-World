// modified autolink.js to do jira ids instead
(function() {
  var autoLink,
    __slice = [].slice;

  autoLink = function() {
    var k, linkAttributes, option, options, pattern, v;
    options = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

    pattern = /(?:^|\s+[\(]*[\[]*)([A-Z]+-[0-9]+)(?=[\)]*[\]]*[\:]*[\;]*[\.]*[\,]*\s*|$)/gi;
    if (!(options.length > 0)) {
      return this.replace(pattern, " <a target=_blank href=https://jira.it.epicgames.net/browse/$1>$1</a>");
    }
  };

  String.prototype['autoLinkJira'] = autoLink;

}).call(this);