var rdf = require("rdf-ext");

function NodeSet() {
    this._g = new rdf.Graph();
    this.length = 0;
};

NodeSet._filler = rdf.createNamedNode("http://ignored/");

NodeSet._node2Triple = function(node) {
    return rdf.createTriple(node, NodeSet._filler, NodeSet._filler);
};

NodeSet.prototype.add = function(node) {
    this._g.add(NodeSet._node2Triple(node));
    this.length = this._g.length;
};

NodeSet.prototype.remove = function(node) {
    this._g.removeMatches(node, NodeSet._filler, NodeSet._filler);
    this.length = this._g.length;
};

NodeSet.prototype.contains = function(node) {
    this._g.match(node, NodeSet._filler, NodeSet._filler).length > 0;
    this.length = this._g.length;
};

NodeSet.prototype.forEach = function(callback) {
    this._g.forEach(function(t) {
        callback(t.subject);
    });
};

NodeSet.prototype.some = function(callback) {
    return this._g.some(function(t) {
        return callback(t.subject);
    });
};

if (typeof module !== 'undefined') {
    module.exports = NodeSet;
}
if (typeof window !== 'undefined') {
    window.NodeSet = NodeSet;
}
