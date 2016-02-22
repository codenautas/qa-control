"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var sinon = require('sinon');

function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

var qci = require('../bin/qac-init.js')
describe/*.only*/("qa-control --init", function(){
    describe('initialization', function(){
        it('should load defaults', function(done){
            return qci.initDefaults({projectDir:'./test/fixtures-init/empty'}).then(function(res) {
                //console.log("res",res);
                done();
            });
            
        }, function(err) {
            done(err);
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
        var template;
        before(function(){
            return fs.readJson('./package.json').then(function(json) { /*console.log(template);*/ template = json; })
        });
        it('should clone provided template .json', function(done){
            qci.generateJSon({}, template).then(function(json) {
               expect(json).to.eql(template);
               expect(json).not.to.be(template);
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
            var resJson = clonar(template);
            resJson['name'] = readedParams.name;
            resJson['description'] = readedParams.description;
            resJson['engines']= readedParams.engines;
            qci.generateJSon(readedParams, template).then(function(json) {
               //console.log(json);
               expect(json).to.eql(resJson);
               done(); 
            });
        }, function(err) {
            done(err);
        });
    });
});
