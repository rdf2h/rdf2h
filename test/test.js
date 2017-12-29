var assert = require('assert');
var RDF2h = require('../js/rdf2h-core.js');
var Logger = require('../js/logger.js');
var rdf = require('rdflib');
//var N3Parser = require('rdf-parser-n3');
//var clownface = require('clownface');
//var mimeTypeUtil = require('rdf-mime-type-util');

describe('RDF2h', function () {
    describe('#render()', function () {
        it('Applying a simple template, using prefix from parser.', function () {
            var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The title: {{dc:title}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            var matchers = rdf.graph();
            rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
            var data = rdf.graph();
            rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");

            //RDF2h.logger.setLevel(Logger.DEBUG);
            var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
            console.log("result: "+renderingResult);
            assert.equal("The title: An example", renderingResult);

        });
        
        it('Applying a simple template with inverse property.', function () {
            var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "Known by: {{./^foaf:knows}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['foaf'] = "http://xmlns.com/foaf/0.1/";
            var matchers = rdf.graph();
            rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
            var data = rdf.graph();
            rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
            //RDF2h.logger.setLevel(Logger.DEBUG);
            var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
            console.log("result: "+renderingResult);
            assert.equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
        });
        
        it('Applying a simple template with inverse property using <- syntax.', function () {
            var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "Known by: {{foaf:knows<-}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            var matchers = rdf.graph();
            rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
            var data = rdf.graph();
            rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
            //RDF2h.logger.setLevel(Logger.DEBUG);
            var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
            console.log("result: "+renderingResult);
            assert.equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
        });
        
        it('Render datatype using pseudo property.', function () {
            var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                <http://example.org/> dc:title "10"^^xsd:integer.';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The type title: {{{dc:title/rdf:type}}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            var matchers = rdf.graph();
            rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
            var data = rdf.graph();
            rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
            //RDF2h.logger.setLevel(Logger.DEBUG);
            var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
            console.log("result: "+renderingResult);
            assert.equal("The type title: http://www.w3.org/2001/XMLSchema#integer", renderingResult);
        });
        /*
        it('Render language using pseudo property.', function () {
            var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                <http://example.org/> dc:title "Il titilo"@it.';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                @prefix dct: <http://purl.org/dc/terms/>. \n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The title language: {{{dc:title/dct:language}}}"\n\
                  ]\n\
                ].'; 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            return N3Parser.parse(matchersTurtle).then(function (matchers) {
                return N3Parser.parse(dataTurtle).then(function (data) {
                    //RDF2h.logger.setLevel(Logger.DEBUG);
                    var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
                    console.log("result: "+renderingResult);
                    assert.equal("The title language: it", renderingResult);
                });
            });
        });
        
        it('Matching based on  datatype pseudo property.', function () {
            var dataTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
\n\             @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                <http://example.org/> dc:title "Test"^^xsd:string.\n\
                <http://example.org/> rdf:value "10"^^xsd:integer.';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The value: {{{:render rdf:value}}}, The title: {{{:render dc:title}}}"\n\
                  ]\n\
                ].\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate rdf:type;\n\
                    r2h:object xsd:string\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "A String"\n\
                  ]\n\
                ].\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate rdf:type;\n\
                    r2h:object xsd:integer\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "An Integer"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            return N3Parser.parse(matchersTurtle).then(function (matchers) {
                return N3Parser.parse(dataTurtle).then(function (data) {
                    //RDF2h.logger.setLevel(Logger.DEBUG);
                    var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
                    console.log("result: "+renderingResult);
                    assert.equal("The value: An Integer, The title: A String", renderingResult);
                });
            });
        });

        it('Once again but with a newline in data', function () {
            var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "\\nAn example".';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The title: {{dc:title}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            return N3Parser.parse(matchersTurtle).then(function (matchers) {
                return N3Parser.parse(dataTurtle).then(function (data) {
                    //RDF2h.logger.setLevel(Logger.DEBUG);
                    var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
                    console.log("result: "+renderingResult);
                    assert.equal("The title: \nAn example", renderingResult);
                });
            });
        });
        
        it('Once again but with a newline in template', function () {
            var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
            var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Matcher ;\n\
                  r2h:triplePattern [\n\
                    r2h:subject r2h:this;\n\
                    r2h:predicate dc:title;\n\
                  ];\n\
                  r2h:template [ \n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "The title: \\n{{dc:title}}"\n\
                  ]\n\
                ].';
            //mimeTypeUtil.parsers.parse('text/turtle', 
            RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
            return N3Parser.parse(matchersTurtle).then(function (matchers) {
                return N3Parser.parse(dataTurtle).then(function (data) {
                    //RDF2h.logger.setLevel(Logger.DEBUG);
                    var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
                    console.log("result: "+renderingResult);
                    assert.equal("The title: \nAn example", renderingResult);
                });
            });
        });
        */
    });
});

