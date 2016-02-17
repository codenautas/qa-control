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
        sinon.stub(qci, 'promptForVar', function(name, defaultValue) {
            switch(name) {
                case 'v1': return Promises.resolve('value1');
                case 'v2': return Promises.resolve('value2');
                case 'v3': return Promises.resolve('value3');
                default:
                    return Promises.reject(name+' is not expected');
            }
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
});
