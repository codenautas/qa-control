"use strict";

var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var _ = require('lodash');

var qaControl={};

qaControl.msgs={
  en:{
    no_package_json: 'no package json in %',
    no_codenautas_section: 'no codenautas section in package.json',
    no_codenautas_section_in_codenautas_project: 'no codenautas section in codenautas project',
    unparseable_package_json: 'package.json exists but cannot be parsed'
  },
  es:{
    no_package_json: 'no hay un archivo package.json en %',
    no_codenautas_section: 'falta la sección codenautas en package.json',
    no_codenautas_section_in_codenautas_project: 'falta la sección codenautas en un proyecto de codenautas',
    unparseable_package_json: 'existe package.json pero no puede parsearse'
  }
}

qaControl.lang = process.env.qa_control_lang || 'en';

function findCodenautas(obj, key) {
    if(_.has(obj, key)) { return [obj]; }
    var k=_.find(obj, function(v) { return v==key; });
    if(k) { return [k]; }
    return _.flatten(_.map(obj, function(v) {
        return typeof v == "object" ? findCodenautas(v, key) : [];
    }), true);
}

qaControl.controlProject=function controlProject(projectDir){
    var warns=[];
    var msgs = qaControl.msgs[qaControl.lang];
    var packageJSon=path.normalize(projectDir+'/package.json');
    return Promises.start(function(){
        if(!projectDir) { throw new Error('null projectDir'); }
        return fs.exists(projectDir);
    }).then(function(exists) {
        if(!exists) { throw new Error("'"+projectDir+"' does not exists"); }
        return fs.stat(projectDir);
    }).then(function(stat) {
        if(! stat.isDirectory()) {  }
        if(stat.isDirectory()) {
            return fs.exists(path.normalize(packageJSon));
        }
        throw new Error("'"+projectDir+"' is not a directory");
    }).then(function(existsPJSon) {
        if(!existsPJSon) {
            warns.push({text:msgs.no_package_json, params:[projectDir]});
            return warns;
        }
        return fs.readJson(packageJSon).catch(function(err) {
            return {errorInJSon:true};
        }).then(function(json) {
           if(json.errorInJSon) {
               warns.push({text:msgs.unparseable_package_json, params:[projectDir]});
           } else {
               if(findCodenautas(json, "codenautas").length==0) {
                   warns.push({text:msgs.no_codenautas_section, params:[projectDir]});
               } else {
               }
           }
           return warns;
        });
    });
};

module.exports = qaControl;
