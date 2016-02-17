"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');

var qci = require('../bin/qac-init.js')

describe('qa-control --init', function(){
    it('dummy', function(done){
        // return qci.promptForVar('var1', 'def1').then(function(val) {
            // console.log("var1", val);
            // done();
        // }).catch(function(err) {
            // console.log("error", err);
        // });
        expect(true).to.be.ok();
        done();
    }, function(err) {
        done(err);
    });
});
