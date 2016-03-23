require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global module */

function Logger() {
    //get from localStorage
    this.level = Logger.INFO;
}

Logger.TRACE = 1;
Logger.DEBUG = 2;
Logger.INFO = 3;
Logger.WARN = 4;
Logger.ERROR = 5;

Logger.prototype.setLevel = function(level) {
    this.level = level;
};

Logger.prototype.trace = function(message) {
    if (this.level <= Logger.TRACE) {
        var args = arguments;
        args[0] = "[TRACE] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.debug = function(message) {
    if (this.level <= Logger.DEBUG) {
        var args = arguments;
        args[0] = "[DEBUG] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.info = function(message) {
    if (this.level <= Logger.INFO) {
        var args = arguments;
        args[0] = "[INFO] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.warn = function(message) {
    if (this.level <= Logger.WARN) {
        var args = arguments;
        args[0] = "[WARN] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.error = function(message) {
    if (this.level <= Logger.ERROR) {
        var args = arguments;
        args[0] = "[ERROR] "+message;
        console.log.apply(console, args);
    }
};


if (typeof module !== 'undefined') {
    module.exports = Logger;
}
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

},{}],2:[function(require,module,exports){
var rdf = require('rdf-ext')

var clownface = {}

clownface.options = {
  detectNamedNodes: true,
  namedNodeRegEx: /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
}

function node (value) {
  if (!value) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value.map(function (item) {
      return node(item)
    })
  }

  if (typeof value === 'object' && value.interfaceName) {
    return value
  }

  if (typeof value === 'string') {
    if (clownface.options.detectNamedNodes && clownface.options.namedNodeRegEx.test(value)) {
      return rdf.createNamedNode(value)
    } else {
      return rdf.createLiteral(value)
    }
  } else if (typeof value === 'number') {
    return rdf.createLiteral(value + '')
  } else {
    throw new Error('unknown type')
  }
}

function nodeGraph (value, graph, graphIri) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return nodeGraph(item, graph, graphIri)
    })
  }

  value = node(value)
  value.graph = graph
  value.graphIri = graphIri

  return value
}

function inArray (node, array) {
  return array.some(function (otherNode) {
    return otherNode.equals(node)
  })
}

function toArray (value) {
  if (!value) {
    return undefined
  }

  if (!Array.isArray(value)) {
    return [value]
  }

  return value
}

clownface.Graph = function (graph, nodes) {
  if (!(this instanceof clownface.Graph)) {
    return new clownface.Graph(graph, nodes)
  }

  this.context = node(toArray(nodes))

  var match = function (subject, predicate, object, property) {
    if (!graph) {
      return null
    }

    var matches = []

    predicate = node(toArray(predicate))

    graph.forEach(function (triple) {
      if (subject !== null && !inArray(triple.subject, subject)) {
        return
      }

      if (predicate !== null && !inArray(triple.predicate, predicate)) {
        return
      }

      if (object !== null && !inArray(triple.object, object)) {
        return
      }

      matches.push(triple[property])
    })

    return matches
  }

  this.graph = function () {
    return graph
  }

  this.node = function (value) {
    return clownface.Graph(graph, value)
  }

  this.in = function (predicate) {
    return clownface.Graph(graph, match(null, predicate, this.context, 'subject'))
  }

  this.out = function (predicate) {
    return clownface.Graph(graph, match(this.context, predicate, null, 'object'))
  }

  this.nodes = function () {
    if (!this.context) {
      return []
    }

    return this.context
  }

  this.literal = function () {
    if (!this.context) {
      return undefined
    }

    return this.context
      .map(function (node) {
        return node.nominalValue
      })
  }

  this.removeIn = function (predicate) {
    if (predicate) {
      predicate = node(toArray(predicate))
    }

    this.nodes().forEach(function (o) {
      if (predicate) {
        predicate.forEach(function (p) {
          graph.removeMatches(null, p, o)
        })
      } else {
        graph.removeMatches(null, null, o)
      }
    })

    return this
  }

  this.removeOut = function (predicate) {
    if (predicate) {
      predicate = node(toArray(predicate))
    }

    this.nodes().forEach(function (s) {
      if (predicate) {
        predicate.forEach(function (p) {
          graph.removeMatches(s, p, null)
        })
      } else {
        graph.removeMatches(s, null, null)
      }
    })

    return this
  }

  this.toArray = function () {
    return this.nodes().map(this.node)
  }

  this.filter = function (callback) {
    return clownface.Graph(graph, this.toArray().filter(callback).map(function (cf) {
      return cf.context.shift()
    }))
  }

  this.forEach = function (callback) {
    return this.toArray().forEach(callback)
  }

  this.map = function (callback) {
    return this.toArray().map(callback)
  }

  this.toString = function () {
    return this.literal().join()
  }
}

