"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');

var qci = require('../bin/qac-init.js')

describe('qa-control --init', function(){
    it('Param', function(done){
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
});
