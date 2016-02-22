"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/* global describe */
/* global it */

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');

var initHelper = {};

initHelper.templateDir = Path.resolve('./bin/init-template');

before(function(done){
    Promises.start(function(){
        return fs.readJson('./package.json');
    }).then(function(json){
        initHelper.qacPackageJson = json;
    }).then(function(){
        done();
    }).catch(function(err){
        console.log(err);
        done(_.isArray(err)?err[0]:err);
    });
});

console.log("IH", initHelper);
module.exports = initHelper;