clownface.Store = function (store, nodes) {
  if (!(this instanceof clownface.Store)) {
    return new clownface.Store(store, nodes)
  }

  this.context = toArray(nodes)

  this.store = function () {
    return store
  }

  this.graphs = function () {
    var unique = []

    this.nodes().forEach(function (item) {
      if (unique.indexOf(item.graph) === -1) {
        unique.push(item.graph)
      }
    })

    return unique
  }

  this.node = function (value, graphIri, then) {
    var graphIris = toArray(graphIri || value.graphIri || value)

    return Promise.all(graphIris.map(function (graphIri) {
      return store.graph(graphIri)
    })).then(function (graphs) {
      var nodes = []

      graphs.forEach(function (graph, index) {
        nodes = nodes.concat(nodeGraph(value, graph, graphIris[index]))
      })

      if (then) {
        return Promise.resolve(then(clownface.Store(store, nodes)))
      } else {
        return clownface.Store(store, nodes)
      }
    })
  }

  this.in = function (predicate) {
    var matches = []

    this.nodes().forEach(function (item) {
      matches = matches.concat(clownface.Graph(item.graph, item).in(predicate).nodes().map(function (match) {
        return nodeGraph(match, item.graph, item.graphIri)
      }))
    })

    return clownface.Store(store, matches)
  }

  this.out = function (predicate) {
    var matches = []

    this.nodes().forEach(function (item) {
      matches = matches.concat(clownface.Graph(item.graph, item).out(predicate).nodes().map(function (match) {
        return nodeGraph(match, item.graph, item.graphIri)
      }))
    })

    return clownface.Store(store, matches)
  }

  this.jump = function (then) {
    return Promise.all(this.nodes().map(function (item) {
      return store.graph(item.nominalValue).then(function (graph) {
        return nodeGraph(item, graph, item.nominalValue)
      })
    })).then(function (entries) {
      if (then) {
        return Promise.resolve(then(clownface.Store(store, entries)))
      } else {
        return clownface.Store(store, entries)
      }
    })
  }

  this.nodes = function () {
    if (!this.context) {
      return []
    }

    return this.context
  }

  this.literal = function () {
    if (!this.context) {
      return undefined
    }

    return this.context
      .map(function (node) {
        return node.nominalValue
      })
  }

  this.toArray = function () {
    return this.nodes().map(function (node) {
      return clownface.Store(store, node)
    })
  }

  this.forEach = function (callback) {
    return this.toArray().forEach(callback)
  }

  this.map = function (callback) {
    return this.toArray().map(callback)
  }

  this.toString = function () {
    return this.literal().join()
  }
}

