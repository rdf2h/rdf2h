import $rdf from "ext-rdflib";

export function schema(suffix) {
    return $rdf.sym("http://schema.org/" + suffix);
}

export function rdf(suffix) {
    return $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#" + suffix);
}
export function rdfs(suffix) {
    return $rdf.sym("http://www.w3.org/2000/01/rdf-schema#" + suffix);
}
export function foaf(suffix) {
    return $rdf.sym("http://xmlns.com/foaf/0.1/" + suffix);
}
export function rdf2h(suffix) {
    return $rdf.sym("http://rdf2h.github.io/2015/rdf2h#" + suffix);
}

export default { schema, rdf, rdfs, foaf, rdf2h };