"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/* global describe */
/* global it */

var fs = require('fs-promise');
var Path = require('path');

var testHelper = {};

if(process.env.TRAVIS){
    testHelper.dirbase = process.env.HOME;
}else if(process.env.APPVEYOR){
    testHelper.dirbase = 'C:\\Users\\appveyor\\AppData\\Local\\Temp';
}else{
    testHelper.dirbase = process.env.TMP || process.env.TEMP || '/tmp';
}
testHelper.dirbase+='/temp-qa-control';
testHelper.dirbase = Path.normalize(testHelper.dirbase);

before(function(done){
    this.timeout(5000);
    Promise.resolve().then(function(){
        return fs.remove(testHelper.dirbase);
    }).catch(function(err) {
        console.log("err", err);
    }).then(function(){
        return fs.mkdir(testHelper.dirbase);
    }).catch(function(err){
        console.log(err);
        done(_.isArray(err)?err[0]:err);
    }).then(function() {
        done();
    });
});
    
module.exports = testHelper;