"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var stableProject = {};

stableProject.fun = function(){
    return "fun";
};//; don't remove this comment. It is for test issue #26

module.exports = stableProject;