module.exports = clownface

},{"rdf-ext":"rdf-ext"}],3:[function(require,module,exports){
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false Mustache: true*/

(function defineMustache (global, factory) {
  if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    global.Mustache = {};
    factory(global.Mustache); // script, wsh, asp
  }
}(this, function mustacheFactory (mustache) {

  var objectToString = Object.prototype.toString;
  var isArray = Array.isArray || function isArrayPolyfill (object) {
    return objectToString.call(object) === '[object Array]';
  };

  function isFunction (object) {
    return typeof object === 'function';
  }

  /**
   * More correct typeof string handling array
   * which normally returns typeof 'object'
   */
  function typeStr (obj) {
    return isArray(obj) ? 'array' : typeof obj;
  }

  function escapeRegExp (string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
  }

  /**
   * Null safe way of checking whether or not an object,
   * including its prototype, has a given property
   */
  function hasProperty (obj, propName) {
    return obj != null && typeof obj === 'object' && (propName in obj);
  }

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var regExpTest = RegExp.prototype.test;
  function testRegExp (re, string) {
    return regExpTest.call(re, string);
  }

  var nonSpaceRe = /\S/;
  function isWhitespace (string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var equalsRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   */
  function parseTemplate (template, tags) {
    if (!template)
      return [];

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace () {
      if (hasTag && !nonSpace) {
        while (spaces.length)
          delete tokens[spaces.pop()];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var openingTagRe, closingTagRe, closingCurlyRe;
    function compileTags (tagsToCompile) {
      if (typeof tagsToCompile === 'string')
        tagsToCompile = tagsToCompile.split(spaceRe, 2);

      if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
        throw new Error('Invalid tags: ' + tagsToCompile);

      openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
      closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
      closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
    }

    compileTags(tags || mustache.tags);

    var scanner = new Scanner(template);

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push([ 'text', chr, start, start + 1 ]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === '\n')
            stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe))
        break;

      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error('Unclosed tag at ' + scanner.pos);

      token = [ type, value, start, scanner.pos ];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        compileTags(value);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens (tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens (tokens) {
    var nestedTokens = [];
    var collector = nestedTokens;
    var sections = [];

    var token, section;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      switch (token[0]) {
        case '#':
        case '^':
          collector.push(token);
          sections.push(token);
          collector = token[4] = [];
          break;
        case '/':
          section = sections.pop();
          section[5] = token[2];
          collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
          break;
        default:
          collector.push(token);
      }
    }

    return nestedTokens;
  }

  /**
   * A simple string scanner that is used by the template parser to find
   * tokens in template strings.
   */
  function Scanner (string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function eos () {
    return this.tail === '';
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function scan (re) {
    var match = this.tail.match(re);

    if (!match || match.index !== 0)
      return '';

    var string = match[0];

    this.tail = this.tail.substring(string.length);
    this.pos += string.length;

    return string;
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function scanUntil (re) {
    var index = this.tail.search(re), match;

    switch (index) {
      case -1:
        match = this.tail;
        this.tail = '';
        break;
      case 0:
        match = '';
        break;
      default:
        match = this.tail.substring(0, index);
        this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  /**
   * Represents a rendering context by wrapping a view object and
   * maintaining a reference to the parent context.
   */
  function Context (view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  Context.prototype.push = function push (view) {
    return new Context(view, this);
  };

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  Context.prototype.lookup = function lookup (name) {
    var cache = this.cache;

    var value;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      var context = this, names, index, lookupHit = false;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          names = name.split('.');
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           **/
          while (value != null && index < names.length) {
            if (index === names.length - 1)
              lookupHit = hasProperty(value, names[index]);

            value = value[names[index++]];
          }
        } else {
          value = context.view[name];
          lookupHit = hasProperty(context.view, name);
        }

        if (lookupHit)
          break;

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = value.call(this.view);

    return value;
  };

  /**
   * A Writer knows how to take a stream of tokens and render them to a
   * string, given a context. It also maintains a cache of templates to
   * avoid the need to parse the same template twice.
   */
  function Writer () {
    this.cache = {};
  }

  /**
   * Clears all cached templates in this writer.
   */
  Writer.prototype.clearCache = function clearCache () {
    this.cache = {};
  };

  /**
   * Parses and caches the given `template` and returns the array of tokens
   * that is generated from the parse.
   */
  Writer.prototype.parse = function parse (template, tags) {
    var cache = this.cache;
    var tokens = cache[template];

    if (tokens == null)
      tokens = cache[template] = parseTemplate(template, tags);

    return tokens;
  };

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   */
  Writer.prototype.render = function render (template, view, partials) {
    var tokens = this.parse(template);
    var context = (view instanceof Context) ? view : new Context(view);
    return this.renderTokens(tokens, context, partials, template);
  };

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  Writer.prototype.renderTokens = function renderTokens (tokens, context, partials, originalTemplate) {
    var buffer = '';

    var token, symbol, value;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  };

  Writer.prototype.renderSection = function renderSection (token, context, partials, originalTemplate) {
    var self = this;
    var buffer = '';
    var value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender (template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
  };

  Writer.prototype.renderInverted = function renderInverted (token, context, partials, originalTemplate) {
    var value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate);
  };

  Writer.prototype.renderPartial = function renderPartial (token, context, partials) {
    if (!partials) return;

    var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null)
      return this.renderTokens(this.parse(value), context, partials, value);
  };

  Writer.prototype.unescapedValue = function unescapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return value;
  };

  Writer.prototype.escapedValue = function escapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return mustache.escape(value);
  };

  Writer.prototype.rawValue = function rawValue (token) {
    return token[1];
  };

  mustache.name = 'mustache.js';
  mustache.version = '2.2.1';
  mustache.tags = [ '{{', '}}' ];

  // All high-level mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates in the default writer.
   */
  mustache.clearCache = function clearCache () {
    return defaultWriter.clearCache();
  };

  /**
   * Parses and caches the given template in the default writer and returns the
   * array of tokens it contains. Doing this ahead of time avoids the need to
   * parse templates on the fly as they are rendered.
   */
  mustache.parse = function parse (template, tags) {
    return defaultWriter.parse(template, tags);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function render (template, view, partials) {
    if (typeof template !== 'string') {
      throw new TypeError('Invalid template! Template should be a "string" ' +
                          'but "' + typeStr(template) + '" was given as the first ' +
                          'argument for mustache#render(template, view, partials)');
    }

    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.,
  /*eslint-disable */ // eslint wants camel cased function name
  mustache.to_html = function to_html (template, view, partials, send) {
    /*eslint-enable*/

    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // Export these mainly for testing, but also for advanced usage.
  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

}));

},{}],"rdf2h":[function(require,module,exports){
/* global rdf, Mustache */


var rdf = require("rdf-ext");
var clownface = require("clownface");
var Mustache = require("mustache");
var Logger = require("./logger.js");

rdf.setPrefix("r2h", "http://rdf2h.github.io/2015/rdf2h#");

function RDF2h(matcherGraph) {
    RDF2h.logger.info("To see more debug output invoke RDF2h.logger.setLevel(Logger.DEBUG) or even RDF2h.logger.setLevel(Logger.TRACE)");
    this.matcherGraph = matcherGraph;
    //use cf.in on r2h:Matcher create array of matchers
    var cf = clownface.Graph(matcherGraph);
    var matcherType = cf.node("http://rdf2h.github.io/2015/rdf2h#Matcher");
    var unorderedMatchers = matcherType.in("http://www.w3.org/1999/02/22-rdf-syntax-ns#type").nodes();
    this.matchers = [];
    var self = this;
    function getLaterNodes(cfn) {
        var laterNodes = cfn.out("http://rdf2h.github.io/2015/rdf2h#before").nodes();
        for (var i = 0; i < laterNodes.length; i++) {
            var laterNode = cf.node(laterNodes[i]);
            var transitives = getLaterNodes(laterNode);
            for (var j = 0; j < transitives.length; j++) {
                var transitive = transitives[j];
                if (!laterNodes.some(function (e) {
                    return (transitive.equals(e));
                })) {
                    laterNodes.push(transitive);
                }
            }
        }
        return laterNodes;
    }
    while (unorderedMatchers.length > 0) {
        var matcherToPlace = unorderedMatchers.pop();
        var laterNodes = getLaterNodes(cf.node(matcherToPlace));
        function getInsertPosition() {
            for (var i = 0; i < self.matchers.length; i++) {
                if (laterNodes.some(function (e) {
                    return (self.matchers[i].equals(e))
                })) {
                    return i;
                }
            }
            return self.matchers.length;
        }
        this.matchers.splice(getInsertPosition(), 0, matcherToPlace);
    }
    RDF2h.logger.debug("Constructed RDF2h with the following matchers: ", this.matchers);
}

RDF2h.logger = new Logger();

(function () {
    var origLokup = Mustache.Context.prototype.lookup;
    Mustache.Context.prototype.lookup = function (name) {
        if (this.view instanceof RDF2h.Renderee) {
            var rdf2h = this.view.rdf2h;
            var graphNode = this.view.graphNode;
            var graph = this.view.graph;
            var context = this.view.context;
            var currentMatcherIndex = this.view.currentMatcherIndex;
            function resolvePath(path) {
                function resolveSubPath(node, pathSections) {
                    function resolveSection(section) {
                        if (section === ".") {
                            return node;
                        } else {
                            if (section.endsWith("<-")) {
                                return node.in(RDF2h.resolveCurie(section.substring(0, section.length - 2)));
                            } else {
                                return node.out(RDF2h.resolveCurie(section));
                            }
                        }
                    }
                    subNode = resolveSection(pathSections[0]);
                    if (pathSections.length === 1) {
                        var resultNodes = subNode.nodes();
                        if (resultNodes.length === 0) {
                            //handling pseudo properties of literals
                            if (node.nodes()[0].language) {
                                if (RDF2h.resolveCurie(pathSections[0]) === "http://purl.org/dc/terms/language") {
                                    return [rdf.createLiteral(node.nodes()[0].language)];
                                }
                            }
                            if (node.nodes()[0].datatype) {
                                if (RDF2h.resolveCurie(pathSections[0]) === RDF2h.resolveCurie("rdf:type")) {
                                    return [node.nodes()[0].datatype];
                                }
                            }
                        }
                        return resultNodes;
                    }
                    return resolveSubPath(subNode,pathSections.slice(1))    
                }
                var pathSections = path.split("/").filter(function(e) { return e.length > 0})
                return resolveSubPath(graphNode, pathSections);
            }
            if (name.startsWith("@prefix ")) {
                var splits = name.split(" ");
                var prefixPart = splits[1];
                var iriPart = splits[2];
                var prefix = prefixPart.substring(0, prefixPart.length -1);
                var iri = iriPart.substring(1, iriPart.length -1);
                RDF2h.prefixMap[prefix] = iri;
                return "";
            }
            if (name.startsWith(":render ")) {
                var splits = name.split(" ");
                var nodePath = splits[1];
                var subContext = splits[2];
                if (subContext) {
                    subContext = RDF2h.resolveCurie(subContext);
                }
                if (!subContext) {
                    subContext = context;
                }
                var resolvedNodes = resolvePath(nodePath);
                if (resolvedNodes.length > 1) {
                    RDF2h.logger.warn("Argument of render evaluates to more than one node!")
                }
                if (resolvedNodes.length > 0) {
                    return rdf2h.render(graph, resolvedNodes[0], subContext)
                } else {
                    return "";
                }
            }
            if (name.startsWith(":continue")) {
                var splits = name.split(" ");
                var subContext = splits[1];
                if (subContext) {
                    subContext = RDF2h.resolveCurie(subContext);
                }
                if (!subContext) {
                    subContext = context;
                }
                if (graphNode.nodes().length > 1) {
                    RDF2h.logger.warn(":continue invoked in context with more than one node, this shouldn't be possible!")
                }
                return rdf2h.render(graph, graphNode.nodes()[0], subContext, currentMatcherIndex + 1);

            }
            if (name.startsWith("+")) {
                name = name.substring(1);
                return (resolvePath(name).length > 0);
            }
            var nodes = resolvePath(name);
            if (nodes.length === 1) {
                return new RDF2h.Renderee(rdf2h, graph, nodes[0], context);
            } else {
                return nodes.map(function (node) {
                    return new RDF2h.Renderee(rdf2h, graph, node, context);
                });
            }
            /*var node = this.view;
             if (name === ".") {
             return node;
             } else {
             return "not supported: "+name;
             }*/
        } else {
            return origLokup.call(this, name);
        }
    };
})();


RDF2h.Renderee = function (rdf2h, graph, node, context) {
    if (!node) {
        throw "no node specficied!";
    }
    if (Object.prototype.toString.call(node) === '[object Array]') {
        throw "Renderee must be a single node";
    }
    this.rdf2h = rdf2h;
    this.graph = graph;
    this.node = node;
    this.context = context;
    var cf = clownface.Graph(graph);
    this.graphNode = cf.node(node);
};

RDF2h.Renderee.prototype.toString = function () {
    if (this.node.nominalValue) {
        return this.node.nominalValue;
    }
    return this.node.toString();
}

RDF2h.prototype.getRenderer = function (renderee) {
    var cf = clownface.Graph(this.matcherGraph);

    function matchPattern(cfTriplePattern) {
        function isThis(node) {
            return (node && (node.interfaceName === "NamedNode") &&
                    (node.toString() === "http://rdf2h.github.io/2015/rdf2h#this"));
        }
        var s = cfTriplePattern.out("http://rdf2h.github.io/2015/rdf2h#subject").nodes()[0];
        var p = cfTriplePattern.out("http://rdf2h.github.io/2015/rdf2h#predicate").nodes()[0];
        var o = cfTriplePattern.out("http://rdf2h.github.io/2015/rdf2h#object").nodes()[0];
        if (isThis(s)) {
            if (renderee.node.interfaceName === "Literal") {
                if (rdf.createNamedNode(RDF2h.resolveCurie("rdf:type")).equals(p)) {
                    return renderee.node.datatype.equals(o);
                }
            }
            return renderee.graphNode.out(p).nodes().some(function (e) {
                return (!o || o.equals(e));
            });
        } else if (isThis(o)) {
            return renderee.graphNode.in(p).nodes().some(function (e) {
                return (!s || s.equals(e));
            });
        } else {
            console.error("Triple pattern must have r2h:this as subject or object");
        }
    }
    function matchesContext(cfTemplate) {
        var contexts = cfTemplate.out("http://rdf2h.github.io/2015/rdf2h#context").nodes();
        if (contexts.length === 0) {
            RDF2h.logger.trace("template "+cfTemplate+" specifies no context, thus accepting it for "+renderee.context);
            return true;
        }
        return contexts.some(function(context) {
            if (renderee.context == context) {
                RDF2h.logger.trace("template "+cfTemplate+" matches the context "+renderee.context);
                return true;
            }
        });
    }
    function matches(cfMatcher) {
        var triplePatterns = cfMatcher.out("http://rdf2h.github.io/2015/rdf2h#triplePattern").nodes();
        for (var i = 0; i < triplePatterns.length; i++) {
            var cfTp = cf.node(triplePatterns[i]);
            if (!matchPattern(cfTp)) {
                RDF2h.logger.debug("Matcher "+cfMatcher+" doesn't has tripple patterns matching "+renderee.graphNode);
                return false;
            }
        }
        return true;
    }
    function resolveTemplateNode(templateURI) {
        if (!window) {
            return "Could not get template: " + templateURI + ", no window object."
        }
        var pageURIPrefix = window.location + "#";
        if (!templateURI.startsWith(pageURIPrefix)) {
            return "Could not get template: " + templateURI + ", the prefix must be " + pageURIPrefix + "."
        }
        var id = templateURI.substring(pageURIPrefix.length);
        return document.getElementById(id).textContent;
    }
    function templateRenderer(template) {
        return function (renderee) {
            return Mustache.render(template, renderee);
        };
    }
    for (var i = this.startMatcherIndex; i < this.matchers.length; i++) {
        var matcher = this.matchers[i];
        var cfMatcher = cf.node(matcher);
        if (matches(cfMatcher)) {
            renderee.currentMatcherIndex = i;
            //r2h:template seems not to work here
            var templateNodes = cfMatcher.out("http://rdf2h.github.io/2015/rdf2h#template").nodes();
            for (var j = 0; j < templateNodes.length; j++) {
                var templateNode = templateNodes[j];
                var cfTemplate = cf.node(templateNode);
                if (!matchesContext(cfTemplate)) {
                    continue;
                }
                var jsNode = cfTemplate.
                        out("http://rdf2h.github.io/2015/rdf2h#javaScript").
                        nodes()[0];
                if (jsNode) {
                    return eval("var f = "+jsNode.nominalValue+"; f;");
                }
                var mustacheNode = cfTemplate.
                        out("http://rdf2h.github.io/2015/rdf2h#mustache").
                        nodes()[0];
                if (mustacheNode.interfaceName === "NamedNode") {
                    return templateRenderer(resolveTemplateNode(mustacheNode.nominalValue));
                }
                return templateRenderer(mustacheNode.nominalValue);
            }
            RDF2h.logger.debug("Matcher "+cfMatcher+" has not template with matching context");
        }
    }
    if (this.startMatcherIndex === 0) {
        return templateRenderer('<div class="missingTemplate">No template found for &lt;{{.}}&gt;</div>');
    } else {
        return templateRenderer('<div class="noMoreTemplate">No more template available for &lt;{{.}}&gt; in context &lt;'+renderee.context+'&gt;</div>');
    }

}

RDF2h.prototype.render = function (graph, node, context, startMatcherIndex) {
    if (!node.interfaceName) {
        node = rdf.createNamedNode(node);
    }
    if (!context) {
        context = RDF2h.resolveCurie("r2h:Default");
    }
    //wrap all in one object that gets special care by lookup
    var renderee = new RDF2h.Renderee(this, graph, node, context);
    if (!startMatcherIndex) {
        this.startMatcherIndex = 0;
    } else {
        this.startMatcherIndex = startMatcherIndex;
    }
    var renderer = this.getRenderer(renderee);
    return renderer(renderee);
}

RDF2h.prefixMap = rdf.prefixes;
RDF2h.prefixMap["s"] = "http://schema.org/";
/*rdf.prefixes.addAll({
    "s": "http://schema.org/"
});*/

RDF2h.resolveCurie = function (curie) {
    RDF2h.logger.debug("resolving " + curie);
    var splits = curie.split(":");
    var prefix = splits[0];
    var suffix = splits[1];
    if (RDF2h.prefixMap[prefix]) {
        return RDF2h.prefixMap[prefix] + suffix;
    } else {
        return curie;
    }

};

if (typeof window !== 'undefined') {
    window.RDF2h = RDF2h;
}

if (typeof module !== 'undefined') {
    module.exports = RDF2h;
}

},{"./logger.js":1,"clownface":2,"mustache":3,"rdf-ext":"rdf-ext"}]},{},["rdf2h"])
//# sourceMappingURL=rdf2h.js.map
