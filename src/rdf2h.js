import rdf, { sym, literal } from "ext-rdflib";
import GraphNode from "rdfgraphnode-rdfext";
import { Context, render as _render } from "mustache";
import { rdf2h as _rdf2h, rdf as _rdf, rdfs } from "./vocab.js";
var NodeSet = new Array();


function RDF2h(rendererGraphs, tbox) {
    function r2h(suffix) {
        return sym("http://rdf2h.github.io/2015/rdf2h#"+suffix);
    }
    if (!Array.isArray(rendererGraphs)) {
        rendererGraphs = [rendererGraphs];
    }
    if (tbox) {
        this.tbox = tbox;
    } else {
        this.tbox = rendererGraphs[0];
    }
    this.rendererGraphs = rendererGraphs.reverse();
    this.env = {}; //this is to allow shared vars among renderers
}


(function () {
    var r2h = _rdf2h;
    var origLokup = Context.prototype.lookup;
    Context.prototype.lookup = function (name) {
        if (this.view instanceof RDF2h.Renderee) {
            var rdf2h = this.view.rdf2h;
            var graphNode = this.view.graphNode;
            var graph = graphNode.graph;
            var context = this.view.context;
            function resolvePath(path) {
                function resolveSubPath(node, pathSections) {
                    function resolveSection(section) {
                        if (section === ".") {
                            return node;
                        } else {
                            if (section.endsWith("<-")) {
                                return node.in(RDF2h.resolveCurie(section.substring(0, section.length - 2)));
                            } else {
                                if (section.startsWith("^")) {
                                    return node.in(RDF2h.resolveCurie(section.substring(1)));
                                } else {
                                    return node.out(RDF2h.resolveCurie(section));
                                }
                            }
                        }
                    }
                    let subNode = resolveSection(pathSections[0]);
                    if (pathSections.length === 1) {
                        var resultNodes = subNode.nodes;
                        if (resultNodes.length === 0) {
                            //handling pseudo properties of literals
                            if (node.nodes[0].language) {
                                if (RDF2h.resolveCurie(pathSections[0]).equals(rdf.sym("http://purl.org/dc/terms/language"))) {
                                    return [rdf.literal(node.nodes[0].language)];
                                }
                            }
                            if (node.nodes[0].datatype) {
                                if (RDF2h.resolveCurie(pathSections[0]).equals(RDF2h.resolveCurie("rdf:type"))) {
                                    return [node.nodes[0].datatype];
                                }
                            }
                        }
                        return resultNodes;
                    }
                    return resolveSubPath(subNode,pathSections.slice(1))    
                }
                function splitPathSection(string) {
                    let result = [];
                    let readingURI = false;
                    let lastCharLess = false;
                    let section = "";
                    function nextSection() {
                        if (section.length > 0) {
                            result.push(section);
                            section = "";    
                        }
                    }
                    for (var pos = 0; pos < string.length; pos++) {    
                        let c = string[pos];
                        if (lastCharLess) {
                            if (c !== "-") {
                                nextSection();
                                readingURI = true;
                            }
                            section += "<";
                            lastCharLess = false;
                        }
                        if (c === "<") {
                            lastCharLess = true;
                            continue;
                        }
                        if (readingURI && (c == ">")) {
                            section += c;
                            nextSection();
                            readingURI = false;
                            continue;
                        }
                        if (!readingURI && (c == "/")) {
                            nextSection();
                            continue;
                        }
                        section += c;
                    }
                    nextSection();
                    return result;
                }
                var pathSections = splitPathSection(path);// .split("/").filter(function(e) { return e.length > 0})
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
                    console.warn("Argument of render evaluates to more than one node!")
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
                if (graphNode.nodes.length > 1) {
                    console.warn(":continue invoked in context with more than one node, this shouldn't be possible!")
                }
                return rdf2h.render(graph, graphNode.nodes[0], subContext);

            }
            if (name.startsWith("+")) {
                name = name.substring(1);
                return (resolvePath(name).length > 0);
            }
            var nodes = resolvePath(name);
            if (nodes.length === 1) {
                return new RDF2h.Renderee(rdf2h, GraphNode(nodes[0], graph), context);
            } else {
                return nodes.map(function (node) {
                    return new RDF2h.Renderee(rdf2h, GraphNode(node, graph), context);
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

RDF2h.Renderee = function (rdf2h, graphNode, context) {
    if (!graphNode.nodes) {
        throw new Error("second argument must be a GraphNode");
    }
    if (graphNode.nodes.length !== 1) {
        throw new Error("Renderee must be a single node");
    }
    this.rdf2h = rdf2h;
    this.graphNode = graphNode;
    this.context = context;
};

RDF2h.Renderee.prototype.toString = function () {
    if (this.graphNode.value) {
        return this.graphNode.value;
    }
    return this.graphNode.toString();
}

RDF2h.prototype.getRenderer = function (renderee) {
    var r2h = _rdf2h;
    let tbox = this.tbox;
    function matchesContext(cfRenderer) {
        var contexts = cfRenderer.out(r2h("context")).nodes;
        if (contexts.length === 0) {
            console.debug("renderer "+cfRenderer+" specifies no context, thus accepting it for "+renderee.context);
            return true;
        }
        return contexts.some(function(context) {
            if (renderee.context.equals(context)) {
                console.debug("renderer "+cfRenderer+" matches the context "+renderee.context);
                return true;
            }
        });
    }
    function resolveRendererNode(rendererURI) {
        if (!window) {
            return "Could not get renderer: " + rendererURI + ", no window object."
        }
        var pageURIPrefix = window.location + "#";
        if (!rendererURI.startsWith(pageURIPrefix)) {
            return "Could not get renderer: " + rendererURI + ", the prefix must be " + pageURIPrefix + "."
        }
        var id = rendererURI.substring(pageURIPrefix.length);
        return document.getElementById(id).textContent;
    }
    function rendererRenderer(renderer) {
        return function (renderee) {
            return _render(renderer, renderee);
        };
    }
    function getTypes(graphNode) {
        //the array might contain rdfs:Resource twice (at the end)
        if (graphNode.node.termType === "Literal") {
            return [graphNode.node.datatype];
        } else {
            return graphNode.out(_rdf("type")).nodes.sort(
                (a,b) => {
                    if (a.equals(b)) {
                        return 0;
                    }
                    if (a.equals(rdfs("Resource"))) {
                        return 1;
                    }
                    if (b.equals(rdfs("Resource"))) {
                        return -1;
                    }
                    if (tbox.match(a, rdfs("subClassOf"),b).length === 0) {
                        if (tbox.match(b, rdfs("subClassOf"),a).length === 0) {
                            return a.value.localeCompare(b.value);
                        } else {
                            return 1;
                        }
                    } else {
                        return -1;
                    }
                }
            ).concat([rdfs("Resource")]);
        }        
    }
    let self = this;
    function getMatchingRenderer(types, context) {
        function getMatching(renderers) {
            return renderers.find(renderer => context.equals(renderer.out(_rdf2h("context")).node));
        }
        let reverseGraphs = self.rendererGraphs;
        return types.reduce((renderer, type) => {
            return renderer ? renderer : reverseGraphs.reduce((renderer, graph) => {
                let typeGN =  GraphNode(type, graph);
                return renderer ? renderer : getMatching(typeGN.in(_rdf2h("type")).split());
            }, null);
        }, null);
    }
    let types = getTypes(renderee.graphNode);
    let renderer = getMatchingRenderer(types, renderee.context);
    if (!renderer) {
        throw Error("No renderer found with context: <"+renderee.context.value+"> for any of the types "+types.map(t => "<"+t.value+">").join()
                    +". The resource <"+renderee.graphNode.value+"> could thus not be rendered.");
    }
    let mustache = renderer.out(_rdf2h("mustache"));
    if (mustache.nodes.length > 0) {
        return rendererRenderer(mustache.value);
    }
    let js = renderer.out(_rdf2h("javaScript"))
    return function (renderee) {
        try {
            let render =  (n, context) => {
                return renderee.rdf2h.render(n.graph, n.node, context ? context : renderee.context);
            };
            let output = "";
            let print = (s) => {
                output += s;
            };
            //Also printing return value for now
            let returnValue = (new Function("n", "context", "$rdf", "render", "print", "GraphNode", "env", js.value)
                    )(renderee.graphNode, renderee.context, rdf, render, print, GraphNode, renderee.rdf2h.env);
            if (returnValue) {
                return output + returnValue;
            } else {
                return output;
            }
        } catch(err) {
            err.message = err.message + " in " + js.value;
            let stackLines = err.stack.split("\n");
            let lineWithSelf = stackLines.findIndex(l => l.indexOf("RDF2h.render") > 0);
            err.stack = stackLines.splice(0, lineWithSelf - 1).join("\n");
            throw err;
        }
    };


}

RDF2h.prototype.render = function (graph, node, context) {
    if (!node.termType) {
        node = sym(node);
    }
    if (!context) {
        context = _rdf2h("Default");
    }
    //wrap all in one object that gets special care by lookup
    var renderee = new RDF2h.Renderee(this, GraphNode(node, graph), context);
    var renderer = this.getRenderer(renderee);
    return renderer(renderee);
}

RDF2h.prefixMap = {};
RDF2h.prefixMap["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
RDF2h.prefixMap["rdfs"] = "http://www.w3.org/2000/01/rdf-schema#";
RDF2h.prefixMap["r2h"] = "http://rdf2h.github.io/2015/rdf2h#";
RDF2h.prefixMap["schema"] = "http://schema.org/";
RDF2h.prefixMap["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
RDF2h.prefixMap["dct"] = "http://purl.org/dc/terms/";


RDF2h.resolveCurie = function (curie) {
    if (curie.startsWith("<") && curie.endsWith(">")) {
        //URI, not a curie
        return sym(curie.substring(1, curie.length - 1));
    }
    var splits = curie.split(":");
    var prefix = splits[0];
    var suffix = splits[1];
    if (RDF2h.prefixMap[prefix]) {
        return sym(RDF2h.prefixMap[prefix] + suffix);
    } else {
        return sym(curie);
    }

};

export default RDF2h;