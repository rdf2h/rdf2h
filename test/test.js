var assert = require('assert');
var RDF2h = require('../src/rdf2h.js');
var rdf = require('rdflib');
//var N3Parser = require('rdf-parser-n3');
//var clownface = require('clownface');
//var mimeTypeUtil = require('rdf-mime-type-util');

describe('RDF2h', function () {
  describe('#render()', function () {
    it('Applying rdf:Resource template to untyped resource.', function () {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{dc:title}}"\n\
                ].';
      RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title: An example", renderingResult);
    });
    it('Applying rdf:Resource template to typed resource.', function () {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix schema: <http://schema.org/>. \n\
                <http://example.org/> dc:title "An example". \n\
                <http://example.org/> a schema:Article .';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].\n\
                [ a r2h:Template; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{dc:title}}"\n\
                ].';
      RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title: An example", renderingResult);
    });
    it('Applying javascript template.', function () {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:javaScript """\n\
                    return "The title: "+n.out($rdf.sym("http://dublincore.org/2012/06/14/dcelements#title")).value; """\n\
                ].';
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title: An example", renderingResult);
    });

    it('With property path', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>. \n\
                <http://example.org/b> foaf:name "Alice" .';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}knows: {{foaf:knows/foaf:name}}"\n\
                ].';
      RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/a");
      console.log("result: " + renderingResult);
      assert.equal("knows: Alice", renderingResult);
    });

    it('Applying a simple template with inverse property.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template ;\n\
                    r2h:type rdfs:Resource;\n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "Known by: {{./^foaf:knows}}"\n\
                ].';
      RDF2h.prefixMap['foaf'] = "http://xmlns.com/foaf/0.1/";
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      assert.equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
    });

    it('Error message when no matching template found.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '';
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      assert.throws(() => {
        var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
        console.log("result: " + renderingResult);
      }, function(err) {
        let expectedMessage = "No template found with context: <http://rdf2h.github.io/2015/rdf2h#Default> for any of the types <http://www.w3.org/2000/01/rdf-schema#Resource>. The resource <http://example.org/b> could thus not be rendered.";
        if ((err instanceof Error) && (err.message === expectedMessage)) {
          return true;
        }
      }, "Error thrown");
    });

    it('Error message when javaScript-template is invalid.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
                var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Template; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:javaScript """\n\
                    function broken() { \n\
                      return undefined.foo()\n\
                    }\n\
                    return broken();"""\n\
                ].';
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      assert.throws(() => {
        var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
        console.log("result: " + renderingResult);
      }, function(err) {
        let expectedPattern  = /.*undefined.foo.*/;
        if ((err instanceof Error) && err.message.match(expectedPattern)) {
          return true;
        }
      }, "Error thrown");
    });

    it('Applying a simple template with inverse property using <- syntax.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
            <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
            @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
            @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
            [ a r2h:Template;\n\
                r2h:type rdfs:Resource;\n\
                r2h:context r2h:Default;\n\
                r2h:mustache "{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Known by: {{foaf:knows<-}}"\n\
            ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      RDF2h.prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      //RDF2h.logger.setLevel(Logger.DEBUG);
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      assert.equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
    });

    it('Applying a simple template with full URI.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
            <http://example.org/b> foaf:name "Bob".\n\
            ';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
            @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
            @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
            [ a r2h:Template;\n\
                r2h:type rdfs:Resource;\n\
                r2h:context r2h:Default;\n\
                r2h:mustache "name: {{<http://xmlns.com/foaf/0.1/name>}}"\n\
            ].';
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      assert.equal("name: Bob", renderingResult);
    });
    it('Invoking render.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
      <http://example.org/a>  a foaf:Person;\n\
      foaf:name "Alice";\n\
      foaf:account\n\
      [   a   foaf:OnlineAccount, foaf:OnlineChatAccount;\n\
      foaf:accountServiceHomepage <http://www.freenode.net/>;\n\
      foaf:accountName "Alice" ],\n\
      [   a   foaf:OnlineAccount, foaf:OnlineGamingAccount;\n\
      foaf:accountServiceHomepage <http://www.nerds.play/>;\n\
      foaf:accountName "TheAlice" ].';
      var templatesTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Template;\n\
      r2h:type foaf:Person;\n\
      r2h:context r2h:Default;\n\
      r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Name: {{foaf:name}}'+
      '{{#foaf:account}}'+
      '{{:render .}}'+
      '{{/foaf:account}}"""\n\
      ].\n\
      [ a r2h:Template;\n\
      r2h:type foaf:OnlineAccount;\n\
      r2h:context r2h:Default;\n\
      r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}'+
      '{{foaf:accountName}} on {{foaf:accountServiceHomepage}}"""\n\
      ].';
      var templates = rdf.graph();
      rdf.parse(templatesTurtle, templates, "http://example.org/templates/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = (() => { return new RDF2h(templates).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      assert.equal("Name: AliceAlice on http:&amp;#x2F;&amp;#x2F;www.freenode.net&amp;#x2F;TheAlice on http:&amp;#x2F;&amp;#x2F;www.nerds.play&amp;#x2F;", renderingResult);
    });
    it('Selection of more specific template.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
      <http://example.org/a>  a foaf:Person;\n\
      foaf:name "Alice";\n\
      foaf:account\n\
      [   a   foaf:OnlineAccount, foaf:OnlineChatAccount;\n\
      foaf:accountServiceHomepage <http://www.freenode.net/>;\n\
      foaf:accountName "Alice" ],\n\
      [   a   foaf:OnlineAccount, foaf:OnlineGamingAccount;\n\
      foaf:accountServiceHomepage <http://www.nerds.play/>;\n\
      foaf:accountName "TheAlice" ].';
      var templatesTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Template;\n\
          r2h:type foaf:Person;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}{{#foaf:account}}{{{:render .}}}{{/foaf:account}}"""\n\
      ].\n\
      [ a r2h:Template;\n\
          r2h:type foaf:OnlineAccount;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Connect with {{foaf:accountName}} on {{foaf:accountServiceHomepage}}\n"""\n\
      ].\n\
      [ a r2h:Template;\n\
          r2h:type foaf:OnlineChatAccount;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Chat with {{foaf:accountName}} on {{foaf:accountServiceHomepage}}\n\"""\n\
      ].\n\
      foaf:OnlineChatAccount rdfs:subClassOf foaf:OnlineAccount.';
      var templates = rdf.graph();
      rdf.parse(templatesTurtle, templates, "http://example.org/templates/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = (() => { return new RDF2h(templates).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      assert.equal("Chat with Alice on http:&#x2F;&#x2F;www.freenode.net&#x2F;\nConnect with TheAlice on http:&#x2F;&#x2F;www.nerds.play&#x2F;\n", renderingResult);
    });
/*    it('Render datatype using pseudo property.', function () {
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
      console.log("result: " + renderingResult);
      assert.equal("The type title: http://www.w3.org/2001/XMLSchema#integer", renderingResult);
    });

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
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title language: it", renderingResult);

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
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The value: An Integer, The title: A String", renderingResult);
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
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      //RDF2h.logger.setLevel(Logger.DEBUG);
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title: \nAn example", renderingResult);
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
      var matchers = rdf.graph();
      rdf.parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle");
      var data = rdf.graph();
      rdf.parse(dataTurtle, data, "http://example.org/data", "text/turtle");
      //RDF2h.logger.setLevel(Logger.DEBUG);
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      assert.equal("The title: \nAn example", renderingResult);
    });
    it('A render-call', function () {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
          @prefix schema: <http://schema.org/>. \n\
          <http://example.org/> schema:about [dc:title "An example"].';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
          @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
          @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
          @prefix schema: <http://schema.org/>. \n\
          [ a r2h:Matcher ;\n\
            r2h:triplePattern [\n\
              r2h:subject r2h:this;\n\
              r2h:predicate schema:about;\n\
            ];\n\
            r2h:template [ \n\
              r2h:context r2h:Default;\n\
              r2h:mustache "{{{:render schema:about}}}"\n\
            ]\n\
          ]. \n\
          [ a r2h:Matcher ;\n\
            r2h:triplePattern [\n\
              r2h:subject r2h:this;\n\
              r2h:predicate dc:title;\n\
            ];\n\
            r2h:template [ \n\
              r2h:context r2h:Default;\n\
              r2h:mustache "The title: \\n{{dc:title}}"\n\
            ]\n\
          ]. \n\
          [ a r2h:Matcher ;\n\
            r2h:template [ \n\
              r2h:context r2h:Default;\n\
              r2h:mustache "Nassing"\n\
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
      assert.equal("The title: \nAn example", renderingResult);
    });
    */
    /*UNFINISHED: problem with rdflib turtle parser not supporting list syntax
    it('list rendering', function () {
      var dataTurtle = '@base <http://example.org/> .\n\
      @prefix ex: <http://schema.example.org/> .\n\
      <me> ex:list ("first" "second" "third").';
      var matchersTurtle = '@base <http://styles.example.org/> .\n\
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix ex: <http://schema.example.org/> .\n\
      [ a r2h:Matcher ;\n\
      r2h:triplePattern [\n\
      r2h:subject r2h:this;\n\
      r2h:predicate rdf:rest;\n\
      r2h:object rdf:nil\n\
      ];\n\
      r2h:template [ \n\
      r2h:context r2h:Default;\n\
      r2h:mustache """\n\
      <li>The last one: {{rdf:first}}</li> \n\
      """\n\
      ]\n\
      ] r2h:before <namedMatcher1>. \n\
      <namedMatcher1> a r2h:Matcher ;\n\
      r2h:triplePattern [\n\
      r2h:subject r2h:this;\n\
      r2h:predicate rdf:first\n\
      ];\n\
      r2h:template [ \n\
      r2h:context r2h:Default;\n\
      r2h:mustache """\n\
      <li>{{rdf:first}}</li> \n\
      {{{:render rdf:rest}}}\n\
      """\n\
      ].\n\
      <namedMatcher1> r2h:before\n\
      [ a r2h:Matcher ;\n\
      r2h:template [ \n\
      r2h:context r2h:Default;\n\
      r2h:mustache """\n\
      {{@prefix ex: <http://schema.example.org/>}}\n\
      <ul>{{{:render ex:list}}}</ul> \n\
      """\n\
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
      assert.equal("The title: \nAn example", renderingResult);
    });*/
  });
});

