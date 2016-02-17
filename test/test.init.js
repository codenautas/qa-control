"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var sinon = require('sinon');

var qci = require('../bin/qac-init.js')

describe('qa-control --init', function(){
    it('Params may use current result', function(done){
        var p1 = new qci.Param('v1', 'def1', function(curResult) {});
        var p2 = new qci.Param('v2', 'def2', function(curResult) {
            if(curResult.v1) {
                this.def = 'using '+curResult.v1;
            }
        });
        expect(p1.name).to.eql('v1');
        expect(p1.def).to.eql('def1');
        expect(p2.name).to.eql('v2');
        expect(p2.def).to.eql('def2');
        var curResult = { v1: 'val1' };
        p2.init(curResult);
        expect(p2.def).to.eql('using val1');
        done();
    }, function(err) {
        done(err);
    });
    it("Reading of array of Param's", function(done){
        sinon.stub(qci, 'promptForVar', function(name, defaultvalue) {
            return Promises.resolve('value'+name.substr(name.length-1, 1));
        });
        var params = [
            new qci.Param('v1', 'def1', function(curResult) {}),
            new qci.Param('v2', 'def2', function(curResult) {}),
            new qci.Param('v3', 'def3', function(curResult) {})
        ];
        return qci.readParameters(params).then(function(result) {
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
    it.skip("Reading of array of Param's using current values", function(done){
        sinon.stub(qci, 'promptForVar', function(name, def) {
            return Promises.resolve(def);
        });
        var params = [
            new qci.Param('v1', 'def1', function(curResult) {}),
            new qci.Param('v2', 'def2', function(curResult) { console.log("CR", curResult); if(curResult.v1) { this.def = 'have v1'; } }),
            new qci.Param('v3', 'def3', function(curResult) { console.log("CR", curResult); if(curResult.v2) { this.def = 'have v2'; } })
        ];
        return qci.readParameters(params).then(function(result) {
            qci.promptForVar.restore();
            expect(result).to.eql({
                   v1: 'def1',
                   v2: 'have v1',
                   v3: 'have v3'
            });
            done();
        }).catch(function(err) {
            done(err);
        });
    });
});
