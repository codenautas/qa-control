"use strict";
/* eqnull:true */

var winOS = Path.sep==='\\';

var StableProject = {};

function eid(id){ return document.getElementById(id); }

StableProject.fun = function(){
    return "fun";
}

module.exports = StableProject;