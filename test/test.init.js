"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var sinon = require('sinon');

var qci = require('../bin/qac-init.js')
describe/*.only*/("qa-control --init", function(){
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
                {name:'v2', def:'def2'},
                {name:'v3', def:'def3'}
            ];
            return qci.readParameters(params, {}, {}).then(function(result) {
                qci.promptForVar.restore();
                expect(result).to.eql({
                       v1: 'value1',
                       v2: 'value2',
                       v3: 'value3'
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
});
