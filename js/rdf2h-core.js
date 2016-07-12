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
    function getLaterNodes(node, ancestorPath) {
        if (!ancestorPath) {
            ancestorPath = new Array();
            
        } else {   
            if (ancestorPath.some(function(e) {
                return node.equals(e);
            })) {
                RDF2h.logger.error("Circle Detected at "+node);
                ancestorPath.forEach(function(e) {
                    console.log(e);
                });
                return new Array();
            }
        }
        ancestorPath.push(node);
        var cfn = cf.node(node);
        
        var laterNodes = cfn.out("http://rdf2h.github.io/2015/rdf2h#before").nodes();
        for (var i = 0; i < laterNodes.length; i++) {
            var transitives = getLaterNodes(laterNodes[i], ancestorPath.slice(0));
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
        var laterNodes = getLaterNodes(matcherToPlace);
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
    RDF2h.logger.debug("Constructed RDF2h with the following matchers: ", this.matchers.map(function(m) {return m.toString();}));
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
                RDF2h.logger.debug("Matcher "+cfMatcher+" doesn't has triple patterns matching "+renderee.graphNode);
                return false;
            }
        }
        RDF2h.logger.debug("Matcher "+cfMatcher+" has triple patterns matching "+renderee.graphNode);
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
        return templateRenderer('<div class="missingTemplate">No template found for &lt;{{.}}&gt; in context &lt;'+renderee.context+'&gt;</div>');
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
