"use strict";

var _ = require("lodash");
var yaml = require('js-yaml');
var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');

var qaControl={};

qaControl.msgs={
  en:{
    no_package_json: 'no package json in %',
    no_codenautas_section: 'no codenautas section in package.json'
  },
  es:{
    no_package_json: 'no hay un archivo package.json en %',
    no_codenautas_section: 'falta la sección codenautas en package.json'
  }
}

qaControl.lang = process.env.qa_control_lang || 'en';

qaControl.controlProject=function controlProject(projectDir){
    var warns=[];
    var msgs = qaControl[qaControl.lang];
    return Promises.start(function(){
        if(!projectDir) { throw new Error('null projectDir'); }
        return fs.exists(projectDir);
    }).then(function(exists) {
        if(!exists) { throw new Error("'"+projectDir+"' does not exists"); }
        return fs.stat(projectDir);
    }).then(function(stat) {
        if(! stat.isDirectory()) {  }
        if(stat.isDirectory()) {
            return fs.exists(path.normalize(projectDir+"/package.json"));
        }
        throw new Error("'"+projectDir+"' is not a directory");
    }).then(function(existsPJSon) {
        if(!existsPJSon) {
            warns.push({text:msgs.no_package_json, params:[projectDir]});
        }
        return warns;
    });
};

module.exports = qaControl;
