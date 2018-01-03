!function(e){function t(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var r={};t.m=e,t.c=r,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=1)}([function(e,t){e.exports=$rdf},function(module,exports,__webpack_require__){"use strict";function RDF2h(e){function t(e){return rdf.sym("http://rdf2h.github.io/2015/rdf2h#"+e)}console.info("RDF2h created"),RDF2h.logger===Logger.INFO&&RDF2h.logger.info("To see more debug output invoke RDF2h.logger.setLevel(Logger.DEBUG) or even RDF2h.logger.setLevel(Logger.TRACE)"),this.matcherGraph=e;var r=new Array,n=rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),o=t("Matcher");e.statementsMatching(null,n,o).forEach(function(e){r.push(e.subject)});var i=t("before"),s=e.statementsMatching(null,i);s.forEach(function(e){r.push(e.subject),r.push(e.object)}),this.sortedMatchers=[];for(var a=this;r.length>0;)if(!r.some(function(e){return a.sortedMatchers.push(e),r=r.filter(function(t){return!t.equals(e)}),!0})){RDF2h.logger.error("Circle Detected with:\n"+s.toString());break}RDF2h.logger.debug("Constructed RDF2h with the following matchers: ",this.sortedMatchers.map(function(e){return e.toString()}))}var rdf=__webpack_require__(0),GraphNode=__webpack_require__(2),Mustache=__webpack_require__(3),Logger=__webpack_require__(4),NodeSet=new Array;RDF2h.logger=new Logger,RDF2h.ns=function(e){return rdf.sym("http://rdf2h.github.io/2015/rdf2h#"+e)},function(){var e=(RDF2h.ns,Mustache.Context.prototype.lookup);Mustache.Context.prototype.lookup=function(t){if(this.view instanceof RDF2h.Renderee){var r=function(e){function t(e,r){var n=function(t){return"."===t?e:t.endsWith("<-")?e.in(RDF2h.resolveCurie(t.substring(0,t.length-2))):t.startsWith("^")?e.in(RDF2h.resolveCurie(t.substring(1))):e.out(RDF2h.resolveCurie(t))}(r[0]);if(1===r.length){var o=n.nodes;if(0===o.length){if(e.nodes[0].language&&RDF2h.resolveCurie(r[0]).equals(rdf.sym("http://purl.org/dc/terms/language")))return[rdf.literal(e.nodes[0].language)];if(e.nodes[0].datatype&&RDF2h.resolveCurie(r[0]).equals(RDF2h.resolveCurie("rdf:type")))return[e.nodes[0].datatype]}return o}return t(n,r.slice(1))}var r=e.split("/").filter(function(e){return e.length>0});return t(o,r)},n=this.view.rdf2h,o=this.view.graphNode,i=this.view.graph,s=this.view.context,a=this.view.currentMatcherIndex;if(t.startsWith("@prefix ")){var u=t.split(" "),h=u[1],c=u[2],l=h.substring(0,h.length-1),p=c.substring(1,c.length-1);return RDF2h.prefixMap[l]=p,""}if(t.startsWith(":render ")){var u=t.split(" "),f=u[1],d=u[2];d&&(d=RDF2h.resolveCurie(d)),d||(d=s);var g=r(f);return g.length>1&&RDF2h.logger.warn("Argument of render evaluates to more than one node!"),g.length>0?n.render(i,g[0],d):""}if(t.startsWith(":continue")){var u=t.split(" "),d=u[1];return d&&(d=RDF2h.resolveCurie(d)),d||(d=s),o.nodes.length>1&&RDF2h.logger.warn(":continue invoked in context with more than one node, this shouldn't be possible!"),n.render(i,o.nodes[0],d,a+1)}if(t.startsWith("+"))return t=t.substring(1),r(t).length>0;var v=r(t);return 1===v.length?new RDF2h.Renderee(n,i,v[0],s):v.map(function(e){return new RDF2h.Renderee(n,i,e,s)})}return e.call(this,t)}}(),RDF2h.Renderee=function(e,t,r,n){if(!r)throw"no node specficied!";if("[object Array]"===Object.prototype.toString.call(r))throw"Renderee must be a single node";this.rdf2h=e,this.graph=t,this.node=r,this.context=n,this.graphNode=GraphNode(r,t)},RDF2h.Renderee.prototype.toString=function(){return this.node.value?this.node.value:this.node.toString()},RDF2h.prototype.getRenderer=function(renderee){function matchPattern(e){function t(e){return e&&e.equals(RDF2h.ns("this"))}var r=e.out(r2h("subject")).nodes[0],n=e.out(r2h("predicate")).nodes[0],o=e.out(r2h("object")).nodes[0];return t(r)?"Literal"===renderee.node.termType&&RDF2h.resolveCurie("rdf:type").equals(n)?renderee.node.datatype.equals(o):renderee.graphNode.out(n).nodes.some(function(e){return!o||o.equals(e)}):t(o)?renderee.graphNode.in(n).nodes.some(function(e){return!r||r.equals(e)}):void console.error("Triple pattern must have r2h:this as subject or object")}function matchesContext(e){var t=e.out(r2h("context")).nodes;return 0===t.length?(RDF2h.logger.trace("template "+e+" specifies no context, thus accepting it for "+renderee.context),!0):t.some(function(t){if(renderee.context.equals(t))return RDF2h.logger.trace("template "+e+" matches the context "+renderee.context),!0})}function matches(e){for(var t=e.out(r2h("triplePattern")).nodes,r=0;r<t.length;r++){if(!matchPattern(GraphNode(t[r],self.matcherGraph)))return RDF2h.logger.debug("Matcher "+e+" doesn't has triple patterns matching "+renderee.graphNode),!1}return RDF2h.logger.debug("Matcher "+e+" has triple patterns matching "+renderee.graphNode),!0}function resolveTemplateNode(e){if(!window)return"Could not get template: "+e+", no window object.";var t=window.location+"#";if(!e.startsWith(t))return"Could not get template: "+e+", the prefix must be "+t+".";var r=e.substring(t.length);return document.getElementById(r).textContent}function templateRenderer(e){return function(t){return Mustache.render(e,t)}}for(var r2h=RDF2h.ns,self=this,i=this.startMatcherIndex;i<this.sortedMatchers.length;i++){var matcher=this.sortedMatchers[i],cfMatcher=GraphNode(matcher,this.matcherGraph);if(matches(cfMatcher)){renderee.currentMatcherIndex=i;for(var templateNodes=cfMatcher.out(r2h("template")).nodes,j=0;j<templateNodes.length;j++){var templateNode=templateNodes[j],cfTemplate=GraphNode(templateNode,this.matcherGraph);if(matchesContext(cfTemplate)){var jsNode=cfTemplate.out(r2h("javaScript")).nodes[0];if(jsNode)return eval("var f = "+jsNode.value+"; f;");var mustacheNode=cfTemplate.out(r2h("mustache")).node;return templateRenderer("NamedNode"===mustacheNode.termType?resolveTemplateNode(mustacheNode.value):mustacheNode.value)}}RDF2h.logger.debug("Matcher "+cfMatcher+" has not template with matching context")}}return templateRenderer(0===this.startMatcherIndex?'<div class="missingTemplate">No template found for &lt;{{.}}&gt; in context &lt;'+renderee.context+"&gt;</div>":'<div class="noMoreTemplate">No more template available for &lt;{{.}}&gt; in context &lt;'+renderee.context+"&gt;</div>")},RDF2h.prototype.render=function(e,t,r,n){t.termType||(t=rdf.sym(t)),r||(r=RDF2h.ns("Default"));var o=new RDF2h.Renderee(this,e,t,r);return this.startMatcherIndex=n||0,this.getRenderer(o)(o)},RDF2h.prefixMap={},RDF2h.prefixMap.rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#",RDF2h.prefixMap.rdfs="http://www.w3.org/2000/01/rdf-schema#",RDF2h.prefixMap.r2h="http://rdf2h.github.io/2015/rdf2h#",RDF2h.prefixMap.schema="http://schema.org/",RDF2h.prefixMap.rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#",RDF2h.prefixMap.dct="http://purl.org/dc/terms/",RDF2h.resolveCurie=function(e){RDF2h.logger.debug("resolving "+e);var t=e.split(":"),r=t[0],n=t[1];return RDF2h.prefixMap[r]?rdf.sym(RDF2h.prefixMap[r]+n):rdf.sym(e)},"undefined"!=typeof window&&(window.RDF2h=RDF2h),module.exports=RDF2h},function(e,t,r){"use strict";function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function o(){return new(Function.prototype.bind.apply(o.Impl,[null].concat(Array.prototype.slice.call(arguments))))}var i=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}();if(void 0===s)var s=r(0);o.Impl=function(){function e(t,r,o){n(this,e),this._graph=r,Array.isArray(t)?this.nodes=t:this.nodes=[t],this.sources=o}return i(e,[{key:"fetch",value:function(){var e=this;if("NamedNode"!==this.termType||this.sources&&this.sources.indexOf(this.value.split("#")[0])>-1)return Promise.resolve(this);var t=this.value.split("#")[0];return o.rdfFetch(t).then(function(r){return o(e.node,r.graph,[t])})}},{key:"each",value:function(e){var t=this,r=this.nodes.map(function(r){return e(o([r],t.graph,t.sources))});return Promise.all(r)}},{key:"fetchEach",value:function(e){var t=this,r=this.nodes.map(function(r){return o([r],t.graph,t.sources).fetch().then(e)});return Promise.all(r)}},{key:"out",value:function(e){return o(this.graph.each(this.node,e),this.graph,this.sources)}},{key:"in",value:function(e){return o(this.graph.statementsMatching(void 0,e,this.node).map(function(e){return e.subject}),this.graph,this.sources)}},{key:"graph",get:function(){if(!this._graph)throw Error("Operation not possible as no Graph is available, try fetching first");return this._graph}},{key:"node",get:function(){if(1!==this.nodes.length)throw Error("Operation not possible as this GraphNode is underdetermined");return this.nodes[0]}},{key:"termType",get:function(){return this.node.termType}},{key:"value",get:function(){return this.node.value}}]),e}(),o.rdfFetch=function(e,t,r){var n=this;return new Promise(function(o,i){var a=s.graph();new s.Fetcher(a,t).fetch(e,{redirect:"follow"}).then(function(t){if(t.status<300)t.graph=a,o(t);else{if(r&&401===t.status)return console.log("Got 401 response, attempting to login"),r().then(function(){return n.rdfFetch(e)});i(t)}})})},e.exports=o},function(e,t,r){"use strict";var n,o,i,s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e};/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
!function(r,a){"object"===s(t)&&t&&"string"!=typeof t.nodeName?a(t):(o=[t],n=a,void 0!==(i="function"==typeof n?n.apply(t,o):n)&&(e.exports=i))}(0,function(e){function t(e){return"function"==typeof e}function r(e){return v(e)?"array":void 0===e?"undefined":s(e)}function n(e){return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")}function o(e,t){return null!=e&&"object"===(void 0===e?"undefined":s(e))&&t in e}function i(e,t){return m.call(e,t)}function a(e){return!i(y,e)}function u(e){return String(e).replace(/[&<>"'`=\/]/g,function(e){return w[e]})}function h(t,r){function o(e){if("string"==typeof e&&(e=e.split(b,2)),!v(e)||2!==e.length)throw new Error("Invalid tags: "+e);i=new RegExp(n(e[0])+"\\s*"),s=new RegExp("\\s*"+n(e[1])),u=new RegExp("\\s*"+n("}"+e[1]))}if(!t)return[];var i,s,u,h=[],f=[],d=[],g=!1,m=!1;o(r||e.tags);for(var y,w,N,k,M,_,T=new p(t);!T.eos();){if(y=T.pos,N=T.scanUntil(i))for(var C=0,E=N.length;C<E;++C)k=N.charAt(C),a(k)?d.push(f.length):m=!0,f.push(["text",k,y,y+1]),y+=1,"\n"===k&&function(){if(g&&!m)for(;d.length;)delete f[d.pop()];else d=[];g=!1,m=!1}();if(!T.scan(i))break;if(g=!0,w=T.scan(D)||"name",T.scan(R),"="===w?(N=T.scanUntil(x),T.scan(x),T.scanUntil(s)):"{"===w?(N=T.scanUntil(u),T.scan(F),T.scanUntil(s),w="&"):N=T.scanUntil(s),!T.scan(s))throw new Error("Unclosed tag at "+T.pos);if(M=[w,N,y,T.pos],f.push(M),"#"===w||"^"===w)h.push(M);else if("/"===w){if(!(_=h.pop()))throw new Error('Unopened section "'+N+'" at '+y);if(_[1]!==N)throw new Error('Unclosed section "'+_[1]+'" at '+y)}else"name"===w||"{"===w||"&"===w?m=!0:"="===w&&o(N)}if(_=h.pop())throw new Error('Unclosed section "'+_[1]+'" at '+T.pos);return l(c(f))}function c(e){for(var t,r,n=[],o=0,i=e.length;o<i;++o)(t=e[o])&&("text"===t[0]&&r&&"text"===r[0]?(r[1]+=t[1],r[3]=t[3]):(n.push(t),r=t));return n}function l(e){for(var t,r,n=[],o=n,i=[],s=0,a=e.length;s<a;++s)switch(t=e[s],t[0]){case"#":case"^":o.push(t),i.push(t),o=t[4]=[];break;case"/":r=i.pop(),r[5]=t[2],o=i.length>0?i[i.length-1][4]:n;break;default:o.push(t)}return n}function p(e){this.string=e,this.tail=e,this.pos=0}function f(e,t){this.view=e,this.cache={".":this.view},this.parent=t}function d(){this.cache={}}var g=Object.prototype.toString,v=Array.isArray||function(e){return"[object Array]"===g.call(e)},m=RegExp.prototype.test,y=/\S/,w={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"},R=/\s*/,b=/\s+/,x=/\s*=/,F=/\s*\}/,D=/#|\^|\/|>|\{|&|=|!/;p.prototype.eos=function(){return""===this.tail},p.prototype.scan=function(e){var t=this.tail.match(e);if(!t||0!==t.index)return"";var r=t[0];return this.tail=this.tail.substring(r.length),this.pos+=r.length,r},p.prototype.scanUntil=function(e){var t,r=this.tail.search(e);switch(r){case-1:t=this.tail,this.tail="";break;case 0:t="";break;default:t=this.tail.substring(0,r),this.tail=this.tail.substring(r)}return this.pos+=t.length,t},f.prototype.push=function(e){return new f(e,this)},f.prototype.lookup=function(e){var r,n=this.cache;if(n.hasOwnProperty(e))r=n[e];else{for(var i,s,a=this,u=!1;a;){if(e.indexOf(".")>0)for(r=a.view,i=e.split("."),s=0;null!=r&&s<i.length;)s===i.length-1&&(u=o(r,i[s])),r=r[i[s++]];else r=a.view[e],u=o(a.view,e);if(u)break;a=a.parent}n[e]=r}return t(r)&&(r=r.call(this.view)),r},d.prototype.clearCache=function(){this.cache={}},d.prototype.parse=function(e,t){var r=this.cache,n=r[e];return null==n&&(n=r[e]=h(e,t)),n},d.prototype.render=function(e,t,r){var n=this.parse(e),o=t instanceof f?t:new f(t);return this.renderTokens(n,o,r,e)},d.prototype.renderTokens=function(e,t,r,n){for(var o,i,s,a="",u=0,h=e.length;u<h;++u)s=void 0,o=e[u],i=o[0],"#"===i?s=this.renderSection(o,t,r,n):"^"===i?s=this.renderInverted(o,t,r,n):">"===i?s=this.renderPartial(o,t,r,n):"&"===i?s=this.unescapedValue(o,t):"name"===i?s=this.escapedValue(o,t):"text"===i&&(s=this.rawValue(o)),void 0!==s&&(a+=s);return a},d.prototype.renderSection=function(e,r,n,o){function i(e){return a.render(e,r,n)}var a=this,u="",h=r.lookup(e[1]);if(h){if(v(h))for(var c=0,l=h.length;c<l;++c)u+=this.renderTokens(e[4],r.push(h[c]),n,o);else if("object"===(void 0===h?"undefined":s(h))||"string"==typeof h||"number"==typeof h)u+=this.renderTokens(e[4],r.push(h),n,o);else if(t(h)){if("string"!=typeof o)throw new Error("Cannot use higher-order sections without the original template");h=h.call(r.view,o.slice(e[3],e[5]),i),null!=h&&(u+=h)}else u+=this.renderTokens(e[4],r,n,o);return u}},d.prototype.renderInverted=function(e,t,r,n){var o=t.lookup(e[1]);if(!o||v(o)&&0===o.length)return this.renderTokens(e[4],t,r,n)},d.prototype.renderPartial=function(e,r,n){if(n){var o=t(n)?n(e[1]):n[e[1]];return null!=o?this.renderTokens(this.parse(o),r,n,o):void 0}},d.prototype.unescapedValue=function(e,t){var r=t.lookup(e[1]);if(null!=r)return r},d.prototype.escapedValue=function(t,r){var n=r.lookup(t[1]);if(null!=n)return e.escape(n)},d.prototype.rawValue=function(e){return e[1]},e.name="mustache.js",e.version="2.3.0",e.tags=["{{","}}"];var N=new d;return e.clearCache=function(){return N.clearCache()},e.parse=function(e,t){return N.parse(e,t)},e.render=function(e,t,n){if("string"!=typeof e)throw new TypeError('Invalid template! Template should be a "string" but "'+r(e)+'" was given as the first argument for mustache#render(template, view, partials)');return N.render(e,t,n)},e.to_html=function(r,n,o,i){var s=e.render(r,n,o);if(!t(i))return s;i(s)},e.escape=u,e.Scanner=p,e.Context=f,e.Writer=d,e})},function(e,t,r){"use strict";function n(){this.level=n.INFO}n.TRACE=1,n.DEBUG=2,n.INFO=3,n.WARN=4,n.ERROR=5,n.prototype.setLevel=function(e){this.level=e},n.prototype.trace=function(e){if(this.level<=n.TRACE){var t=arguments;t[0]="[TRACE] "+e,console.log.apply(console,t)}},n.prototype.debug=function(e){if(this.level<=n.DEBUG){var t=arguments;t[0]="[DEBUG] "+e,console.log.apply(console,t)}},n.prototype.info=function(e){if(this.level<=n.INFO){var t=arguments;t[0]="[INFO] "+e,console.log.apply(console,t)}},n.prototype.warn=function(e){if(this.level<=n.WARN){var t=arguments;t[0]="[WARN] "+e,console.log.apply(console,t)}},n.prototype.error=function(e){if(this.level<=n.ERROR){var t=arguments;t[0]="[ERROR] "+e,console.log.apply(console,t)}},e.exports=n,"undefined"!=typeof window&&(window.Logger=n)}]);
//# sourceMappingURL=rdf2h.js.map