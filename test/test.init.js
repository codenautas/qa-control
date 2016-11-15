"use strict";

var expect = require('expect.js');
var qaControl = require('..');
var fs = require('fs-promise');
var Path = require('path');
var sinon = require('sinon');
var qci = require('../bin/qac-init.js');
var helper = require('./test.helper.js');

function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

var templateDir = Path.resolve('./bin/init-template');

describe/*.only*/("qa-control --init", function(){
    var templateDir = Path.resolve('./bin/init-template');
    var qacPackageJson;
    before(function() {
        return fs.readJson('./bin/init-package.json').then(function(content) {
            qacPackageJson = content;
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
            return qci.loadJsonIfExists('./bin/init-package.json').then(function(content) {
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
                    existingJson:{'qac-version':ctx.qacPackageJson['qa-control']['package-version']},
                    qacJson:ctx.qacPackageJson
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
                    qacJson:ctx.qacPackageJson
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
                        'qac-version': ctx.qacPackageJson['qa-control']['package-version']
                    },
                    qacJson:ctx.qacPackageJson
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
                    existingJson:{'qac-version':ctx.qacPackageJson['qa-control']['package-version']},
                    qacJson:ctx.qacPackageJson
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
                var expParam = { qacPackageJson:qacPackageJson };
                return qci.loadJsonIfExists(oriJson).then(function(oriJsonContent) {
                    expParam.oriJson = oriJsonContent;
                    return qci.loadIfExists(oriReadme);
                }).then(function(oriReadmeContent) {
                    expParam.oriReadme = oriReadmeContent;
                    var params = { projectDir:'./test/fixtures-init/'+fixture.base };
                    if(fixture.lang) { params['lang'] = fixture.lang; }
                    return qci.initDefaults(params);
                }).then(function(result) {
                    expect(result).to.eql(fixture.expected(expParam));  
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
        it('may do post-processing', function(done){
            var p1 = {name:'v1', def:'def1', post: function(ctx) {
                return '"'+ctx.result.v1+'"';
            }};
            expect(p1.name).to.eql('v1');
            expect(p1.def).to.eql('def1');
            expect(p1.post({result:{'v1':p1.def}})).to.eql('"'+p1.def+'"');
            done();
        }, function(err) {
            done(err);
        });
        it("should valid'ate input parameters (coverage)", function(done){
            qci.configParams.forEach(function(param) {
                switch(param.name) {
                    case 'name': expect(param.valid('proj1')).to.be.ok(); break;
                    case 'version': expect(param.valid('1.0.0')).to.be.ok(); break;
                    case 'organization': expect(param.valid('myorganization')).to.be.ok(); break;
                    case 'author': expect(param.valid('John Doe <john@doe.com>')).to.be.ok(); break;
                    case 'license': expect(param.valid('MIT')).to.be.ok(); break;
                    case 'contributos': expect(param.valid('Jane Doe|jane@doe.com')).to.be.ok(); break;
                    case 'qa-control-version': expect(param.valid('0.3.0')).to.be.ok(); break;
                }
            });
            done();
        }, function(err) {
            done(err);
        });
    });
    describe('readParameters', function(){
        var dummyInput = {
           msgs: qci.cmdMsgs.en 
        };
        it("should read an array of parameters", function(done){
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                return Promise.resolve('value'+param.name.substr(param.name.length-1, 1));
            });
            var params = [
                {name:'v1', def:'def1'},
                {name:'v3', def:'def3'},
                {name:'v2', def:'def2'}
            ];
            
            return qci.readParameters(dummyInput, params).then(function(result) {
                qci.promptForVar.restore();
                expect(result).to.eql({
                       v1: 'value1',
                       v3: 'value3',
                       v2: 'value2'
                });
                done();
            }).catch(function(err) {
                console.log("err", err)
                done(err);
            });
        });
        it("should read an array of parameters using current values", function(done){
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                return Promise.resolve(param.def);
            });
            var params = [
                {name:'v1', def:'def1'},
                {name:'v2', def:'def2', init: function(ctx) { if(ctx.result.v1) { this.def = 'have v1'; } } },
                {name:'v3', def:'def3', init: function(ctx) { if(ctx.result.v2) { this.def = 'have v2'; } } },
                {name:'v4', def:'def4', post: function(ctx) { return '<'+ctx.result.v4+'>'; }}
            ];
            return qci.readParameters({}, params).then(function(result) {
                qci.promptForVar.restore();
                expect(result).to.eql({
                       v1: 'def1',
                       v2: 'have v1',
                       v3: 'have v2',
                       v4: '<def4>'
                });
                done();
            }).catch(function(err) {
                console.log("err", err)
                done(err);
            });
        });
        it("should handle errors in the prompt", function(done) {
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                if(param.name=='v2') { return Promise.reject('dummy error'); }
                return Promise.resolve(param.def);
            });
            var params = [ {name:'v1', def:'def1'}, {name:'v2', def:'def2'}];
            qci.readParameters({}, params).then(function(result) {
                done(result);
            }).catch(function(err) {
                qci.promptForVar.restore();
                expect(err).to.eql({message:'input_error', desc:'dummy error'});
                done();                    
            });
        });
        it("should default values for valid input", function(done) {
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                if(param.name=='v2') { return Promise.reject('dummy error'); }
                return Promise.resolve(param.def);
            });
            var params = [ {name:'v1', def:'def1'}, {name:'v2', def:'def2'}];
            qci.readParameters({}, params).then(function(result) {
                done(result);
            }).catch(function(err) {
                qci.promptForVar.restore();
                expect(err).to.eql({message:'input_error', desc:'dummy error'});
                done();                    
            });
        });
        it("should forward the context to parameters", function(done) {
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                return Promise.resolve(param.def);
            });
            var params = [
                {name:'v1', def:'def1', init:function(ctx) {
                    this.def = ctx.input.existingJson.e1;
                }},
                {name:'v2', def:'def2', init:function(ctx) {
                    this.def = ctx.input.qacJson['qa2'];
                }},
                {name:'v3', def:'def3', init:function(ctx) {
                    this.def = ctx.input.dummy;
                }}
            ];
            var inputParams = {
                dummy:'dummy',
                existingJson : {e1:'e1', e2:'e2'},
                qacJson: {qa1:'qa1', qa2:'qa2'}
            };
            qci.readParameters(inputParams, params).then(function(result) {
                qci.promptForVar.restore();
                expect(result.v1).to.be(inputParams.existingJson.e1);
                expect(result.v2).to.be(inputParams.qacJson.qa2);
                expect(result.v3).to.be(inputParams.dummy);
                expect(result).to.eql({
                       v1: 'e1',
                       v2: 'qa2',
                       v3: 'dummy'
                });
                done();
            }).catch(function(err) {
                done(err);                    
            });
        });
        it("should skip parameters where requested", function(done) {
            var promptedParameters=0;
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                ++promptedParameters;
                return Promise.resolve(param.def);
            });
            var params = [
                {name:'v1', def:'def1', noPrompt:true},
                {name:'v2', def:'def2'},
                {name:'v3', def:'def3', noPrompt:true, init:function(ctx) { this.def = 'init v3'}},
                {name:'v4', def:'def4'},
            ];
            qci.readParameters(dummyInput, params).then(function(result) {
                expect(promptedParameters).to.eql(2);
                expect(result).to.eql({
                    v1: 'def1',
                    v2: 'def2',
                    v3: 'init v3',
                    v4: 'def4',
                })
                qci.promptForVar.restore();
                done();
            }).catch(done);
        });
        it("should exclude temporary parameters where requested", function(done) {
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                return Promise.resolve(param.name=='v2' ? 'promptedV2' : param.def);
            });
            var params = [
                {name:'v1', def:'def1', noPrompt:true},
                {name:'v2', def:'def2', temporary:true},
                {name:'v3', def:'def3', post:function(ctx) { return 'v3 haves '+ctx.result.v2; } }
            ];
            qci.readParameters(dummyInput, params).then(function(result) {
                //console.log("result", result);
                expect(result).to.eql({
                    v1: 'def1',
                    v3: 'v3 haves promptedV2'
                });
                qci.promptForVar.restore();
                done();
            }).catch(done);
        });
    });
    describe("J-Son output", function(){
        it('should clone provided template .json', function(done){
            qci.generateJSon({}, qacPackageJson).then(function(generatedJson) {
               expect(generatedJson).to.eql(qacPackageJson);
               expect(generatedJson).not.to.be(qacPackageJson);
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
            qci.generateJSon(readedParams, qacPackageJson).then(function(generatedJson) {
               //console.log(generatedJson);
               expect(generatedJson).to.eql(resJson);
               done(); 
            });
        }, function(err) {
            done(err);
        });
    });
    describe("templates", function(){
        it('should substitute values', function(done){
            var testTplDir = './test/fixtures-init/templates';
            var tests = {};
            sinon.stub(fs, 'writeFile', function(fileName, content) {
                //console.log("stub writeFile", fileName, content)
                return Promise.resolve(content);
            });
            return fs.readdir(testTplDir).then(function(files) {
                return Promise.all(files.map(function(file){
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
                var testsArray = [];
                for(var t in tests) { testsArray.push(tests[t]); }
                return Promise.all(testsArray.map(function(test) {
                    return qci.writeTemplate(test.input.file, test.output.file, kvPairs).then(function(out) {
                        expect(out).to.eql(test.output.data);
						//console.log("out", out);
                    });
                }));
            }).then(function() {
                fs.writeFile.restore();
                done();
            }).catch(done);
        });
    });
    describe("regular expressions", function(){
        it('names', function(done){
            expect('pepe').to.match(qci.re.name);
            expect('Pepe').to.match(qci.re.name);
            expect('P').not.to.match(qci.re.name);
            expect('P3').not.to.match(qci.re.name);
            expect('_pepe_').not.to.match(qci.re.name);
            
            expect('pepe').to.match(qci.re.namex);
            expect('pepe-sanchez').to.match(qci.re.namex);
            expect('pepewithwith-slash').to.match(qci.re.namex);
            expect('p').not.to.match(qci.re.namex);
            expect('P').not.to.match(qci.re.namex);
            
            expect('pepe').to.match(qci.re.namexs);
            expect('pepe-sanchez').to.match(qci.re.namexs);
            expect('pepewith-slashesand.dot').to.match(qci.re.namexs);
            expect('P').not.to.match(qci.re.namexs);
            expect('pa').to.match(qci.re.namexs);
            expect('pepe1').to.match(qci.re.namexs);
            expect('pepe2').to.match(qci.re.namexs);
            
            expect('pepe').not.to.match(qci.re.namexcml);
            expect('pepe-sanchez').not.to.match(qci.re.namexcml);
            expect('pepewith-slashesand.dot').not.to.match(qci.re.namexcml);
            expect('P').not.to.match(qci.re.namexcml);
            expect('Pa').to.match(qci.re.namexcml);
            expect('Pepe1').to.match(qci.re.namexcml);
            expect('pepe2').not.to.match(qci.re.namexcml);
            
            done(); 
        }, function(err) {
            done(err);
        });
       it('e-mail', function(done){
            expect('pepe@server').not.to.match(qci.re.email);
            expect('pepe@server.dom').to.match(qci.re.email);
            expect('<pepe@server.dom>').to.match(qci.re.email);
            expect('pepe.sanchez@server.dom').to.match(qci.re.email);
            expect('Pepe.sanchez@server.dom').to.match(qci.re.email);
            expect('<Pepe.sanchez@server.dom>').to.match(qci.re.email);
            // hay que mejorarla para que falle con el siguiente
            // expect('<Pepe.sanchez@server.dom').not.to.match(qci.re.email);
            done(); 
        }, function(err) {
            done(err);
        });
    });
    describe("generation", function(){
        function loadDir(fullPath) {
            var info = {};
            return fs.readdir(fullPath).then(function(files) {
                return Promise.all(files.map(function(file){
                    var fPath = Path.normalize(fullPath+'/'+file);
                    return fs.readFile(fPath, {encoding:'utf8'}).then(function(content) {
                        info[file] = content;
                    });
                }));
            }).then(function() {
                return info;
            });
        }
        it('init', function(done) {
            var outDir = Path.resolve(helper.dirbase+'/gen-init');
            var testDir = Path.resolve('./test/fixtures-init/initialized');
            var infoGen, infoTest;
            sinon.stub(qci, 'promptForVar', function(param, msgs) {
                //console.log("PFV", param)
                var ret=param.def;
                switch(param.name) {
                    case 'description': ret='The description'; break;
                    case 'contributors': ret='Diego:diegoefe@unemail.com'; break;
                }
                return Promise.resolve(ret);
            });
            fs.mkdir(outDir).then(function() {
                return qci.init({projectDir:outDir});
            }).then(function() {
                return loadDir(outDir);
            }).then(function(info) {
                infoGen = info;
                return loadDir(testDir);                
            }).then(function(info) {
               infoTest = info;
               //console.log("gen", infoGen); console.log("test", infoTest);
               for(var file in infoTest) {
                   expect(file in infoGen).to.be.ok();
                   //console.log("file", file);
                   expect(infoTest[file].content).to.eql(infoGen[file].content);
               }
               qci.promptForVar.restore();
               done(); 
            }).catch(function(err) {
                console.log("err", err)
                done(err);
            });
        }, function(err) {
            done(err);
        });
    });
});
