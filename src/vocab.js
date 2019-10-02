import rdf from "ext-rdflib";

module.exports = {
    schema: function (suffix) {
        return rdf.sym("http://schema.org/" + suffix);
    },
    rdf: function (suffix) {
        return rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#" + suffix);
    },
    rdfs: function (suffix) {
        return rdf.sym("http://www.w3.org/2000/01/rdf-schema#" + suffix);
    },
    foaf: function (suffix) {
        return rdf.sym("http://xmlns.com/foaf/0.1/" + suffix);
    },
    rdf2h: function(suffix) {
        return rdf.sym("http://rdf2h.github.io/2015/rdf2h#"+suffix);
    }
}
