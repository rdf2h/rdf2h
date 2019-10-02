import { equal, throws } from 'assert';
import RDF2h from '../src/rdf2h.js';
import { graph, parse } from 'ext-rdflib';

const prefixMap = RDF2h.prefixMap;

describe('RDF2h', function () {
  describe('#render()', function () {
    it('Applying rdf:Resource renderer to untyped resource.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{dc:title}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () =>{
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      equal("The title: An example", renderingResult);
          done();
    });
      });
      
    });
    it('Applying rdf:Resource renderer to untyped resource with HTML in data.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An <i>example</i>".';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{{dc:title}}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () =>{
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      equal("The title: An <i>example</i>", renderingResult);
          done();
    });
      });
      
    });
    it('Applying rdf:Resource renderer to typed resource.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix schema: <http://schema.org/>. \n\
                <http://example.org/> dc:title "An example". \n\
                <http://example.org/> a schema:Article .';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].\n\
                [ a r2h:Renderer; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{dc:title}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      equal("The title: An example", renderingResult);
          done();
    });
      });
    });
    it('Applying javascript renderer.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:javaScript """\n\
                    return "The title: "+n.out($rdf.sym("http://dublincore.org/2012/06/14/dcelements#title")).value; """\n\
                ].';
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/");
      console.log("result: " + renderingResult);
      equal("The title: An example", renderingResult);
          done();
    });

      });
      
    });

    it('With property path', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>. \n\
                <http://example.org/b> foaf:name "Alice" .';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}knows: {{foaf:knows/foaf:name}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/a");
      console.log("result: " + renderingResult);
      equal("knows: Alice", renderingResult);
          done();
    });
      });
    });

    it('Applying a simple renderer with inverse property.', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer ;\n\
                    r2h:type rdfs:Resource;\n\
                    r2h:context r2h:Default;\n\
                    r2h:mustache "Known by: {{./^foaf:knows}}"\n\
                ].';
      prefixMap['foaf'] = "http://xmlns.com/foaf/0.1/";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
          done()
    });

      });
      
    });

    it('Error message when no matching renderer found.', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '';
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      throws(() => {
        var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
        console.log("result: " + renderingResult);
      }, function(err) {
        let expectedMessage = "No renderer found with context: <http://rdf2h.github.io/2015/rdf2h#Default> for any of the types <http://www.w3.org/2000/01/rdf-schema#Resource>. The resource <http://example.org/b> could thus not be rendered.";
        if ((err instanceof Error) && (err.message === expectedMessage)) {
          return true;
        }
      }, "Error thrown");
          done();
    });

      });
      
    });

    it('Error message when javaScript-renderer is invalid.', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>. \n\
                <http://example.org/a> foaf:knows <http://example.org/b>.';
                var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:javaScript """\n\
                    function broken() { \n\
                      return undefined.foo()\n\
                    }\n\
                    return broken();"""\n\
                ].';
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      throws(() => {
        var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
        console.log("result: " + renderingResult);
      }, function(err) {
        let expectedPattern  = /.*undefined.foo.*/;
        if ((err instanceof Error) && err.message.match(expectedPattern)) {
          return true;
        }
      }, "Error thrown");
          done();
        });
      });
      
    });

    it('Applying a simple renderer with inverse property using <- syntax.', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
            <http://example.org/a> foaf:knows <http://example.org/b>.';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
            @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
            @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
            [ a r2h:Renderer;\n\
                r2h:type rdfs:Resource;\n\
                r2h:context r2h:Default;\n\
                r2h:mustache "{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Known by: {{foaf:knows<-}}"\n\
            ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      //RDF2h.logger.setLevel(Logger.DEBUG);
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      equal("Known by: http:&#x2F;&#x2F;example.org&#x2F;a", renderingResult);
          done();
        });
        
      });
      
    });

    it('Applying a simple renderer with full URI.', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
            <http://example.org/b> foaf:name "Bob".\n\
            ';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
            @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
            @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
            [ a r2h:Renderer;\n\
                r2h:type rdfs:Resource;\n\
                r2h:context r2h:Default;\n\
                r2h:mustache "name: {{<http://xmlns.com/foaf/0.1/name>}}"\n\
            ].';
      var matchers = graph();
      parse(matchersTurtle, matchers, "http://example.org/matchers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = new RDF2h(matchers).render(data, "http://example.org/b");
      console.log("result: " + renderingResult);
      equal("name: Bob", renderingResult);
          done();
        });
        
    });
      
    });
    it('Invoking render.', function () {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
      <http://example.org/a>  a foaf:Person;\n\
      foaf:name "Alice";\n\
      foaf:account\n\
          [ a   foaf:OnlineAccount, foaf:OnlineChatAccount;\n\
            foaf:accountServiceHomepage <http://www.freenode.net/>;\n\
            foaf:accountName "Alice" ],\n\
          [ a   foaf:OnlineAccount, foaf:OnlineGamingAccount;\n\
            foaf:accountServiceHomepage <http://www.nerds.play/>;\n\
            foaf:accountName "TheAlice" ].';
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Renderer;\n\
        r2h:type foaf:Person;\n\
        r2h:context r2h:Default;\n\
        r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Name: {{foaf:name}}'+
        '{{#foaf:account}}'+
        '{{{:render .}}}'+
        '{{/foaf:account}}"""\n\
        ].\n\
        [ a r2h:Renderer;\n\
        r2h:type foaf:OnlineAccount;\n\
        r2h:context r2h:Default;\n\
        r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}'+
        '{{foaf:accountName}} on {{foaf:accountServiceHomepage}}"""\n\
      ].';
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      equal("Name: AliceAlice on http:&#x2F;&#x2F;www.freenode.net&#x2F;TheAlice on http:&#x2F;&#x2F;www.nerds.play&#x2F;", renderingResult);
    });
      });
      
    });
    it('Invoking render in javaScript.', function (done) {
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
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Renderer;\n\
        r2h:type foaf:Person;\n\
        r2h:context r2h:Default;\n\
        r2h:javaScript """let foaf = suffix => $rdf.sym("http://xmlns.com/foaf/0.1/"+suffix);\n\
        return `Name: ${n.out(foaf("name")).value}\n'+
        '${n.out(foaf("account")).split().map(n => render(n)).join("")}`"""\n\
      ].\n\
      [ a r2h:Renderer;\n\
        r2h:type foaf:OnlineAccount;\n\
        r2h:context r2h:Default;\n\
        r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}'+
        '{{foaf:accountName}} on {{foaf:accountServiceHomepage}}\n"""\n\
      ].'; 
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      equal("Name: Alice\nAlice on http:&#x2F;&#x2F;www.freenode.net&#x2F;\nTheAlice on http:&#x2F;&#x2F;www.nerds.play&#x2F;\n", renderingResult);
          done();
        });
        
      });
      
    });

    it('Accessing environment', function (done) {
      var dataTurtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n\
      <http://example.org/a>  a foaf:Person;\n\
      foaf:name "Alice";\n\
      foaf:account\n\
          [ a   foaf:OnlineAccount, foaf:OnlineChatAccount;\n\
            foaf:accountServiceHomepage <http://www.freenode.net/>;\n\
            foaf:accountName "Alice" ],\n\
          [ a   foaf:OnlineAccount, foaf:OnlineGamingAccount;\n\
            foaf:accountServiceHomepage <http://www.nerds.play/>;\n\
            foaf:accountName "TheAlice" ].';
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Renderer;\n\
        r2h:type foaf:Person;\n\
        r2h:context r2h:Default;\n\
        r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Name: {{foaf:name}}'+
        '{{#foaf:account}}'+
        '{{{:render .}}}'+
        '{{/foaf:account}}"""\n\
      ].\n\
      [ a r2h:Renderer;\n\
        r2h:type foaf:OnlineAccount;\n\
        r2h:context r2h:Default;\n\
        r2h:javaScript """let foaf = suffix => $rdf.sym("http://xmlns.com/foaf/0.1/"+suffix);\n\
        if (!env.accountCount) {env.accountCount = 1} else {env.accountCount++}; \n\
        print(`\n${env.accountCount} - ${n.out(foaf("accountName")).value} on '+
        '${n.out(foaf("accountServiceHomepage")).value}`);"""\n\
      ].';
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      equal("Name: Alice\n1 - Alice on http://www.freenode.net/\n2 - TheAlice on http://www.nerds.play/", renderingResult);
          done()
        });
        
      });
      
    });
    it('Selection of more specific renderer.', function (done) {
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
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\
      [ a r2h:Renderer;\n\
          r2h:type foaf:Person;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}{{#foaf:account}}{{{:render .}}}{{/foaf:account}}"""\n\
      ].\n\
      [ a r2h:Renderer;\n\
          r2h:type foaf:OnlineAccount;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Connect with {{foaf:accountName}} on {{foaf:accountServiceHomepage}}\n"""\n\
      ].\n\
      [ a r2h:Renderer;\n\
          r2h:type foaf:OnlineChatAccount;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache """{{@prefix foaf: <http://xmlns.com/foaf/0.1/>}}Chat with {{foaf:accountName}} on {{foaf:accountServiceHomepage}}\n\"""\n\
      ].\n\
      foaf:OnlineChatAccount rdfs:subClassOf foaf:OnlineAccount.';
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
      var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
      var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/a"); })();
      console.log("result: " + renderingResult);
      equal("Chat with Alice on http:&#x2F;&#x2F;www.freenode.net&#x2F;\nConnect with TheAlice on http:&#x2F;&#x2F;www.nerds.play&#x2F;\n", renderingResult);
          done();
        });
        
      });
      
      });

    it('Render datatype using pseudo property.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#> .\n\
            @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
            <http://example.org/> dc:title "10"^^xsd:integer.';
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
            @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
            @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
            [ a r2h:renderer;\n\
                r2h:type rdfs:Resource;\n\
                r2h:context r2h:Default;\n\
                r2h:mustache "The type title: {{{dc:title/rdf:type}}}"\n\
            ].';
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/"); })();
          console.log("result: " + renderingResult);
          equal("The type title: http://www.w3.org/2001/XMLSchema#integer", renderingResult);
          done();
        });
      });
    });

    it('Render language using pseudo property.', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                <http://example.org/> dc:title "Il titilo"@it.';
      var renderersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix dct: <http://purl.org/dc/terms/>. \n\
      [ a r2h:renderer;\n\
          r2h:type rdfs:Resource;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache "The title language: {{{dc:title/dct:language}}}"\n\
          \n\
      ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/"); })();
          console.log("result: " + renderingResult);
          equal("The title language: it", renderingResult);
          done();
        });
      });
    });

    
    it('Matching based on  datatype pseudo property.', function (done) {
      var dataTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                    @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
                    <http://example.org/> dc:title "Test"^^xsd:string.\n\
                    <http://example.org/> rdf:value "10"^^xsd:integer.';
      var matchersTurtle = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
          @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
          @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
          @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
          @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
          [ a r2h:renderer ;\n\
              r2h:type rdfs:Resource;\n\
              r2h:context r2h:Default;\n\
              r2h:mustache "The value: {{{:render rdf:value}}}, The title: {{{:render dc:title}}}"\n\
          ].\n\
          [ a r2h:renderer ;\n\
              r2h:type xsd:string;\n\
              r2h:context r2h:Default;\n\
              r2h:mustache "A String"\n\
          ].\n\
          [ a r2h:renderer ;\n\
              r2h:type xsd:integer;\n\
              r2h:context r2h:Default;\n\
              r2h:mustache "An Integer"\n\
          ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var renderers = graph();
      parse(matchersTurtle, renderers, "http://example.org/matchers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = new RDF2h(renderers).render(data, "http://example.org/");
          console.log("result: " + renderingResult);
          equal("The value: An Integer, The title: A String", renderingResult);
          done();
        });
      });
          
        }); 

    it('Once again but with a newline in data', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "\\nAn example".';
      var renderersTurtle = '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      [ a r2h:renderer ;\n\
          r2h:type rdfs:Resource;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache "The title: {{dc:title}}"\n\
      ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/"); })();
          console.log("result: " + renderingResult);
          equal("The title: \nAn example", renderingResult);
          done();
        });
      });
    });

    it('Once again but with a newline in renderer', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                <http://example.org/> dc:title "An example".';
      var renderersTurtle = '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
      @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
      @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
      [ a r2h:renderer ;\n\
          r2h:type rdfs:Resource;\n\
          r2h:context r2h:Default;\n\
          r2h:mustache "The title: \\n{{dc:title}}"\n\
      ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/"); })();
          console.log("result: " + renderingResult);
          equal("The title: \nAn example", renderingResult);
          done();
        });
      });
    });

    it('A render-call', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
          @prefix schema: <http://schema.org/>. \n\
          <http://example.org/> schema:about [dc:title "An example"]; \n\
          a schema:Article.';
      var renderersTurtle = '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
          @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
          @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
          @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
          @prefix schema: <http://schema.org/>. \n\
          [ a r2h:renderer ; \n\
              r2h:type schema:Article;\n\
              r2h:context r2h:Default;\n\
              r2h:mustache "{{@prefix schema: <http://schema.org/> }}{{{:render schema:about}}}"\n\
          ]. \n\
          [ a r2h:renderer ; \n\
              r2h:type rdfs:Resource;\n\
              r2h:context r2h:Default;\n\
              r2h:mustache "{{@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>}}The title: {{dc:title}}"\n\
          ].';
      //mimeTypeUtil.parsers.parse('text/turtle', 
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var renderers = graph();
      parse(renderersTurtle, renderers, "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = (() => { return new RDF2h(renderers).render(data, "http://example.org/"); })();
          console.log("result: " + renderingResult);
          equal("The title: An example", renderingResult);
          done();
        });
      });
    });

    it('Using multiple renderer graphs (as per issue #19)', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix schema: <http://schema.org/>. \n\
                <http://example.org/> dc:title "An example". \n\
                <http://example.org/> a schema:Article .';
      var renderersTurtle1 = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].\n\
                [ a r2h:Renderer; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].';
      var renderersTurtle2 = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].\n\
                [ a r2h:Renderer; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "The title: {{dc:title}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var rendererGraphs = new Array();
      rendererGraphs[0] = graph();
      parse(renderersTurtle1, rendererGraphs[0], "http://example.org/renderers/", "text/turtle", () => {
        rendererGraphs[1] = graph();
        parse(renderersTurtle2, rendererGraphs[1], "http://example.org/renderers/", "text/turtle", () => {
        var data = graph();
        parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
          var renderingResult = new RDF2h(rendererGraphs).render(data, "http://example.org/");
          console.log("result: " + renderingResult);
          equal("The title: An example", renderingResult);
          done();
        });
      });
      });
    });

    it('Delegation with multiple renderer graphs', function (done) {
      var dataTurtle = '@prefix dc: <http://dublincore.org/2012/06/14/dcelements#>. \n\
                @prefix schema: <http://schema.org/>. \n\
                <http://example.org/> dc:title "An example". \n\
                <http://example.org/> a schema:Article .';
      var renderersTurtle1 = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Tail;\n\
                  r2h:mustache "Wrong Tail"\n\
                ].';
      var renderersTurtle2 = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "This must not be chosen"\n\
                ].\n\
                [ a r2h:Renderer; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Generic;\n\
                  r2h:mustache "{{{@prefix r2h: <http://rdf2h.github.io/2015/rdf2h#>}}}And Back -> {{{:render . r2h:Tail}}}"\n\
                ].';
        var renderersTurtle3 = '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\
                @prefix r2h: <http://rdf2h.github.io/2015/rdf2h#> .\n\
                @prefix schema: <http://schema.org/>. \n\
                @prefix dc: <http://dublincore.org/2012/06/14/dcelements#>.\n\
                [ a r2h:Renderer; \n\
                  r2h:type rdfs:Resource;\n\
                  r2h:context r2h:Tail;\n\
                  r2h:mustache "Right Tail"\n\
                ].\n\
                [ a r2h:Renderer; \n\
                  r2h:type schema:Article;\n\
                  r2h:context r2h:Default;\n\
                  r2h:mustache "{{{@prefix r2h: <http://rdf2h.github.io/2015/rdf2h#>}}}Article -> {{{:render . r2h:Generic}}}"\n\
                ].';
      prefixMap['dc'] = "http://dublincore.org/2012/06/14/dcelements#";
      var rendererGraphs = new Array();
      rendererGraphs[0] = graph();
      parse(renderersTurtle1, rendererGraphs[0], "http://example.org/renderers/", "text/turtle", () => {
        rendererGraphs[1] = graph();
        parse(renderersTurtle2, rendererGraphs[1], "http://example.org/renderers/", "text/turtle", () => {
          rendererGraphs[2] = graph();
          parse(renderersTurtle3, rendererGraphs[2], "http://example.org/renderers/", "text/turtle", () => {
            var data = graph();
            parse(dataTurtle, data, "http://example.org/data", "text/turtle", () => {
              var renderingResult = new RDF2h(rendererGraphs).render(data, "http://example.org/");
              console.log("result: " + renderingResult);
              equal("Article -> And Back -> Right Tail", renderingResult);
              done();
            });
          });
        });
      });
    });

