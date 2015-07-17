"use strict";

var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var _ = require('lodash');

var qaControl={};

qaControl.msgs={
    en:{
        no_package_json: 'no package json in $1',
        no_codenautas_section: 'no codenautas section in package.json',
        no_codenautas_section_in_codenautas_project: 'no codenautas section in apparently a codenautas project',
        no_version_in_section_codenautas: 'the section codenautas in package.json lacks a "package-version" section',
        deprecated_version: 'version $1 is too old',
        lack_of_mandatory_parameter: 'mandatory parameter "$1" is missing',
        invalid_value_1_in_parameter_2: 'invalid value "$2" in parameter "%1"',
        unparseable_package_json: 'package.json exists but cannot be parsed'
    },
    es:{
        no_package_json: 'no hay un archivo package.json en $1',
        no_codenautas_section: 'falta la sección codenautas en package.json',
        no_codenautas_section_in_codenautas_project: 'falta la sección codenautas en package.json y aparenta ser un proyecto codenautas',
        no_version_in_section_codenautas: 'falta la entrada para "package-version" en la sección codenautas del package.json',
        deprecated_version: 'la version $1 es demasiado vieja',
        lack_of_mandatory_parameter: 'falta el parámetro obligatorio "$1"',
        invalid_value_1_in_parameter_2: 'valor invalido "$2" para el parametro "%1"',
        unparseable_package_json: 'existe package.json pero no puede parsearse'
    }
};

qaControl.projectDefinition = {
    '0.0.1': {
        sections: { // podria llamarse 'json-sections'...
            'run-in': {
                mandatory: true,
                values: {
                    server:{},
                    both:{},
                    client:{}
                }
            },
            type: {
                mandatory:true
            }
        },
        files:{
            'README.md':{ mandatory:true },
            'LEEME.md':{ mandatory:true },
            '.travis.yml':{ mandatory:true },
            '.gitignore':{ mandatory:true },
            'LICENSE':{ mandatory:true },
            'appveyor.yml':{
                presentIf:function(packageJson){
                    return !!packageJson.codenautas["test-appveyor"];
                }
            }
        },
        cucardas:{
            designing:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'0.0.x') && packageJson.codenautas.purpose==null
                },
                md:'![designing](https://img.shields.io/badge/stability-desgining-red.svg)',
                imgExample:'https://img.shields.io/badge/stability-desgining-red.svg',
                docDescription: 'opt. manual'
            },
            extending:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'>0.x.x' ) && packageJson.codenautas.purpose==null
                },
                md:'![extending](https://img.shields.io/badge/stability-extending-orange.svg)',
                imgExample:'https://img.shields.io/badge/stability-extending-orange.svg',
                docDescription: 'opt. manual'
            },
            npm-version:{mandatory:true},
                md:'[![version](https://img.shields.io/npm/v/yyy.svg)](https://npmjs.org/package/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/npm-version.png',
                docDescription: ''
            },
            windows:{mandatory:true},
                md:'[![windows](https://ci.appveyor.com/api/projects/status/github/xxx/yyy?svg=true)](https://ci.appveyor.com/project/xxx/yyy)',
                imgExample:'https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true',
                docDescription: 'casos especiales'
            }
        }
    }
};

qaControl.lang = process.env.qa_control_lang || 'en';
qaControl.deprecateVersionesBefore = '0.0.1';

function findCodenautas(obj, key) {
    if(_.has(obj, key)) { return [obj]; }
    var k=_.find(obj, function(v) {
        return typeof(v)=="string" ? new RegExp(key, 'i').test(v) : findCodenautas(v, key).length;
    });
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
                   if(!json.codenautas) {
                       warns.push({text:msgs.no_codenautas_section_in_codenautas_project, params:[projectDir]});
                   } else if(! ("package-version" in json.codenautas)) {
                       warns.push({text:msgs.no_version_in_section_codenautas, params:[projectDir]});
                   } else if(json.codenautas["package-version"] < qaControl.deprecateVersionesBefore) {
                       warns.push({text:msgs.deprecated_version, params:[json.codenautas["package-version"]]});
                   } else {
                     var sections = qaControl.projectDefinition[qaControl.deprecateVersionesBefore].sections;
                     for(var param in sections) {
                        if(sections[param].mandatory) {
                            warns.push({text:msgs.lack_of_mandatory_parameter, params:[param]});
                        }
                     }
                   }
               }
           }
           return warns;
        });
    });
};

module.exports = qaControl;
