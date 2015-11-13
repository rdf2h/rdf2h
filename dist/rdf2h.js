(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
                if (path === ".") {
                    return graphNode.nodes();
                } else {
                    if (path.endsWith("<-")) {
                        return graphNode.in(RDF2h.resolveCurie(path.substring(0, path.length - 2))).nodes();
                    } else {
                        return graphNode.out(RDF2h.resolveCurie(path)).nodes();
                    }
                }
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
            return renderee.graphNode.out(p).nodes().some(function (e) {
                return (!o || o.equals(e))
            });
        } else if (isThis(o)) {
            return renderee.graphNode.in(p).nodes().some(function (e) {
                return (!s || s.equals(e))
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
        return templateRenderer('<div class="noMoreTemplate">No more template available for &lt;{{.}}&gt;</div>');
    }

}

RDF2h.prototype.render = function (graph, node, context, startMatcherIndex) {
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

},{"./logger.js":1,"clownface":3,"mustache":4,"rdf-ext":"rdf-ext"}],3:[function(require,module,exports){
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

},{"rdf-ext":"rdf-ext"}],4:[function(require,module,exports){
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
    factory(Mustache); // script, wsh, asp
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
    '/': '&#x2F;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'\/]/g, function fromEntityMap (s) {
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
  mustache.version = '2.2.0';
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

},{}]},{},[2,1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9sb2dnZXIuanMiLCJqcy9yZGYyaC1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2Nsb3duZmFjZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tdXN0YWNoZS9tdXN0YWNoZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBtb2R1bGUgKi9cblxuZnVuY3Rpb24gTG9nZ2VyKCkge1xuICAgIC8vZ2V0IGZyb20gbG9jYWxTdG9yYWdlXG4gICAgdGhpcy5sZXZlbCA9IExvZ2dlci5JTkZPO1xufVxuXG5Mb2dnZXIuVFJBQ0UgPSAxO1xuTG9nZ2VyLkRFQlVHID0gMjtcbkxvZ2dlci5JTkZPID0gMztcbkxvZ2dlci5XQVJOID0gNDtcbkxvZ2dlci5FUlJPUiA9IDU7XG5cbkxvZ2dlci5wcm90b3R5cGUuc2V0TGV2ZWwgPSBmdW5jdGlvbihsZXZlbCkge1xuICAgIHRoaXMubGV2ZWwgPSBsZXZlbDtcbn07XG5cbkxvZ2dlci5wcm90b3R5cGUudHJhY2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nZ2VyLlRSQUNFKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBhcmdzWzBdID0gXCJbVFJBQ0VdIFwiK21lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbn07XG5cbkxvZ2dlci5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nZ2VyLkRFQlVHKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBhcmdzWzBdID0gXCJbREVCVUddIFwiK21lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbn07XG5cbkxvZ2dlci5wcm90b3R5cGUuaW5mbyA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBpZiAodGhpcy5sZXZlbCA8PSBMb2dnZXIuSU5GTykge1xuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgYXJnc1swXSA9IFwiW0lORk9dIFwiK21lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbn07XG5cbkxvZ2dlci5wcm90b3R5cGUud2FybiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBpZiAodGhpcy5sZXZlbCA8PSBMb2dnZXIuV0FSTikge1xuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgYXJnc1swXSA9IFwiW1dBUk5dIFwiK21lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbn07XG5cbkxvZ2dlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nZ2VyLkVSUk9SKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBhcmdzWzBdID0gXCJbRVJST1JdIFwiK21lc3NhZ2U7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbn07XG5cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBMb2dnZXI7XG59XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB3aW5kb3cuTG9nZ2VyID0gTG9nZ2VyO1xufVxuIiwiLyogZ2xvYmFsIHJkZiwgTXVzdGFjaGUgKi9cblxuXG52YXIgcmRmID0gcmVxdWlyZShcInJkZi1leHRcIik7XG52YXIgY2xvd25mYWNlID0gcmVxdWlyZShcImNsb3duZmFjZVwiKTtcbnZhciBNdXN0YWNoZSA9IHJlcXVpcmUoXCJtdXN0YWNoZVwiKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi9sb2dnZXIuanNcIik7XG5cbnJkZi5zZXRQcmVmaXgoXCJyMmhcIiwgXCJodHRwOi8vcmRmMmguZ2l0aHViLmlvLzIwMTUvcmRmMmgjXCIpO1xuXG5mdW5jdGlvbiBSREYyaChtYXRjaGVyR3JhcGgpIHtcbiAgICBSREYyaC5sb2dnZXIuaW5mbyhcIlRvIHNlZSBtb3JlIGRlYnVnIG91dHB1dCBpbnZva2UgUkRGMmgubG9nZ2VyLnNldExldmVsKExvZ2dlci5ERUJVRykgb3IgZXZlbiBSREYyaC5sb2dnZXIuc2V0TGV2ZWwoTG9nZ2VyLlRSQUNFKVwiKTtcbiAgICB0aGlzLm1hdGNoZXJHcmFwaCA9IG1hdGNoZXJHcmFwaDtcbiAgICAvL3VzZSBjZi5pbiBvbiByMmg6TWF0Y2hlciBjcmVhdGUgYXJyYXkgb2YgbWF0Y2hlcnNcbiAgICB2YXIgY2YgPSBjbG93bmZhY2UuR3JhcGgobWF0Y2hlckdyYXBoKTtcbiAgICB2YXIgbWF0Y2hlclR5cGUgPSBjZi5ub2RlKFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI01hdGNoZXJcIik7XG4gICAgdmFyIHVub3JkZXJlZE1hdGNoZXJzID0gbWF0Y2hlclR5cGUuaW4oXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjdHlwZVwiKS5ub2RlcygpO1xuICAgIHRoaXMubWF0Y2hlcnMgPSBbXTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZnVuY3Rpb24gZ2V0TGF0ZXJOb2RlcyhjZm4pIHtcbiAgICAgICAgdmFyIGxhdGVyTm9kZXMgPSBjZm4ub3V0KFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI2JlZm9yZVwiKS5ub2RlcygpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhdGVyTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBsYXRlck5vZGUgPSBjZi5ub2RlKGxhdGVyTm9kZXNbaV0pO1xuICAgICAgICAgICAgdmFyIHRyYW5zaXRpdmVzID0gZ2V0TGF0ZXJOb2RlcyhsYXRlck5vZGUpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0cmFuc2l0aXZlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciB0cmFuc2l0aXZlID0gdHJhbnNpdGl2ZXNbal07XG4gICAgICAgICAgICAgICAgaWYgKCFsYXRlck5vZGVzLnNvbWUoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICh0cmFuc2l0aXZlLmVxdWFscyhlKSk7XG4gICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXJOb2Rlcy5wdXNoKHRyYW5zaXRpdmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGF0ZXJOb2RlcztcbiAgICB9XG4gICAgd2hpbGUgKHVub3JkZXJlZE1hdGNoZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIG1hdGNoZXJUb1BsYWNlID0gdW5vcmRlcmVkTWF0Y2hlcnMucG9wKCk7XG4gICAgICAgIHZhciBsYXRlck5vZGVzID0gZ2V0TGF0ZXJOb2RlcyhjZi5ub2RlKG1hdGNoZXJUb1BsYWNlKSk7XG4gICAgICAgIGZ1bmN0aW9uIGdldEluc2VydFBvc2l0aW9uKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLm1hdGNoZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhdGVyTm9kZXMuc29tZShmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNlbGYubWF0Y2hlcnNbaV0uZXF1YWxzKGUpKVxuICAgICAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmLm1hdGNoZXJzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm1hdGNoZXJzLnNwbGljZShnZXRJbnNlcnRQb3NpdGlvbigpLCAwLCBtYXRjaGVyVG9QbGFjZSk7XG4gICAgfVxuICAgIFJERjJoLmxvZ2dlci5kZWJ1ZyhcIkNvbnN0cnVjdGVkIFJERjJoIHdpdGggdGhlIGZvbGxvd2luZyBtYXRjaGVyczogXCIsIHRoaXMubWF0Y2hlcnMpO1xufVxuXG5SREYyaC5sb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9yaWdMb2t1cCA9IE11c3RhY2hlLkNvbnRleHQucHJvdG90eXBlLmxvb2t1cDtcbiAgICBNdXN0YWNoZS5Db250ZXh0LnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICBpZiAodGhpcy52aWV3IGluc3RhbmNlb2YgUkRGMmguUmVuZGVyZWUpIHtcbiAgICAgICAgICAgIHZhciByZGYyaCA9IHRoaXMudmlldy5yZGYyaDtcbiAgICAgICAgICAgIHZhciBncmFwaE5vZGUgPSB0aGlzLnZpZXcuZ3JhcGhOb2RlO1xuICAgICAgICAgICAgdmFyIGdyYXBoID0gdGhpcy52aWV3LmdyYXBoO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLnZpZXcuY29udGV4dDtcbiAgICAgICAgICAgIHZhciBjdXJyZW50TWF0Y2hlckluZGV4ID0gdGhpcy52aWV3LmN1cnJlbnRNYXRjaGVySW5kZXg7XG4gICAgICAgICAgICBmdW5jdGlvbiByZXNvbHZlUGF0aChwYXRoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGggPT09IFwiLlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBncmFwaE5vZGUubm9kZXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5lbmRzV2l0aChcIjwtXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ3JhcGhOb2RlLmluKFJERjJoLnJlc29sdmVDdXJpZShwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxlbmd0aCAtIDIpKSkubm9kZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBncmFwaE5vZGUub3V0KFJERjJoLnJlc29sdmVDdXJpZShwYXRoKSkubm9kZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoXCJAcHJlZml4IFwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBzcGxpdHMgPSBuYW1lLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcHJlZml4UGFydCA9IHNwbGl0c1sxXTtcbiAgICAgICAgICAgICAgICB2YXIgaXJpUGFydCA9IHNwbGl0c1syXTtcbiAgICAgICAgICAgICAgICB2YXIgcHJlZml4ID0gcHJlZml4UGFydC5zdWJzdHJpbmcoMCwgcHJlZml4UGFydC5sZW5ndGggLTEpO1xuICAgICAgICAgICAgICAgIHZhciBpcmkgPSBpcmlQYXJ0LnN1YnN0cmluZygxLCBpcmlQYXJ0Lmxlbmd0aCAtMSk7XG4gICAgICAgICAgICAgICAgUkRGMmgucHJlZml4TWFwW3ByZWZpeF0gPSBpcmk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmFtZS5zdGFydHNXaXRoKFwiOnJlbmRlciBcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3BsaXRzID0gbmFtZS5zcGxpdChcIiBcIik7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGVQYXRoID0gc3BsaXRzWzFdO1xuICAgICAgICAgICAgICAgIHZhciBzdWJDb250ZXh0ID0gc3BsaXRzWzJdO1xuICAgICAgICAgICAgICAgIGlmIChzdWJDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YkNvbnRleHQgPSBSREYyaC5yZXNvbHZlQ3VyaWUoc3ViQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3ViQ29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBzdWJDb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc29sdmVkTm9kZXMgPSByZXNvbHZlUGF0aChub2RlUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkTm9kZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBSREYyaC5sb2dnZXIud2FybihcIkFyZ3VtZW50IG9mIHJlbmRlciBldmFsdWF0ZXMgdG8gbW9yZSB0aGFuIG9uZSBub2RlIVwiKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzb2x2ZWROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZGYyaC5yZW5kZXIoZ3JhcGgsIHJlc29sdmVkTm9kZXNbMF0sIHN1YkNvbnRleHQpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5hbWUuc3RhcnRzV2l0aChcIjpjb250aW51ZVwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBzcGxpdHMgPSBuYW1lLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgc3ViQ29udGV4dCA9IHNwbGl0c1sxXTtcbiAgICAgICAgICAgICAgICBpZiAoc3ViQ29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBzdWJDb250ZXh0ID0gUkRGMmgucmVzb2x2ZUN1cmllKHN1YkNvbnRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXN1YkNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChncmFwaE5vZGUubm9kZXMoKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIFJERjJoLmxvZ2dlci53YXJuKFwiOmNvbnRpbnVlIGludm9rZWQgaW4gY29udGV4dCB3aXRoIG1vcmUgdGhhbiBvbmUgbm9kZSwgdGhpcyBzaG91bGRuJ3QgYmUgcG9zc2libGUhXCIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZGYyaC5yZW5kZXIoZ3JhcGgsIGdyYXBoTm9kZS5ub2RlcygpWzBdLCBzdWJDb250ZXh0LCBjdXJyZW50TWF0Y2hlckluZGV4ICsgMSk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoXCIrXCIpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgICAgIHJldHVybiAocmVzb2x2ZVBhdGgobmFtZSkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbm9kZXMgPSByZXNvbHZlUGF0aChuYW1lKTtcbiAgICAgICAgICAgIGlmIChub2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFJERjJoLlJlbmRlcmVlKHJkZjJoLCBncmFwaCwgbm9kZXNbMF0sIGNvbnRleHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZXMubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUkRGMmguUmVuZGVyZWUocmRmMmgsIGdyYXBoLCBub2RlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qdmFyIG5vZGUgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiLlwiKSB7XG4gICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICByZXR1cm4gXCJub3Qgc3VwcG9ydGVkOiBcIituYW1lO1xuICAgICAgICAgICAgIH0qL1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9yaWdMb2t1cC5jYWxsKHRoaXMsIG5hbWUpO1xuICAgICAgICB9XG4gICAgfTtcbn0pKCk7XG5cblxuUkRGMmguUmVuZGVyZWUgPSBmdW5jdGlvbiAocmRmMmgsIGdyYXBoLCBub2RlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAgIHRocm93IFwibm8gbm9kZSBzcGVjZmljaWVkIVwiO1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5vZGUpID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAgIHRocm93IFwiUmVuZGVyZWUgbXVzdCBiZSBhIHNpbmdsZSBub2RlXCI7XG4gICAgfVxuICAgIHRoaXMucmRmMmggPSByZGYyaDtcbiAgICB0aGlzLmdyYXBoID0gZ3JhcGg7XG4gICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHZhciBjZiA9IGNsb3duZmFjZS5HcmFwaChncmFwaCk7XG4gICAgdGhpcy5ncmFwaE5vZGUgPSBjZi5ub2RlKG5vZGUpO1xufTtcblxuUkRGMmguUmVuZGVyZWUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLm5vZGUubm9taW5hbFZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5vZGUubm9taW5hbFZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlLnRvU3RyaW5nKCk7XG59XG5cblJERjJoLnByb3RvdHlwZS5nZXRSZW5kZXJlciA9IGZ1bmN0aW9uIChyZW5kZXJlZSkge1xuICAgIHZhciBjZiA9IGNsb3duZmFjZS5HcmFwaCh0aGlzLm1hdGNoZXJHcmFwaCk7XG5cbiAgICBmdW5jdGlvbiBtYXRjaFBhdHRlcm4oY2ZUcmlwbGVQYXR0ZXJuKSB7XG4gICAgICAgIGZ1bmN0aW9uIGlzVGhpcyhub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gKG5vZGUgJiYgKG5vZGUuaW50ZXJmYWNlTmFtZSA9PT0gXCJOYW1lZE5vZGVcIikgJiZcbiAgICAgICAgICAgICAgICAgICAgKG5vZGUudG9TdHJpbmcoKSA9PT0gXCJodHRwOi8vcmRmMmguZ2l0aHViLmlvLzIwMTUvcmRmMmgjdGhpc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHMgPSBjZlRyaXBsZVBhdHRlcm4ub3V0KFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI3N1YmplY3RcIikubm9kZXMoKVswXTtcbiAgICAgICAgdmFyIHAgPSBjZlRyaXBsZVBhdHRlcm4ub3V0KFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI3ByZWRpY2F0ZVwiKS5ub2RlcygpWzBdO1xuICAgICAgICB2YXIgbyA9IGNmVHJpcGxlUGF0dGVybi5vdXQoXCJodHRwOi8vcmRmMmguZ2l0aHViLmlvLzIwMTUvcmRmMmgjb2JqZWN0XCIpLm5vZGVzKClbMF07XG4gICAgICAgIGlmIChpc1RoaXMocykpIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlZS5ncmFwaE5vZGUub3V0KHApLm5vZGVzKCkuc29tZShmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoIW8gfHwgby5lcXVhbHMoZSkpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1RoaXMobykpIHtcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlZS5ncmFwaE5vZGUuaW4ocCkubm9kZXMoKS5zb21lKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICghcyB8fCBzLmVxdWFscyhlKSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyaXBsZSBwYXR0ZXJuIG11c3QgaGF2ZSByMmg6dGhpcyBhcyBzdWJqZWN0IG9yIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBtYXRjaGVzQ29udGV4dChjZlRlbXBsYXRlKSB7XG4gICAgICAgIHZhciBjb250ZXh0cyA9IGNmVGVtcGxhdGUub3V0KFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI2NvbnRleHRcIikubm9kZXMoKTtcbiAgICAgICAgaWYgKGNvbnRleHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgUkRGMmgubG9nZ2VyLnRyYWNlKFwidGVtcGxhdGUgXCIrY2ZUZW1wbGF0ZStcIiBzcGVjaWZpZXMgbm8gY29udGV4dCwgdGh1cyBhY2NlcHRpbmcgaXQgZm9yIFwiK3JlbmRlcmVlLmNvbnRleHQpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHRzLnNvbWUoZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHJlbmRlcmVlLmNvbnRleHQgPT0gY29udGV4dCkge1xuICAgICAgICAgICAgICAgIFJERjJoLmxvZ2dlci50cmFjZShcInRlbXBsYXRlIFwiK2NmVGVtcGxhdGUrXCIgbWF0Y2hlcyB0aGUgY29udGV4dCBcIityZW5kZXJlZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1hdGNoZXMoY2ZNYXRjaGVyKSB7XG4gICAgICAgIHZhciB0cmlwbGVQYXR0ZXJucyA9IGNmTWF0Y2hlci5vdXQoXCJodHRwOi8vcmRmMmguZ2l0aHViLmlvLzIwMTUvcmRmMmgjdHJpcGxlUGF0dGVyblwiKS5ub2RlcygpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaXBsZVBhdHRlcm5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2ZUcCA9IGNmLm5vZGUodHJpcGxlUGF0dGVybnNbaV0pO1xuICAgICAgICAgICAgaWYgKCFtYXRjaFBhdHRlcm4oY2ZUcCkpIHtcbiAgICAgICAgICAgICAgICBSREYyaC5sb2dnZXIuZGVidWcoXCJNYXRjaGVyIFwiK2NmTWF0Y2hlcitcIiBkb2Vzbid0IGhhcyB0cmlwcGxlIHBhdHRlcm5zIG1hdGNoaW5nIFwiK3JlbmRlcmVlLmdyYXBoTm9kZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXNvbHZlVGVtcGxhdGVOb2RlKHRlbXBsYXRlVVJJKSB7XG4gICAgICAgIGlmICghd2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJDb3VsZCBub3QgZ2V0IHRlbXBsYXRlOiBcIiArIHRlbXBsYXRlVVJJICsgXCIsIG5vIHdpbmRvdyBvYmplY3QuXCJcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFnZVVSSVByZWZpeCA9IHdpbmRvdy5sb2NhdGlvbiArIFwiI1wiO1xuICAgICAgICBpZiAoIXRlbXBsYXRlVVJJLnN0YXJ0c1dpdGgocGFnZVVSSVByZWZpeCkpIHtcbiAgICAgICAgICAgIHJldHVybiBcIkNvdWxkIG5vdCBnZXQgdGVtcGxhdGU6IFwiICsgdGVtcGxhdGVVUkkgKyBcIiwgdGhlIHByZWZpeCBtdXN0IGJlIFwiICsgcGFnZVVSSVByZWZpeCArIFwiLlwiXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gdGVtcGxhdGVVUkkuc3Vic3RyaW5nKHBhZ2VVUklQcmVmaXgubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKS50ZXh0Q29udGVudDtcbiAgICB9XG4gICAgZnVuY3Rpb24gdGVtcGxhdGVSZW5kZXJlcih0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHJlbmRlcmVlKSB7XG4gICAgICAgICAgICByZXR1cm4gTXVzdGFjaGUucmVuZGVyKHRlbXBsYXRlLCByZW5kZXJlZSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSB0aGlzLnN0YXJ0TWF0Y2hlckluZGV4OyBpIDwgdGhpcy5tYXRjaGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbWF0Y2hlciA9IHRoaXMubWF0Y2hlcnNbaV07XG4gICAgICAgIHZhciBjZk1hdGNoZXIgPSBjZi5ub2RlKG1hdGNoZXIpO1xuICAgICAgICBpZiAobWF0Y2hlcyhjZk1hdGNoZXIpKSB7XG4gICAgICAgICAgICByZW5kZXJlZS5jdXJyZW50TWF0Y2hlckluZGV4ID0gaTtcbiAgICAgICAgICAgIC8vcjJoOnRlbXBsYXRlIHNlZW1zIG5vdCB0byB3b3JrIGhlcmVcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZU5vZGVzID0gY2ZNYXRjaGVyLm91dChcImh0dHA6Ly9yZGYyaC5naXRodWIuaW8vMjAxNS9yZGYyaCN0ZW1wbGF0ZVwiKS5ub2RlcygpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0ZW1wbGF0ZU5vZGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlTm9kZSA9IHRlbXBsYXRlTm9kZXNbal07XG4gICAgICAgICAgICAgICAgdmFyIGNmVGVtcGxhdGUgPSBjZi5ub2RlKHRlbXBsYXRlTm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVzQ29udGV4dChjZlRlbXBsYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGpzTm9kZSA9IGNmVGVtcGxhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQoXCJodHRwOi8vcmRmMmguZ2l0aHViLmlvLzIwMTUvcmRmMmgjamF2YVNjcmlwdFwiKS5cbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzKClbMF07XG4gICAgICAgICAgICAgICAgaWYgKGpzTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZhbChcInZhciBmID0gXCIranNOb2RlLm5vbWluYWxWYWx1ZStcIjsgZjtcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBtdXN0YWNoZU5vZGUgPSBjZlRlbXBsYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0KFwiaHR0cDovL3JkZjJoLmdpdGh1Yi5pby8yMDE1L3JkZjJoI211c3RhY2hlXCIpLlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXMoKVswXTtcbiAgICAgICAgICAgICAgICBpZiAobXVzdGFjaGVOb2RlLmludGVyZmFjZU5hbWUgPT09IFwiTmFtZWROb2RlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBsYXRlUmVuZGVyZXIocmVzb2x2ZVRlbXBsYXRlTm9kZShtdXN0YWNoZU5vZGUubm9taW5hbFZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZVJlbmRlcmVyKG11c3RhY2hlTm9kZS5ub21pbmFsVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgUkRGMmgubG9nZ2VyLmRlYnVnKFwiTWF0Y2hlciBcIitjZk1hdGNoZXIrXCIgaGFzIG5vdCB0ZW1wbGF0ZSB3aXRoIG1hdGNoaW5nIGNvbnRleHRcIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuc3RhcnRNYXRjaGVySW5kZXggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlUmVuZGVyZXIoJzxkaXYgY2xhc3M9XCJtaXNzaW5nVGVtcGxhdGVcIj5ObyB0ZW1wbGF0ZSBmb3VuZCBmb3IgJmx0O3t7Ln19Jmd0OzwvZGl2PicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVJlbmRlcmVyKCc8ZGl2IGNsYXNzPVwibm9Nb3JlVGVtcGxhdGVcIj5ObyBtb3JlIHRlbXBsYXRlIGF2YWlsYWJsZSBmb3IgJmx0O3t7Ln19Jmd0OzwvZGl2PicpO1xuICAgIH1cblxufVxuXG5SREYyaC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKGdyYXBoLCBub2RlLCBjb250ZXh0LCBzdGFydE1hdGNoZXJJbmRleCkge1xuICAgIGlmICghY29udGV4dCkge1xuICAgICAgICBjb250ZXh0ID0gUkRGMmgucmVzb2x2ZUN1cmllKFwicjJoOkRlZmF1bHRcIik7XG4gICAgfVxuICAgIC8vd3JhcCBhbGwgaW4gb25lIG9iamVjdCB0aGF0IGdldHMgc3BlY2lhbCBjYXJlIGJ5IGxvb2t1cFxuICAgIHZhciByZW5kZXJlZSA9IG5ldyBSREYyaC5SZW5kZXJlZSh0aGlzLCBncmFwaCwgbm9kZSwgY29udGV4dCk7XG4gICAgaWYgKCFzdGFydE1hdGNoZXJJbmRleCkge1xuICAgICAgICB0aGlzLnN0YXJ0TWF0Y2hlckluZGV4ID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0YXJ0TWF0Y2hlckluZGV4ID0gc3RhcnRNYXRjaGVySW5kZXg7XG4gICAgfVxuICAgIHZhciByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIocmVuZGVyZWUpO1xuICAgIHJldHVybiByZW5kZXJlcihyZW5kZXJlZSk7XG59XG5cblJERjJoLnByZWZpeE1hcCA9IHJkZi5wcmVmaXhlcztcblJERjJoLnByZWZpeE1hcFtcInNcIl0gPSBcImh0dHA6Ly9zY2hlbWEub3JnL1wiO1xuLypyZGYucHJlZml4ZXMuYWRkQWxsKHtcbiAgICBcInNcIjogXCJodHRwOi8vc2NoZW1hLm9yZy9cIlxufSk7Ki9cblxuUkRGMmgucmVzb2x2ZUN1cmllID0gZnVuY3Rpb24gKGN1cmllKSB7XG4gICAgUkRGMmgubG9nZ2VyLmRlYnVnKFwicmVzb2x2aW5nIFwiICsgY3VyaWUpO1xuICAgIHZhciBzcGxpdHMgPSBjdXJpZS5zcGxpdChcIjpcIik7XG4gICAgdmFyIHByZWZpeCA9IHNwbGl0c1swXTtcbiAgICB2YXIgc3VmZml4ID0gc3BsaXRzWzFdO1xuICAgIGlmIChSREYyaC5wcmVmaXhNYXBbcHJlZml4XSkge1xuICAgICAgICByZXR1cm4gUkRGMmgucHJlZml4TWFwW3ByZWZpeF0gKyBzdWZmaXg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cmllO1xuICAgIH1cblxufTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgd2luZG93LlJERjJoID0gUkRGMmg7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUkRGMmg7XG59XG4iLCJ2YXIgcmRmID0gcmVxdWlyZSgncmRmLWV4dCcpXG5cbnZhciBjbG93bmZhY2UgPSB7fVxuXG5jbG93bmZhY2Uub3B0aW9ucyA9IHtcbiAgZGV0ZWN0TmFtZWROb2RlczogdHJ1ZSxcbiAgbmFtZWROb2RlUmVnRXg6IC8oZnRwfGh0dHB8aHR0cHMpOlxcL1xcLyhcXHcrOnswLDF9XFx3KkApPyhcXFMrKSg6WzAtOV0rKT8oXFwvfFxcLyhbXFx3IyE6Lj8rPSYlQCFcXC1cXC9dKSk/L1xufVxuXG5mdW5jdGlvbiBub2RlICh2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgcmV0dXJuIG5vZGUoaXRlbSlcbiAgICB9KVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuaW50ZXJmYWNlTmFtZSkge1xuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoY2xvd25mYWNlLm9wdGlvbnMuZGV0ZWN0TmFtZWROb2RlcyAmJiBjbG93bmZhY2Uub3B0aW9ucy5uYW1lZE5vZGVSZWdFeC50ZXN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHJkZi5jcmVhdGVOYW1lZE5vZGUodmFsdWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByZGYuY3JlYXRlTGl0ZXJhbCh2YWx1ZSlcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiByZGYuY3JlYXRlTGl0ZXJhbCh2YWx1ZSArICcnKVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biB0eXBlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBub2RlR3JhcGggKHZhbHVlLCBncmFwaCwgZ3JhcGhJcmkpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgcmV0dXJuIG5vZGVHcmFwaChpdGVtLCBncmFwaCwgZ3JhcGhJcmkpXG4gICAgfSlcbiAgfVxuXG4gIHZhbHVlID0gbm9kZSh2YWx1ZSlcbiAgdmFsdWUuZ3JhcGggPSBncmFwaFxuICB2YWx1ZS5ncmFwaElyaSA9IGdyYXBoSXJpXG5cbiAgcmV0dXJuIHZhbHVlXG59XG5cbmZ1bmN0aW9uIGluQXJyYXkgKG5vZGUsIGFycmF5KSB7XG4gIHJldHVybiBhcnJheS5zb21lKGZ1bmN0aW9uIChvdGhlck5vZGUpIHtcbiAgICByZXR1cm4gb3RoZXJOb2RlLmVxdWFscyhub2RlKVxuICB9KVxufVxuXG5mdW5jdGlvbiB0b0FycmF5ICh2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBbdmFsdWVdXG4gIH1cblxuICByZXR1cm4gdmFsdWVcbn1cblxuY2xvd25mYWNlLkdyYXBoID0gZnVuY3Rpb24gKGdyYXBoLCBub2Rlcykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgY2xvd25mYWNlLkdyYXBoKSkge1xuICAgIHJldHVybiBuZXcgY2xvd25mYWNlLkdyYXBoKGdyYXBoLCBub2RlcylcbiAgfVxuXG4gIHRoaXMuY29udGV4dCA9IG5vZGUodG9BcnJheShub2RlcykpXG5cbiAgdmFyIG1hdGNoID0gZnVuY3Rpb24gKHN1YmplY3QsIHByZWRpY2F0ZSwgb2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmICghZ3JhcGgpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBbXVxuXG4gICAgcHJlZGljYXRlID0gbm9kZSh0b0FycmF5KHByZWRpY2F0ZSkpXG5cbiAgICBncmFwaC5mb3JFYWNoKGZ1bmN0aW9uICh0cmlwbGUpIHtcbiAgICAgIGlmIChzdWJqZWN0ICE9PSBudWxsICYmICFpbkFycmF5KHRyaXBsZS5zdWJqZWN0LCBzdWJqZWN0KSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKHByZWRpY2F0ZSAhPT0gbnVsbCAmJiAhaW5BcnJheSh0cmlwbGUucHJlZGljYXRlLCBwcmVkaWNhdGUpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAob2JqZWN0ICE9PSBudWxsICYmICFpbkFycmF5KHRyaXBsZS5vYmplY3QsIG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIG1hdGNoZXMucHVzaCh0cmlwbGVbcHJvcGVydHldKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbWF0Y2hlc1xuICB9XG5cbiAgdGhpcy5ncmFwaCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZ3JhcGhcbiAgfVxuXG4gIHRoaXMubm9kZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBjbG93bmZhY2UuR3JhcGgoZ3JhcGgsIHZhbHVlKVxuICB9XG5cbiAgdGhpcy5pbiA9IGZ1bmN0aW9uIChwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gY2xvd25mYWNlLkdyYXBoKGdyYXBoLCBtYXRjaChudWxsLCBwcmVkaWNhdGUsIHRoaXMuY29udGV4dCwgJ3N1YmplY3QnKSlcbiAgfVxuXG4gIHRoaXMub3V0ID0gZnVuY3Rpb24gKHByZWRpY2F0ZSkge1xuICAgIHJldHVybiBjbG93bmZhY2UuR3JhcGgoZ3JhcGgsIG1hdGNoKHRoaXMuY29udGV4dCwgcHJlZGljYXRlLCBudWxsLCAnb2JqZWN0JykpXG4gIH1cblxuICB0aGlzLm5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0XG4gIH1cblxuICB0aGlzLmxpdGVyYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0XG4gICAgICAubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLm5vbWluYWxWYWx1ZVxuICAgICAgfSlcbiAgfVxuXG4gIHRoaXMucmVtb3ZlSW4gPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7XG4gICAgaWYgKHByZWRpY2F0ZSkge1xuICAgICAgcHJlZGljYXRlID0gbm9kZSh0b0FycmF5KHByZWRpY2F0ZSkpXG4gICAgfVxuXG4gICAgdGhpcy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChwcmVkaWNhdGUpIHtcbiAgICAgICAgcHJlZGljYXRlLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBncmFwaC5yZW1vdmVNYXRjaGVzKG51bGwsIHAsIG8pXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBncmFwaC5yZW1vdmVNYXRjaGVzKG51bGwsIG51bGwsIG8pXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICB0aGlzLnJlbW92ZU91dCA9IGZ1bmN0aW9uIChwcmVkaWNhdGUpIHtcbiAgICBpZiAocHJlZGljYXRlKSB7XG4gICAgICBwcmVkaWNhdGUgPSBub2RlKHRvQXJyYXkocHJlZGljYXRlKSlcbiAgICB9XG5cbiAgICB0aGlzLm5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgaWYgKHByZWRpY2F0ZSkge1xuICAgICAgICBwcmVkaWNhdGUuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICAgIGdyYXBoLnJlbW92ZU1hdGNoZXMocywgcCwgbnVsbClcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGdyYXBoLnJlbW92ZU1hdGNoZXMocywgbnVsbCwgbnVsbClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHRoaXMudG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlcygpLm1hcCh0aGlzLm5vZGUpXG4gIH1cblxuICB0aGlzLmZvckVhY2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy50b0FycmF5KCkuZm9yRWFjaChjYWxsYmFjaylcbiAgfVxuXG4gIHRoaXMubWFwID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMudG9BcnJheSgpLm1hcChjYWxsYmFjaylcbiAgfVxuXG4gIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubGl0ZXJhbCgpLmpvaW4oKVxuICB9XG59XG5cbmNsb3duZmFjZS5TdG9yZSA9IGZ1bmN0aW9uIChzdG9yZSwgbm9kZXMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGNsb3duZmFjZS5TdG9yZSkpIHtcbiAgICByZXR1cm4gbmV3IGNsb3duZmFjZS5TdG9yZShzdG9yZSwgbm9kZXMpXG4gIH1cblxuICB0aGlzLmNvbnRleHQgPSB0b0FycmF5KG5vZGVzKVxuXG4gIHRoaXMuc3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHN0b3JlXG4gIH1cblxuICB0aGlzLmdyYXBocyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pcXVlID0gW11cblxuICAgIHRoaXMubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAodW5pcXVlLmluZGV4T2YoaXRlbS5ncmFwaCkgPT09IC0xKSB7XG4gICAgICAgIHVuaXF1ZS5wdXNoKGl0ZW0uZ3JhcGgpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB1bmlxdWVcbiAgfVxuXG4gIHRoaXMubm9kZSA9IGZ1bmN0aW9uICh2YWx1ZSwgZ3JhcGhJcmksIHRoZW4pIHtcbiAgICB2YXIgZ3JhcGhJcmlzID0gdG9BcnJheShncmFwaElyaSB8fCB2YWx1ZS5ncmFwaElyaSB8fCB2YWx1ZSlcblxuICAgIHJldHVybiBQcm9taXNlLmFsbChncmFwaElyaXMubWFwKGZ1bmN0aW9uIChncmFwaElyaSkge1xuICAgICAgcmV0dXJuIHN0b3JlLmdyYXBoKGdyYXBoSXJpKVxuICAgIH0pKS50aGVuKGZ1bmN0aW9uIChncmFwaHMpIHtcbiAgICAgIHZhciBub2RlcyA9IFtdXG5cbiAgICAgIGdyYXBocy5mb3JFYWNoKGZ1bmN0aW9uIChncmFwaCwgaW5kZXgpIHtcbiAgICAgICAgbm9kZXMgPSBub2Rlcy5jb25jYXQobm9kZUdyYXBoKHZhbHVlLCBncmFwaCwgZ3JhcGhJcmlzW2luZGV4XSkpXG4gICAgICB9KVxuXG4gICAgICBpZiAodGhlbikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoZW4oY2xvd25mYWNlLlN0b3JlKHN0b3JlLCBub2RlcykpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNsb3duZmFjZS5TdG9yZShzdG9yZSwgbm9kZXMpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRoaXMuaW4gPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBbXVxuXG4gICAgdGhpcy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIG1hdGNoZXMgPSBtYXRjaGVzLmNvbmNhdChjbG93bmZhY2UuR3JhcGgoaXRlbS5ncmFwaCwgaXRlbSkuaW4ocHJlZGljYXRlKS5ub2RlcygpLm1hcChmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIG5vZGVHcmFwaChtYXRjaCwgaXRlbS5ncmFwaCwgaXRlbS5ncmFwaElyaSlcbiAgICAgIH0pKVxuICAgIH0pXG5cbiAgICByZXR1cm4gY2xvd25mYWNlLlN0b3JlKHN0b3JlLCBtYXRjaGVzKVxuICB9XG5cbiAgdGhpcy5vdXQgPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBbXVxuXG4gICAgdGhpcy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIG1hdGNoZXMgPSBtYXRjaGVzLmNvbmNhdChjbG93bmZhY2UuR3JhcGgoaXRlbS5ncmFwaCwgaXRlbSkub3V0KHByZWRpY2F0ZSkubm9kZXMoKS5tYXAoZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBub2RlR3JhcGgobWF0Y2gsIGl0ZW0uZ3JhcGgsIGl0ZW0uZ3JhcGhJcmkpXG4gICAgICB9KSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGNsb3duZmFjZS5TdG9yZShzdG9yZSwgbWF0Y2hlcylcbiAgfVxuXG4gIHRoaXMuanVtcCA9IGZ1bmN0aW9uICh0aGVuKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMubm9kZXMoKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBzdG9yZS5ncmFwaChpdGVtLm5vbWluYWxWYWx1ZSkudGhlbihmdW5jdGlvbiAoZ3JhcGgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGVHcmFwaChpdGVtLCBncmFwaCwgaXRlbS5ub21pbmFsVmFsdWUpXG4gICAgICB9KVxuICAgIH0pKS50aGVuKGZ1bmN0aW9uIChlbnRyaWVzKSB7XG4gICAgICBpZiAodGhlbikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoZW4oY2xvd25mYWNlLlN0b3JlKHN0b3JlLCBlbnRyaWVzKSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY2xvd25mYWNlLlN0b3JlKHN0b3JlLCBlbnRyaWVzKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB0aGlzLm5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0XG4gIH1cblxuICB0aGlzLmxpdGVyYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0XG4gICAgICAubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLm5vbWluYWxWYWx1ZVxuICAgICAgfSlcbiAgfVxuXG4gIHRoaXMudG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlcygpLm1hcChmdW5jdGlvbiAobm9kZSkge1xuICAgICAgcmV0dXJuIGNsb3duZmFjZS5TdG9yZShzdG9yZSwgbm9kZSlcbiAgICB9KVxuICB9XG5cbiAgdGhpcy5mb3JFYWNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMudG9BcnJheSgpLmZvckVhY2goY2FsbGJhY2spXG4gIH1cblxuICB0aGlzLm1hcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLnRvQXJyYXkoKS5tYXAoY2FsbGJhY2spXG4gIH1cblxuICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmxpdGVyYWwoKS5qb2luKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb3duZmFjZVxuIiwiLyohXG4gKiBtdXN0YWNoZS5qcyAtIExvZ2ljLWxlc3Mge3ttdXN0YWNoZX19IHRlbXBsYXRlcyB3aXRoIEphdmFTY3JpcHRcbiAqIGh0dHA6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanNcbiAqL1xuXG4vKmdsb2JhbCBkZWZpbmU6IGZhbHNlIE11c3RhY2hlOiB0cnVlKi9cblxuKGZ1bmN0aW9uIGRlZmluZU11c3RhY2hlIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiBleHBvcnRzICYmIHR5cGVvZiBleHBvcnRzLm5vZGVOYW1lICE9PSAnc3RyaW5nJykge1xuICAgIGZhY3RvcnkoZXhwb3J0cyk7IC8vIENvbW1vbkpTXG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTsgLy8gQU1EXG4gIH0gZWxzZSB7XG4gICAgZ2xvYmFsLk11c3RhY2hlID0ge307XG4gICAgZmFjdG9yeShNdXN0YWNoZSk7IC8vIHNjcmlwdCwgd3NoLCBhc3BcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiBtdXN0YWNoZUZhY3RvcnkgKG11c3RhY2hlKSB7XG5cbiAgdmFyIG9iamVjdFRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIGlzQXJyYXlQb2x5ZmlsbCAob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdFRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICBmdW5jdGlvbiBpc0Z1bmN0aW9uIChvYmplY3QpIHtcbiAgICByZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3JlIGNvcnJlY3QgdHlwZW9mIHN0cmluZyBoYW5kbGluZyBhcnJheVxuICAgKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICAgKi9cbiAgZnVuY3Rpb24gdHlwZVN0ciAob2JqKSB7XG4gICAgcmV0dXJuIGlzQXJyYXkob2JqKSA/ICdhcnJheScgOiB0eXBlb2Ygb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gZXNjYXBlUmVnRXhwIChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1tcXC1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG4gIH1cblxuICAvKipcbiAgICogTnVsbCBzYWZlIHdheSBvZiBjaGVja2luZyB3aGV0aGVyIG9yIG5vdCBhbiBvYmplY3QsXG4gICAqIGluY2x1ZGluZyBpdHMgcHJvdG90eXBlLCBoYXMgYSBnaXZlbiBwcm9wZXJ0eVxuICAgKi9cbiAgZnVuY3Rpb24gaGFzUHJvcGVydHkgKG9iaiwgcHJvcE5hbWUpIHtcbiAgICByZXR1cm4gb2JqICE9IG51bGwgJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgKHByb3BOYW1lIGluIG9iaik7XG4gIH1cblxuICAvLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2lzc3Vlcy5hcGFjaGUub3JnL2ppcmEvYnJvd3NlL0NPVUNIREItNTc3XG4gIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vamFubC9tdXN0YWNoZS5qcy9pc3N1ZXMvMTg5XG4gIHZhciByZWdFeHBUZXN0ID0gUmVnRXhwLnByb3RvdHlwZS50ZXN0O1xuICBmdW5jdGlvbiB0ZXN0UmVnRXhwIChyZSwgc3RyaW5nKSB7XG4gICAgcmV0dXJuIHJlZ0V4cFRlc3QuY2FsbChyZSwgc3RyaW5nKTtcbiAgfVxuXG4gIHZhciBub25TcGFjZVJlID0gL1xcUy87XG4gIGZ1bmN0aW9uIGlzV2hpdGVzcGFjZSAoc3RyaW5nKSB7XG4gICAgcmV0dXJuICF0ZXN0UmVnRXhwKG5vblNwYWNlUmUsIHN0cmluZyk7XG4gIH1cblxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMzk7JyxcbiAgICAnLyc6ICcmI3gyRjsnXG4gIH07XG5cbiAgZnVuY3Rpb24gZXNjYXBlSHRtbCAoc3RyaW5nKSB7XG4gICAgcmV0dXJuIFN0cmluZyhzdHJpbmcpLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIGZ1bmN0aW9uIGZyb21FbnRpdHlNYXAgKHMpIHtcbiAgICAgIHJldHVybiBlbnRpdHlNYXBbc107XG4gICAgfSk7XG4gIH1cblxuICB2YXIgd2hpdGVSZSA9IC9cXHMqLztcbiAgdmFyIHNwYWNlUmUgPSAvXFxzKy87XG4gIHZhciBlcXVhbHNSZSA9IC9cXHMqPS87XG4gIHZhciBjdXJseVJlID0gL1xccypcXH0vO1xuICB2YXIgdGFnUmUgPSAvI3xcXF58XFwvfD58XFx7fCZ8PXwhLztcblxuICAvKipcbiAgICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAgICogYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvIHN0cmluZyB2YWx1ZXM6IHRoZVxuICAgKiBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy4gWyBcIjwlXCIsIFwiJT5cIiBdKS4gT2ZcbiAgICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICAgKlxuICAgKiBBIHRva2VuIGlzIGFuIGFycmF5IHdpdGggYXQgbGVhc3QgNCBlbGVtZW50cy4gVGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlXG4gICAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gICAqIGRpZCBub3QgY29udGFpbiBhIHN5bWJvbCAoaS5lLiB7e215VmFsdWV9fSkgdGhpcyBlbGVtZW50IGlzIFwibmFtZVwiLiBGb3JcbiAgICogYWxsIHRleHQgdGhhdCBhcHBlYXJzIG91dHNpZGUgYSBzeW1ib2wgdGhpcyBlbGVtZW50IGlzIFwidGV4dFwiLlxuICAgKlxuICAgKiBUaGUgc2Vjb25kIGVsZW1lbnQgb2YgYSB0b2tlbiBpcyBpdHMgXCJ2YWx1ZVwiLiBGb3IgbXVzdGFjaGUgdGFncyB0aGlzIGlzXG4gICAqIHdoYXRldmVyIGVsc2Ugd2FzIGluc2lkZSB0aGUgdGFnIGJlc2lkZXMgdGhlIG9wZW5pbmcgc3ltYm9sLiBGb3IgdGV4dCB0b2tlbnNcbiAgICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gICAqXG4gICAqIFRoZSB0aGlyZCBhbmQgZm91cnRoIGVsZW1lbnRzIG9mIHRoZSB0b2tlbiBhcmUgdGhlIHN0YXJ0IGFuZCBlbmQgaW5kaWNlcyxcbiAgICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKlxuICAgKiBUb2tlbnMgdGhhdCBhcmUgdGhlIHJvb3Qgbm9kZSBvZiBhIHN1YnRyZWUgY29udGFpbiB0d28gbW9yZSBlbGVtZW50czogMSkgYW5cbiAgICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gICAqIHdoaWNoIHRoZSBjbG9zaW5nIHRhZyBmb3IgdGhhdCBzZWN0aW9uIGJlZ2lucy5cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUgKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgaWYgKCF0ZW1wbGF0ZSlcbiAgICAgIHJldHVybiBbXTtcblxuICAgIHZhciBzZWN0aW9ucyA9IFtdOyAgICAgLy8gU3RhY2sgdG8gaG9sZCBzZWN0aW9uIHRva2Vuc1xuICAgIHZhciB0b2tlbnMgPSBbXTsgICAgICAgLy8gQnVmZmVyIHRvIGhvbGQgdGhlIHRva2Vuc1xuICAgIHZhciBzcGFjZXMgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgdmFyIGhhc1RhZyA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIHt7dGFnfX0gb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICB2YXIgbm9uU3BhY2UgPSBmYWxzZTsgIC8vIElzIHRoZXJlIGEgbm9uLXNwYWNlIGNoYXIgb24gdGhlIGN1cnJlbnQgbGluZT9cblxuICAgIC8vIFN0cmlwcyBhbGwgd2hpdGVzcGFjZSB0b2tlbnMgYXJyYXkgZm9yIHRoZSBjdXJyZW50IGxpbmVcbiAgICAvLyBpZiB0aGVyZSB3YXMgYSB7eyN0YWd9fSBvbiBpdCBhbmQgb3RoZXJ3aXNlIG9ubHkgc3BhY2UuXG4gICAgZnVuY3Rpb24gc3RyaXBTcGFjZSAoKSB7XG4gICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICB3aGlsZSAoc3BhY2VzLmxlbmd0aClcbiAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGFjZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICBub25TcGFjZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBvcGVuaW5nVGFnUmUsIGNsb3NpbmdUYWdSZSwgY2xvc2luZ0N1cmx5UmU7XG4gICAgZnVuY3Rpb24gY29tcGlsZVRhZ3MgKHRhZ3NUb0NvbXBpbGUpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFnc1RvQ29tcGlsZSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHRhZ3NUb0NvbXBpbGUgPSB0YWdzVG9Db21waWxlLnNwbGl0KHNwYWNlUmUsIDIpO1xuXG4gICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgdGFnc1RvQ29tcGlsZS5sZW5ndGggIT09IDIpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0YWdzOiAnICsgdGFnc1RvQ29tcGlsZSk7XG5cbiAgICAgIG9wZW5pbmdUYWdSZSA9IG5ldyBSZWdFeHAoZXNjYXBlUmVnRXhwKHRhZ3NUb0NvbXBpbGVbMF0pICsgJ1xcXFxzKicpO1xuICAgICAgY2xvc2luZ1RhZ1JlID0gbmV3IFJlZ0V4cCgnXFxcXHMqJyArIGVzY2FwZVJlZ0V4cCh0YWdzVG9Db21waWxlWzFdKSk7XG4gICAgICBjbG9zaW5nQ3VybHlSZSA9IG5ldyBSZWdFeHAoJ1xcXFxzKicgKyBlc2NhcGVSZWdFeHAoJ30nICsgdGFnc1RvQ29tcGlsZVsxXSkpO1xuICAgIH1cblxuICAgIGNvbXBpbGVUYWdzKHRhZ3MgfHwgbXVzdGFjaGUudGFncyk7XG5cbiAgICB2YXIgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIHZhciBzdGFydCwgdHlwZSwgdmFsdWUsIGNociwgdG9rZW4sIG9wZW5TZWN0aW9uO1xuICAgIHdoaWxlICghc2Nhbm5lci5lb3MoKSkge1xuICAgICAgc3RhcnQgPSBzY2FubmVyLnBvcztcblxuICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChvcGVuaW5nVGFnUmUpO1xuXG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHZhbHVlTGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpIDwgdmFsdWVMZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNociA9IHZhbHVlLmNoYXJBdChpKTtcblxuICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY2hyKSkge1xuICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0b2tlbnMucHVzaChbICd0ZXh0JywgY2hyLCBzdGFydCwgc3RhcnQgKyAxIF0pO1xuICAgICAgICAgIHN0YXJ0ICs9IDE7XG5cbiAgICAgICAgICAvLyBDaGVjayBmb3Igd2hpdGVzcGFjZSBvbiB0aGUgY3VycmVudCBsaW5lLlxuICAgICAgICAgIGlmIChjaHIgPT09ICdcXG4nKVxuICAgICAgICAgICAgc3RyaXBTcGFjZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE1hdGNoIHRoZSBvcGVuaW5nIHRhZy5cbiAgICAgIGlmICghc2Nhbm5lci5zY2FuKG9wZW5pbmdUYWdSZSkpXG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBoYXNUYWcgPSB0cnVlO1xuXG4gICAgICAvLyBHZXQgdGhlIHRhZyB0eXBlLlxuICAgICAgdHlwZSA9IHNjYW5uZXIuc2Nhbih0YWdSZSkgfHwgJ25hbWUnO1xuICAgICAgc2Nhbm5lci5zY2FuKHdoaXRlUmUpO1xuXG4gICAgICAvLyBHZXQgdGhlIHRhZyB2YWx1ZS5cbiAgICAgIGlmICh0eXBlID09PSAnPScpIHtcbiAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChlcXVhbHNSZSk7XG4gICAgICAgIHNjYW5uZXIuc2NhbihlcXVhbHNSZSk7XG4gICAgICAgIHNjYW5uZXIuc2NhblVudGlsKGNsb3NpbmdUYWdSZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd7Jykge1xuICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKGNsb3NpbmdDdXJseVJlKTtcbiAgICAgICAgc2Nhbm5lci5zY2FuKGN1cmx5UmUpO1xuICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChjbG9zaW5nVGFnUmUpO1xuICAgICAgICB0eXBlID0gJyYnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChjbG9zaW5nVGFnUmUpO1xuICAgICAgfVxuXG4gICAgICAvLyBNYXRjaCB0aGUgY2xvc2luZyB0YWcuXG4gICAgICBpZiAoIXNjYW5uZXIuc2NhbihjbG9zaW5nVGFnUmUpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHRhZyBhdCAnICsgc2Nhbm5lci5wb3MpO1xuXG4gICAgICB0b2tlbiA9IFsgdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvcyBdO1xuICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICBpZiAodHlwZSA9PT0gJyMnIHx8IHR5cGUgPT09ICdeJykge1xuICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy8nKSB7XG4gICAgICAgIC8vIENoZWNrIHNlY3Rpb24gbmVzdGluZy5cbiAgICAgICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcblxuICAgICAgICBpZiAoIW9wZW5TZWN0aW9uKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5vcGVuZWQgc2VjdGlvbiBcIicgKyB2YWx1ZSArICdcIiBhdCAnICsgc3RhcnQpO1xuXG4gICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmNsb3NlZCBzZWN0aW9uIFwiJyArIG9wZW5TZWN0aW9uWzFdICsgJ1wiIGF0ICcgKyBzdGFydCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICduYW1lJyB8fCB0eXBlID09PSAneycgfHwgdHlwZSA9PT0gJyYnKSB7XG4gICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJz0nKSB7XG4gICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgIGNvbXBpbGVUYWdzKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIG5vIG9wZW4gc2VjdGlvbnMgd2hlbiB3ZSdyZSBkb25lLlxuICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICBpZiAob3BlblNlY3Rpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHNlY3Rpb24gXCInICsgb3BlblNlY3Rpb25bMV0gKyAnXCIgYXQgJyArIHNjYW5uZXIucG9zKTtcblxuICAgIHJldHVybiBuZXN0VG9rZW5zKHNxdWFzaFRva2Vucyh0b2tlbnMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyB0aGUgdmFsdWVzIG9mIGNvbnNlY3V0aXZlIHRleHQgdG9rZW5zIGluIHRoZSBnaXZlbiBgdG9rZW5zYCBhcnJheVxuICAgKiB0byBhIHNpbmdsZSB0b2tlbi5cbiAgICovXG4gIGZ1bmN0aW9uIHNxdWFzaFRva2VucyAodG9rZW5zKSB7XG4gICAgdmFyIHNxdWFzaGVkVG9rZW5zID0gW107XG5cbiAgICB2YXIgdG9rZW4sIGxhc3RUb2tlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbnVtVG9rZW5zID0gdG9rZW5zLmxlbmd0aDsgaSA8IG51bVRva2VuczsgKytpKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcblxuICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlblswXSA9PT0gJ3RleHQnICYmIGxhc3RUb2tlbiAmJiBsYXN0VG9rZW5bMF0gPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGxhc3RUb2tlblsxXSArPSB0b2tlblsxXTtcbiAgICAgICAgICBsYXN0VG9rZW5bM10gPSB0b2tlblszXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2VucztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICAgKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gICAqIGFsbCB0b2tlbnMgdGhhdCBhcHBlYXIgaW4gdGhhdCBzZWN0aW9uIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsXG4gICAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIG5lc3RUb2tlbnMgKHRva2Vucykge1xuICAgIHZhciBuZXN0ZWRUb2tlbnMgPSBbXTtcbiAgICB2YXIgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIHZhciBzZWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIHRva2VuLCBzZWN0aW9uO1xuICAgIGZvciAodmFyIGkgPSAwLCBudW1Ub2tlbnMgPSB0b2tlbnMubGVuZ3RoOyBpIDwgbnVtVG9rZW5zOyArK2kpIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuXG4gICAgICBzd2l0Y2ggKHRva2VuWzBdKSB7XG4gICAgICBjYXNlICcjJzpcbiAgICAgIGNhc2UgJ14nOlxuICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgIHNlY3Rpb25zLnB1c2godG9rZW4pO1xuICAgICAgICBjb2xsZWN0b3IgPSB0b2tlbls0XSA9IFtdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJy8nOlxuICAgICAgICBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG4gICAgICAgIHNlY3Rpb25bNV0gPSB0b2tlblsyXTtcbiAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWzRdIDogbmVzdGVkVG9rZW5zO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdGVkVG9rZW5zO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgc2ltcGxlIHN0cmluZyBzY2FubmVyIHRoYXQgaXMgdXNlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyIHRvIGZpbmRcbiAgICogdG9rZW5zIGluIHRlbXBsYXRlIHN0cmluZ3MuXG4gICAqL1xuICBmdW5jdGlvbiBTY2FubmVyIChzdHJpbmcpIHtcbiAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcbiAgICB0aGlzLnRhaWwgPSBzdHJpbmc7XG4gICAgdGhpcy5wb3MgPSAwO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYHRydWVgIGlmIHRoZSB0YWlsIGlzIGVtcHR5IChlbmQgb2Ygc3RyaW5nKS5cbiAgICovXG4gIFNjYW5uZXIucHJvdG90eXBlLmVvcyA9IGZ1bmN0aW9uIGVvcyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGFpbCA9PT0gJyc7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRyaWVzIHRvIG1hdGNoIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAqIFJldHVybnMgdGhlIG1hdGNoZWQgdGV4dCBpZiBpdCBjYW4gbWF0Y2gsIHRoZSBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICAgKi9cbiAgU2Nhbm5lci5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIHNjYW4gKHJlKSB7XG4gICAgdmFyIG1hdGNoID0gdGhpcy50YWlsLm1hdGNoKHJlKTtcblxuICAgIGlmICghbWF0Y2ggfHwgbWF0Y2guaW5kZXggIT09IDApXG4gICAgICByZXR1cm4gJyc7XG5cbiAgICB2YXIgc3RyaW5nID0gbWF0Y2hbMF07XG5cbiAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwuc3Vic3RyaW5nKHN0cmluZy5sZW5ndGgpO1xuICAgIHRoaXMucG9zICs9IHN0cmluZy5sZW5ndGg7XG5cbiAgICByZXR1cm4gc3RyaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAqIHRoZSBza2lwcGVkIHN0cmluZywgd2hpY2ggaXMgdGhlIGVudGlyZSB0YWlsIGlmIG5vIG1hdGNoIGNhbiBiZSBtYWRlLlxuICAgKi9cbiAgU2Nhbm5lci5wcm90b3R5cGUuc2NhblVudGlsID0gZnVuY3Rpb24gc2NhblVudGlsIChyZSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMudGFpbC5zZWFyY2gocmUpLCBtYXRjaDtcblxuICAgIHN3aXRjaCAoaW5kZXgpIHtcbiAgICBjYXNlIC0xOlxuICAgICAgbWF0Y2ggPSB0aGlzLnRhaWw7XG4gICAgICB0aGlzLnRhaWwgPSAnJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMDpcbiAgICAgIG1hdGNoID0gJyc7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbWF0Y2ggPSB0aGlzLnRhaWwuc3Vic3RyaW5nKDAsIGluZGV4KTtcbiAgICAgIHRoaXMudGFpbCA9IHRoaXMudGFpbC5zdWJzdHJpbmcoaW5kZXgpO1xuICAgIH1cblxuICAgIHRoaXMucG9zICs9IG1hdGNoLmxlbmd0aDtcblxuICAgIHJldHVybiBtYXRjaDtcbiAgfTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHJlbmRlcmluZyBjb250ZXh0IGJ5IHdyYXBwaW5nIGEgdmlldyBvYmplY3QgYW5kXG4gICAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAgICovXG4gIGZ1bmN0aW9uIENvbnRleHQgKHZpZXcsIHBhcmVudENvbnRleHQpIHtcbiAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICAgIHRoaXMuY2FjaGUgPSB7ICcuJzogdGhpcy52aWV3IH07XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnRDb250ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY29udGV4dCB1c2luZyB0aGUgZ2l2ZW4gdmlldyB3aXRoIHRoaXMgY29udGV4dFxuICAgKiBhcyB0aGUgcGFyZW50LlxuICAgKi9cbiAgQ29udGV4dC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIHB1c2ggKHZpZXcpIHtcbiAgICByZXR1cm4gbmV3IENvbnRleHQodmlldywgdGhpcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgKiB1cCB0aGUgY29udGV4dCBoaWVyYXJjaHkgaWYgdGhlIHZhbHVlIGlzIGFic2VudCBpbiB0aGlzIGNvbnRleHQncyB2aWV3LlxuICAgKi9cbiAgQ29udGV4dC5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gbG9va3VwIChuYW1lKSB7XG4gICAgdmFyIGNhY2hlID0gdGhpcy5jYWNoZTtcblxuICAgIHZhciB2YWx1ZTtcbiAgICBpZiAoY2FjaGUuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIHZhbHVlID0gY2FjaGVbbmFtZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgbmFtZXMsIGluZGV4LCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgaWYgKG5hbWUuaW5kZXhPZignLicpID4gMCkge1xuICAgICAgICAgIHZhbHVlID0gY29udGV4dC52aWV3O1xuICAgICAgICAgIG5hbWVzID0gbmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIFVzaW5nIHRoZSBkb3Qgbm90aW9uIHBhdGggaW4gYG5hbWVgLCB3ZSBkZXNjZW5kIHRocm91Z2ggdGhlXG4gICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBUbyBiZSBjZXJ0YWluIHRoYXQgdGhlIGxvb2t1cCBoYXMgYmVlbiBzdWNjZXNzZnVsLCB3ZSBoYXZlIHRvXG4gICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgKiB3ZSBhcmUgbG9va2luZyBmb3IuIFdlIHN0b3JlIHRoZSByZXN1bHQgaW4gYGxvb2t1cEhpdGAuXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAqIGB1bmRlZmluZWRgIGFuZCB3ZSB3YW50IHRvIGF2b2lkIGxvb2tpbmcgdXAgcGFyZW50IGNvbnRleHRzLlxuICAgICAgICAgICAqKi9cbiAgICAgICAgICB3aGlsZSAodmFsdWUgIT0gbnVsbCAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKVxuICAgICAgICAgICAgICBsb29rdXBIaXQgPSBoYXNQcm9wZXJ0eSh2YWx1ZSwgbmFtZXNbaW5kZXhdKTtcblxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVtuYW1lc1tpbmRleCsrXV07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gY29udGV4dC52aWV3W25hbWVdO1xuICAgICAgICAgIGxvb2t1cEhpdCA9IGhhc1Byb3BlcnR5KGNvbnRleHQudmlldywgbmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobG9va3VwSGl0KVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNvbnRleHQgPSBjb250ZXh0LnBhcmVudDtcbiAgICAgIH1cblxuICAgICAgY2FjaGVbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpXG4gICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwodGhpcy52aWV3KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQSBXcml0ZXIga25vd3MgaG93IHRvIHRha2UgYSBzdHJlYW0gb2YgdG9rZW5zIGFuZCByZW5kZXIgdGhlbSB0byBhXG4gICAqIHN0cmluZywgZ2l2ZW4gYSBjb250ZXh0LiBJdCBhbHNvIG1haW50YWlucyBhIGNhY2hlIG9mIHRlbXBsYXRlcyB0b1xuICAgKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAgICovXG4gIGZ1bmN0aW9uIFdyaXRlciAoKSB7XG4gICAgdGhpcy5jYWNoZSA9IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyBhbGwgY2FjaGVkIHRlbXBsYXRlcyBpbiB0aGlzIHdyaXRlci5cbiAgICovXG4gIFdyaXRlci5wcm90b3R5cGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIGNsZWFyQ2FjaGUgKCkge1xuICAgIHRoaXMuY2FjaGUgPSB7fTtcbiAgfTtcblxuICAvKipcbiAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYW5kIHJldHVybnMgdGhlIGFycmF5IG9mIHRva2Vuc1xuICAgKiB0aGF0IGlzIGdlbmVyYXRlZCBmcm9tIHRoZSBwYXJzZS5cbiAgICovXG4gIFdyaXRlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAodGVtcGxhdGUsIHRhZ3MpIHtcbiAgICB2YXIgY2FjaGUgPSB0aGlzLmNhY2hlO1xuICAgIHZhciB0b2tlbnMgPSBjYWNoZVt0ZW1wbGF0ZV07XG5cbiAgICBpZiAodG9rZW5zID09IG51bGwpXG4gICAgICB0b2tlbnMgPSBjYWNoZVt0ZW1wbGF0ZV0gPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCB0YWdzKTtcblxuICAgIHJldHVybiB0b2tlbnM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZ2gtbGV2ZWwgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byByZW5kZXIgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgd2l0aFxuICAgKiB0aGUgZ2l2ZW4gYHZpZXdgLlxuICAgKlxuICAgKiBUaGUgb3B0aW9uYWwgYHBhcnRpYWxzYCBhcmd1bWVudCBtYXkgYmUgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG4gICAqIG5hbWVzIGFuZCB0ZW1wbGF0ZXMgb2YgcGFydGlhbHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgdGVtcGxhdGUuIEl0IG1heVxuICAgKiBhbHNvIGJlIGEgZnVuY3Rpb24gdGhhdCBpcyB1c2VkIHRvIGxvYWQgcGFydGlhbCB0ZW1wbGF0ZXMgb24gdGhlIGZseVxuICAgKiB0aGF0IHRha2VzIGEgc2luZ2xlIGFyZ3VtZW50OiB0aGUgbmFtZSBvZiB0aGUgcGFydGlhbC5cbiAgICovXG4gIFdyaXRlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gcmVuZGVyICh0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpIHtcbiAgICB2YXIgdG9rZW5zID0gdGhpcy5wYXJzZSh0ZW1wbGF0ZSk7XG4gICAgdmFyIGNvbnRleHQgPSAodmlldyBpbnN0YW5jZW9mIENvbnRleHQpID8gdmlldyA6IG5ldyBDb250ZXh0KHZpZXcpO1xuICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCB0ZW1wbGF0ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgKlxuICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgKiBJZiB0aGUgdGVtcGxhdGUgZG9lc24ndCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLCB0aGlzIGFyZ3VtZW50IG1heVxuICAgKiBiZSBvbWl0dGVkLlxuICAgKi9cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJUb2tlbnMgPSBmdW5jdGlvbiByZW5kZXJUb2tlbnMgKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICB2YXIgYnVmZmVyID0gJyc7XG5cbiAgICB2YXIgdG9rZW4sIHN5bWJvbCwgdmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDAsIG51bVRva2VucyA9IHRva2Vucy5sZW5ndGg7IGkgPCBudW1Ub2tlbnM7ICsraSkge1xuICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgIHN5bWJvbCA9IHRva2VuWzBdO1xuXG4gICAgICBpZiAoc3ltYm9sID09PSAnIycpIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICBlbHNlIGlmIChzeW1ib2wgPT09ICdeJykgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICBlbHNlIGlmIChzeW1ib2wgPT09ICc+JykgdmFsdWUgPSB0aGlzLnJlbmRlclBhcnRpYWwodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgIGVsc2UgaWYgKHN5bWJvbCA9PT0gJyYnKSB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAnbmFtZScpIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAndGV4dCcpIHZhbHVlID0gdGhpcy5yYXdWYWx1ZSh0b2tlbik7XG5cbiAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLnJlbmRlclNlY3Rpb24gPSBmdW5jdGlvbiByZW5kZXJTZWN0aW9uICh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGJ1ZmZlciA9ICcnO1xuICAgIHZhciB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWzFdKTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByZW5kZXIgYW4gYXJiaXRyYXJ5IHRlbXBsYXRlXG4gICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgZnVuY3Rpb24gc3ViUmVuZGVyICh0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgfVxuXG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMCwgdmFsdWVMZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGogPCB2YWx1ZUxlbmd0aDsgKytqKSB7XG4gICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dC5wdXNoKHZhbHVlW2pdKSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dC5wdXNoKHZhbHVlKSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3JpZ2luYWxUZW1wbGF0ZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMgd2l0aG91dCB0aGUgb3JpZ2luYWwgdGVtcGxhdGUnKTtcblxuICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bM10sIHRva2VuWzVdKSwgc3ViUmVuZGVyKTtcblxuICAgICAgaWYgKHZhbHVlICE9IG51bGwpXG4gICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWzRdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgfVxuICAgIHJldHVybiBidWZmZXI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJJbnZlcnRlZCA9IGZ1bmN0aW9uIHJlbmRlckludmVydGVkICh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblsxXSk7XG5cbiAgICAvLyBVc2UgSmF2YVNjcmlwdCdzIGRlZmluaXRpb24gb2YgZmFsc3kuIEluY2x1ZGUgZW1wdHkgYXJyYXlzLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vamFubC9tdXN0YWNoZS5qcy9pc3N1ZXMvMTg2XG4gICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSlcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUucmVuZGVyUGFydGlhbCA9IGZ1bmN0aW9uIHJlbmRlclBhcnRpYWwgKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscykge1xuICAgIGlmICghcGFydGlhbHMpIHJldHVybjtcblxuICAgIHZhciB2YWx1ZSA9IGlzRnVuY3Rpb24ocGFydGlhbHMpID8gcGFydGlhbHModG9rZW5bMV0pIDogcGFydGlhbHNbdG9rZW5bMV1dO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKVxuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRoaXMucGFyc2UodmFsdWUpLCBjb250ZXh0LCBwYXJ0aWFscywgdmFsdWUpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUudW5lc2NhcGVkVmFsdWUgPSBmdW5jdGlvbiB1bmVzY2FwZWRWYWx1ZSAodG9rZW4sIGNvbnRleHQpIHtcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblsxXSk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpXG4gICAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5lc2NhcGVkVmFsdWUgPSBmdW5jdGlvbiBlc2NhcGVkVmFsdWUgKHRva2VuLCBjb250ZXh0KSB7XG4gICAgdmFyIHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bMV0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKVxuICAgICAgcmV0dXJuIG11c3RhY2hlLmVzY2FwZSh2YWx1ZSk7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yYXdWYWx1ZSA9IGZ1bmN0aW9uIHJhd1ZhbHVlICh0b2tlbikge1xuICAgIHJldHVybiB0b2tlblsxXTtcbiAgfTtcblxuICBtdXN0YWNoZS5uYW1lID0gJ211c3RhY2hlLmpzJztcbiAgbXVzdGFjaGUudmVyc2lvbiA9ICcyLjIuMCc7XG4gIG11c3RhY2hlLnRhZ3MgPSBbICd7eycsICd9fScgXTtcblxuICAvLyBBbGwgaGlnaC1sZXZlbCBtdXN0YWNoZS4qIGZ1bmN0aW9ucyB1c2UgdGhpcyB3cml0ZXIuXG4gIHZhciBkZWZhdWx0V3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4gIC8qKlxuICAgKiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gdGhlIGRlZmF1bHQgd3JpdGVyLlxuICAgKi9cbiAgbXVzdGFjaGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIGNsZWFyQ2FjaGUgKCkge1xuICAgIHJldHVybiBkZWZhdWx0V3JpdGVyLmNsZWFyQ2FjaGUoKTtcbiAgfTtcblxuICAvKipcbiAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIHRlbXBsYXRlIGluIHRoZSBkZWZhdWx0IHdyaXRlciBhbmQgcmV0dXJucyB0aGVcbiAgICogYXJyYXkgb2YgdG9rZW5zIGl0IGNvbnRhaW5zLiBEb2luZyB0aGlzIGFoZWFkIG9mIHRpbWUgYXZvaWRzIHRoZSBuZWVkIHRvXG4gICAqIHBhcnNlIHRlbXBsYXRlcyBvbiB0aGUgZmx5IGFzIHRoZXkgYXJlIHJlbmRlcmVkLlxuICAgKi9cbiAgbXVzdGFjaGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAodGVtcGxhdGUsIHRhZ3MpIHtcbiAgICByZXR1cm4gZGVmYXVsdFdyaXRlci5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIGB0ZW1wbGF0ZWAgd2l0aCB0aGUgZ2l2ZW4gYHZpZXdgIGFuZCBgcGFydGlhbHNgIHVzaW5nIHRoZVxuICAgKiBkZWZhdWx0IHdyaXRlci5cbiAgICovXG4gIG11c3RhY2hlLnJlbmRlciA9IGZ1bmN0aW9uIHJlbmRlciAodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzKSB7XG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdGVtcGxhdGUhIFRlbXBsYXRlIHNob3VsZCBiZSBhIFwic3RyaW5nXCIgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICdidXQgXCInICsgdHlwZVN0cih0ZW1wbGF0ZSkgKyAnXCIgd2FzIGdpdmVuIGFzIHRoZSBmaXJzdCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50IGZvciBtdXN0YWNoZSNyZW5kZXIodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzKScpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZhdWx0V3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpO1xuICB9O1xuXG4gIC8vIFRoaXMgaXMgaGVyZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCAwLjQueC4sXG4gIC8qZXNsaW50LWRpc2FibGUgKi8gLy8gZXNsaW50IHdhbnRzIGNhbWVsIGNhc2VkIGZ1bmN0aW9uIG5hbWVcbiAgbXVzdGFjaGUudG9faHRtbCA9IGZ1bmN0aW9uIHRvX2h0bWwgKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscywgc2VuZCkge1xuICAgIC8qZXNsaW50LWVuYWJsZSovXG5cbiAgICB2YXIgcmVzdWx0ID0gbXVzdGFjaGUucmVuZGVyKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscyk7XG5cbiAgICBpZiAoaXNGdW5jdGlvbihzZW5kKSkge1xuICAgICAgc2VuZChyZXN1bHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIGVzY2FwaW5nIGZ1bmN0aW9uIHNvIHRoYXQgdGhlIHVzZXIgbWF5IG92ZXJyaWRlIGl0LlxuICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanMvaXNzdWVzLzI0NFxuICBtdXN0YWNoZS5lc2NhcGUgPSBlc2NhcGVIdG1sO1xuXG4gIC8vIEV4cG9ydCB0aGVzZSBtYWlubHkgZm9yIHRlc3RpbmcsIGJ1dCBhbHNvIGZvciBhZHZhbmNlZCB1c2FnZS5cbiAgbXVzdGFjaGUuU2Nhbm5lciA9IFNjYW5uZXI7XG4gIG11c3RhY2hlLkNvbnRleHQgPSBDb250ZXh0O1xuICBtdXN0YWNoZS5Xcml0ZXIgPSBXcml0ZXI7XG5cbn0pKTtcbiJdfQ==