/* Testing with resources from the web, commented out not to depend on stability of URIs
    it('Test with remote resources', function (done) {
      let rendererGraphUris = new Array();
      rendererGraphUris[0] = "https://rdf2h.github.io/renderers/0.0.2/fallback-renderers.ttl";
      rendererGraphUris[1] = "https://rawgit.com/rdf2h/renderers/master/schema-org-renderers.ttl";
      rendererGraphUris[2] = "https://farewellutopia.com/renderers.ttl";
      let graphPromises = ["https://farewellutopia.com/schema-article-term.ttl"]
        .concat(rendererGraphUris).map(uri =>
          rdf.rdfFetch(uri).then(r => r.graph())
        );
      Promise.all(graphPromises).then(graphs => {
        let data = graphs.shift();
        let rendererGraphs = graphs;
        let renderingResult = new RDF2h(rendererGraphs).render(data, "https://farewellutopia.com/schema-article-term");
        console.log("result: " + renderingResult);
        assert(renderingResult.indexOf("See also") > 0);
        done();
      });
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
      r2h:renderer [ \n\
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
      r2h:renderer [ \n\
      r2h:context r2h:Default;\n\
      r2h:mustache """\n\
      <li>{{rdf:first}}</li> \n\
      {{{:render rdf:rest}}}\n\
      """\n\
      ].\n\
      <namedMatcher1> r2h:before\n\
      [ a r2h:Matcher ;\n\
      r2h:renderer [ \n\
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

