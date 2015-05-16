/* global rdf, Mustache */


var rdf = require("rdf-ext")();
var Mustache = require("mustache");

rdf.setPrefix("r2h", "http://rdf2h.github.io/2015/rdf2h#");

function RDF2h(matcherGraph) {
    this.matcherGraph = matcherGraph;
    //use cf.in on r2h:Matcher create array of matchers
    var cf = rdf.cf.Graph(matcherGraph);
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
    console.log(this.matchers);
}

(function () {
    var origLokup = Mustache.Context.prototype.lookup;
    Mustache.Context.prototype.lookup = function (name) {
        if (this.view instanceof RDF2h.Renderee) {
            var rdf2h = this.view.rdf2h;
            var graphNode = this.view.graphNode;
            var graph = this.view.graph;
            var mode = this.view.mode;
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
            if (name.startsWith(":render ")) {
                var splits = name.split(" ");
                var nodePath = splits[1];
                var subMode = splits[2];
                if (!subMode) {
                    subMode = mode;
                }
                var resolvedNodes = resolvePath(nodePath);
                if (resolvedNodes.length > 1) {
                    console.log("Argument of render evaluates to more than one node!")
                }
                if (resolvedNodes.length > 0) {
                    return rdf2h.render(graph, resolvedNodes[0], subMode)
                } else {
                    return "";
                }
            }
            if (name.startsWith(":continue")) {
                var splits = name.split(" ");
                var subMode = splits[1];
                if (!subMode) {
                    subMode = mode;
                }
                if (graphNode.nodes().length > 1) {
                    console.log(":continue invoked in context with more than one node, this shouldn't be possible!")
                }
                return rdf2h.render(graph, graphNode.nodes()[0], subMode, currentMatcherIndex + 1);

            }
            if (name.startsWith("+")) {
                name = name.substring(1);
                return (resolvePath(name).length > 0);
            }
            var nodes = resolvePath(name);
            if (nodes.length === 1) {
                return new RDF2h.Renderee(rdf2h, graph, nodes[0], mode);
            } else {
                return nodes.map(function (node) {
                    return new RDF2h.Renderee(rdf2h, graph, node, mode);
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


RDF2h.Renderee = function (rdf2h, graph, node, mode) {
    if (!node) {
        throw "no node specficied!";
    }
    if (Object.prototype.toString.call(node) === '[object Array]') {
        throw "Renderee must be a single node";
    }
    this.rdf2h = rdf2h;
    this.graph = graph;
    this.node = node;
    this.mode = mode;
    var cf = rdf.cf.Graph(graph);
    this.graphNode = cf.node(node);
};

RDF2h.Renderee.prototype.toString = function () {
    return this.node.toString();
}

RDF2h.prototype.getTemplate = function (renderee) {
    var cf = rdf.cf.Graph(this.matcherGraph);

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
    function matches(cfMatcher) {
        var triplePatterns = cfMatcher.out("http://rdf2h.github.io/2015/rdf2h#triplePattern").nodes();
        for (var i = 0; i < triplePatterns.length; i++) {
            var cfTp = cf.node(triplePatterns[i]);
            if (!matchPattern(cfTp)) {
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
    for (var i = this.startMatcherIndex; i < this.matchers.length; i++) {
        var matcher = this.matchers[i];
        var cfMatcher = cf.node(matcher);
        if (matches(cfMatcher)) {
            renderee.currentMatcherIndex = i;
            //TODO check the context of template
            //r2h:template seems not to work here
            var templateNode = cfMatcher.
                    out("http://rdf2h.github.io/2015/rdf2h#template").
                    out("http://rdf2h.github.io/2015/rdf2h#mustache").
                    nodes()[0];
            if (templateNode.interfaceName === "NamedNode") {
                return resolveTemplateNode(templateNode.nominalValue)
            }
            return templateNode.toLocaleString();
        }
    }
    if (this.startMatcherIndex === 0) {
        return '<div class="missingTemplate">No template found for &lt;{{.}}&gt;</div>';
    } else {
        return '<div class="noMoreTemplate">No more template available for &lt;{{.}}&gt;</div>';
    }
}

RDF2h.prototype.render = function (graph, node, mode, startMatcherIndex) {
    //wrap all in one object that gets special care by lookup
    var renderee = new RDF2h.Renderee(this, graph, node, mode);
    if (!startMatcherIndex) {
        this.startMatcherIndex = 0;
    } else {
        this.startMatcherIndex = startMatcherIndex;
    }
    var template = this.getTemplate(renderee);
    return Mustache.render(template, renderee);
}

RDF2h.prefixMap = rdf.prefixes.addAll({
    "s": "http://schema.org/"
});

RDF2h.resolveCurie = function (curie) {
    console.log("resolving " + curie);
    var splits = curie.split(":");
    var prefix = splits[0];
    var suffix = splits[1];
    if (RDF2h.prefixMap[prefix]) {
        return RDF2h.prefixMap[prefix] + suffix;
    }

};

if (typeof window !== 'undefined') {
    window.RDF2h = RDF2h;
}

if (typeof module !== 'undefined') {
    module.exports = RDF2h;
}
