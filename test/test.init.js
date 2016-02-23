"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var sinon = require('sinon');
var qci = require('../bin/qac-init.js')

function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

var templateDir = Path.resolve('./bin/init-template');

describe/*.only*/("qa-control --init", function(){
    var templateDir = Path.resolve('./bin/init-template');
    var qacPackageJson;
    before(function() {
        return fs.readJson('./package.json').then(function(json) {
            qacPackageJson = json;
        });
    });
    describe("load*IfExists()", function(){
        it('load simple file', function(done){
            return qci.loadIfExists('./test/fixtures-init/templates/LEEME.tpl').then(function(content) {
                expect(content.length).to.be.above(10);
                return qci.loadIfExists('./my/inexistent/file');
            }).then(function(content) {
                expect(content).to.be(null);
                done();
            });
        }, function(err) {
            done(err);
        });
        it('load J-Son file', function(done){
            return qci.loadJsonIfExists('./package.json').then(function(content) {
                expect(content).to.be.eql(qacPackageJson);
                return qci.loadJsonIfExists('./my/inexistent/file.json');
            }).then(function(content) {
                expect(content).to.be(null);
                done();
            });
            
        }, function(err) {
            done(err);
        });
    });
    describe('test initialization by fixtures', function(){
        var fixtures=[{
            title:'should load from empty directory',
            base:'empty',
            expected: function(ctx) {
                return {
                    outDir:'./test/fixtures-init/empty',
                    msgs:qci.cmdMsgs.en,
                    tplDir:templateDir,
                    existingJson:{'qac-version':ctx.qapj['qa-control']['package-version']},
                    qacJson:ctx.qapj
                }
            }
        },{
            title:'should load from directory with existing package.json',
            base:'existing-with-package-json',
            expected: function(ctx) {
                ctx.oriJson['qac-version'] = ctx.oriJson['qa-control']['package-version'];
                return {
                    outDir:'./test/fixtures-init/existing-with-package-json',
                    msgs:qci.cmdMsgs.en,
                    tplDir:templateDir,
                    existingJson:ctx.oriJson,
                    qacJson:ctx.qapj
                }
            }
        },{
            title:'should load from directory with existing README',
            base:'existing-with-readme',
            expected: function(ctx) {
                return {
                    outDir:'./test/fixtures-init/existing-with-readme',
                    msgs:qci.cmdMsgs.en,
                    tplDir:templateDir,
                    existingJson:{
                        'name': 'existing-with-readme',
                        'description': 'Existing with readme with description',
                        'qac-version': ctx.qapj['qa-control']['package-version']
                    },
                    qacJson:ctx.qapj
                }
            }
        },{
            title:'should select the right language',
            base:'empty',
            lang:'es',
            expected: function(ctx) {
                return {
                    outDir:'./test/fixtures-init/empty',
                    msgs:qci.cmdMsgs.es,
                    tplDir:templateDir,
                    existingJson:{'qac-version':ctx.qapj['qa-control']['package-version']},
                    qacJson:ctx.qapj
                }
            }
        }];
        fixtures.forEach(function(fixture){
            //console.log("fi", fixture);
            var fixtureName='fixture: '+fixture.title;
            if(fixture.skipped){
                it.skip(fixtureName, function(){});
                return;
            }
            it(fixtureName, function(done) {
                var oriJson = Path.resolve('./test/fixtures-init/'+fixture.base+'/package.json');
                var oriReadme = Path.resolve('./test/fixtures-init/'+fixture.base+'/README.md');
                var expParam = { qapj:qacPackageJson };
                return qci.loadJsonIfExists(oriJson).then(function(ojs) {
                    expParam.oriJson = ojs;
                    return qci.loadIfExists(oriReadme);
                }).then(function(ordm) {
                    expParam.oriReadme = ordm;
                    var params = { projectDir:'./test/fixtures-init/'+fixture.base };
                    if(fixture.lang) { params['lang'] = fixture.lang; }
                    return qci.initDefaults(params);
                }).then(function(res) {
                    expect(res).to.eql(fixture.expected(expParam));  
                }).then(function(){
                    done();
                }).catch(done);
            });
        });
    });
    describe("parameters", function(){
        it('may use current result', function(done){
            var p1 = {name:'v1', def:'def1'};
            var p2 = {name:'v2', def:'def2', init: function(ctx) {
                if(ctx.result.v1) {
                    this.def = 'using '+ctx.result.v1;
                }
            }};
            expect(p1.name).to.eql('v1');
            expect(p1.def).to.eql('def1');
            expect(p2.name).to.eql('v2');
            expect(p2.def).to.eql('def2');
            var ctx = { result: { v1: 'val1' } };
            p2.init(ctx);
            expect(p1.def).to.eql('def1');
            expect(p2.def).to.eql('using val1');
            done();
        }, function(err) {
            done(err);
        });
    });
    describe('readParameters', function(){
        it("should read an array of parameters", function(done){
            sinon.stub(qci, 'promptForVar', function(name, defaultvalue) {
                return Promises.resolve('value'+name.substr(name.length-1, 1));
            });
            var params = [
                {name:'v1', def:'def1'},
                {name:'v3', def:'def3'},
                {name:'v2', def:'def2'}
            ];
            return qci.readParameters(params, {}, {}).then(function(result) {
                qci.promptForVar.restore();
                expect(result).to.eql({
                       v1: 'value1',
                       v3: 'value3',
                       v2: 'value2'
                });
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it("should read an array of parameters using current values", function(done){
            sinon.stub(qci, 'promptForVar', function(name, def) {
                return Promises.resolve(def);
            });
            var params = [
                {name:'v1', def:'def1'},
                {name:'v2', def:'def2', init: function(ctx) { if(ctx.result.v1) { this.def = 'have v1'; } } },
                {name:'v3', def:'def3', init: function(ctx) { if(ctx.result.v2) { this.def = 'have v2'; } } }
            ];
            return qci.readParameters(params, {}, {}).then(function(result) {
                qci.promptForVar.restore();
                expect(result).to.eql({
                       v1: 'def1',
                       v2: 'have v1',
                       v3: 'have v2'
                });
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it("should handle errors in the prompt", function(done) {
            sinon.stub(qci, 'promptForVar', function(name, def) {
                if(name=='v2') { return Promises.reject('dummy error'); }
                return Promises.resolve(def);
            });
            var params = [ {name:'v1', def:'def1'}, {name:'v2', def:'def2'}];
            qci.readParameters(params, {}, {}).then(function(result) {
                done(result);
            }).catch(function(err) {
                qci.promptForVar.restore();
                expect(err).to.eql({message:'input_error', desc:'dummy error'});
                done();                    
            });
        });
        it("should forward the context to parameters", function(done) {
            sinon.stub(qci, 'promptForVar', function(name, def) {
                return Promises.resolve(def);
            });
            var params = [
                {name:'v1', def:'def1', init:function(ctx) {
                    this.def = ctx.defs;
                }},
                {name:'v2', def:'def2', init:function(ctx) {
                    this.def = ctx.qac;
                }}
            ];
            var existingJson = {e1:'e1', e2:'e2'};
            var qacJson = {qa1:'qa1', qa2:'qa2'};
            qci.readParameters(params, existingJson, qacJson).then(function(result) {
                qci.promptForVar.restore();
                expect(result.v1).to.be(existingJson);
                expect(result.v2).to.be(qacJson);
                expect(result).to.eql({
                       v1: existingJson,
                       v2: qacJson
                });
                done();
            }).catch(function(err) {
                done(err);                    
            });
        });
    });
    describe("J-Son output", function(){
        it('should clone provided template .json', function(done){
            qci.generateJSon({}, qacPackageJson).then(function(json) {
               expect(json).to.eql(qacPackageJson);
               expect(json).not.to.be(qacPackageJson);
               done(); 
            });
        }, function(err) {
            done(err);
        });
        it('should modify only provided properties in readed parameters', function(done){
            var readedParams = {
                'name': 'fixed name',
                'description': 'fixed description',
                'engines': {node: ">= 4.0.0"}
            }
            var resJson = clonar(qacPackageJson);
            resJson['name'] = readedParams.name;
            resJson['description'] = readedParams.description;
            resJson['engines']= readedParams.engines;
            qci.generateJSon(readedParams, qacPackageJson).then(function(json) {
               //console.log(json);
               expect(json).to.eql(resJson);
               done(); 
            });
        }, function(err) {
            done(err);
        });
    });
    describe("templates", function(){
        try {
        it.skip('should substitute values', function(done){
            var testTplDir = './test/fixtures-init/templates';
            var tests = {};
            sinon.stub(fs, 'writeFile', function(fileName, content) {
                //console.log("stub writeFile", fileName, content)
                return Promises.resolve(content);
            });
            return fs.readdir(testTplDir).then(function(files) {
                return Promises.all(files.map(function(file){
                    var fPath = Path.normalize(testTplDir+'/'+file);
                    return fs.readFile(fPath, {encoding:'utf8'}).then(function(content) {
                        var name = file.substr(0, file.length-4);
                        if(! (name in tests)) { tests[name] = {}; }
                        var f = tests[name];
                        if(file.match(/(.tpl)$/)) {
                           f.input = { file: fPath, data: content };
                        } else {
                            f.output = { file: fPath, data: content };
                        }
                    });
                }));
            }).then(function() {
                var keys = ['year', 'author', 'name', 'desc', 'cucardas'];
                var kvPairs = {};
                keys.forEach(function(key) {
                   kvPairs[key] = 'valueOf'+ key.charAt(0).toUpperCase() + key.slice(1); 
                });
                var testsA = [];
                for(var t in tests) { testsA.push(tests[t]); }
                return Promises.all(testsA.map(function(test) {
                    return qci.writeTemplate(test.input.file, test.output.file, kvPairs).then(function(out) {
                        console.lg("out", out);
                    });
                }));
            }).then(function() {
                fs.writeFile.restore();
                done();
            });
        }, function(err) {
            console.log("err", err);
            done(err);
        });
        }catch(e) {
            console.log("e", e);
            done(e);
        }
    });
});
