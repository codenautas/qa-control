"use strict";

var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var _ = require('lodash');
var semver = require('semver');

var qaControl={};

qaControl.msgs={
    en:{
        no_package_json: 'package.json must exist',
    },
    es:{
        no_package_json: 'falta el archivo package.json',
        no_qa_control_section_in_package_json: 'falta la sección qa-control en package.json',
        no_package_version_in_qa_control_section: 'falta la sección "package-version" en la sección qa-control',
        invalid_qa_control_version: 'la sección "package-version" en qa-control contiene un valor incorrecto',
        deprecated_qa_control_version: 'la versión de qa-control es vieja',
        lack_of_mandatory_section_1: 'falta la sección obligatoria "$1" en la sección qa-control',
        lack_of_mandatory_file_1: 'falta el archivo obligatorio "$1"',
        invalid_value_1_in_parameter_2: 'valor invalido "$2" para el parametro "$1" en la sección qa-control',
        no_codenautas_section_in_qa_control_project: 'falta la sección codenautas en package.json y aparenta ser un proyecto codenautas',
        no_version_in_section_codenautas: 'falta la entrada para "package-version" en la sección codenautas del package.json',
        deprecated_version: 'la version $1 es demasiado vieja',
        lack_of_mandatory_parameter: 'falta el parámetro obligatorio "$1"',
        
        unparseable_package_json: 'existe package.json pero no puede parsearse',
        no_multilang_section_in_readme: 'falta la sección multilang en el archivo README.md',
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
                    return semver.satisfies(packageJson.version,'0.x.x') && !semver.satisfies(packageJson.version,'0.0.x') && packageJson.codenautas.purpose==null;
                },
                md:'![extending](https://img.shields.io/badge/stability-extending-orange.svg)',
                imgExample:'https://img.shields.io/badge/stability-extending-orange.svg',
                docDescription: 'opt. manual'
            },
            'npm-version':{
                mandatory:true,
                md:'[![version](https://img.shields.io/npm/v/yyy.svg)](https://npmjs.org/package/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/npm-version.png',
                docDescription: ''
            },
            downloads:{
                mandatory:true,
                md:'[![downloads](https://img.shields.io/npm/dm/yyy.svg)](https://npmjs.org/package/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/downloads.png',
                docDescription: ''
            },
            build:{
                mandatory:true,
                md:'[![build](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-linux.png',
                docDescription: 'linux/build'
            },
            windows:{
                mandatory:true,
                md:'[![windows](https://ci.appveyor.com/api/projects/status/github/xxx/yyy?svg=true)](https://ci.appveyor.com/project/xxx/yyy)',
                imgExample:'https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true',
                docDescription: 'casos especiales'
            },
            coverage:{
                mandatory:true,
                md:'[![coverage](https://img.shields.io/coveralls/xxx/yyy/master.svg)](https://coveralls.io/r/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/coverage.png',
                docDescription: ''
            },
            climate:{
                mandatory:true,
                md:'[![climate](https://img.shields.io/codeclimate/github/xxx/yyy.svg)](https://codeclimate.com/github/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/climate.png',
                docDescription: ''
            },
            dependencias:{
                mandatory:true,
                md:'[![dependencies](https://img.shields.io/david/xxx/yyy.svg)](https://david-dm.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-dependencies.png',
                docDescription: ''
            }
        }
    }
};

qaControl.lang = process.env.qa_control_lang || 'en';
qaControl.deprecateVersionesBefore = '0.0.1';

qaControl.rules={
    exist_package_json:{
        checks:[{
            warnings:function(info){
                if(!info.files['package.json']){
                    return [{warning:'no_package_json'}];
                }
                return [];
            }
        }],
        shouldAbort:true
    },
    qa_control_section_in_package_json:{
        checks:[{
            warnings:function(info){
                if(!info.packageJson['qa-control']){
                    return [{warning:info.files['package.json'].content.match(/codenautas/)?
                                'no_codenautas_section_in_qa_control_project':
                                'no_qa_control_section_in_package_json'}];
                }
                return [];
            }
        }],
        shouldAbort:true
    },
    package_version_in_qa_control_section:{
        checks:[{
            warnings:function(info){
                if(!info.packageJson['qa-control']['package-version']){
                    return [{warning:'no_package_version_in_qa_control_section'}];
                }
                return [];
            }
        }],
        shouldAbort:true
    },
    invalid_qa_control_version: {
        checks:[{
            warnings:function(info){
                var ver=info.packageJson['qa-control']['package-version'];
                if(! semver.valid(ver)){
                    return [{warning:'invalid_qa_control_version',params:[ver]}];
                }
                return [];
            }
        }],
        shouldAbort:true
    },
    deprecated_control_version: {
        checks:[{
            warnings:function(info) {
                var ver=info.packageJson['qa-control']['package-version'];
                if(semver.lt(ver, qaControl.deprecateVersionesBefore)){
                    return [{warning:'deprecated_qa_control_version',params:[ver]}];
                }
                return [];
            }
        }],
        shouldAbort:true
    },
    mandatory_files:{
      checks:[{
         warnings:function(info) {
             var warns =[];
             var mandatoryFiles=qaControl.projectDefinition[info.packageJson['qa-control']['package-version']].files;
             for(var fileName in mandatoryFiles) {
                 var file = mandatoryFiles[fileName];
                 if(! info.files[fileName]) {
                     warns.push({warning:'lack_of_mandatory_file_1', params:[fileName]});
                 }
             }
            return warns;
         }
      }],
      shouldAbort:true
    },
    valid_values_for_qa_control_keys:{
        checks:[{
            warnings:function(info){
                var warns=[];
                var qaControlSection=info.packageJson['qa-control'];
                var sections=qaControl.projectDefinition[qaControlSection['package-version']].sections;
                for(var sectionName in sections){
                    var sectionDef=sections[sectionName];
                    if(sectionDef.mandatory && !(sectionName in qaControlSection)){
                        warns.push({warning:'lack_of_mandatory_section_1',params:[sectionName]});
                    }else{
                        var observedValue=qaControlSection[sectionName];
                        if(sectionDef.values && !(observedValue in sectionDef.values)){
                            warns.push({warning:'invalid_value_1_in_parameter_2',params:[observedValue,sectionName]});
                        }
                    }
                };
                return warns;
            }
        }]
    },
    no_multilang_section_in_readme:{
        checks:[{
            warnings:function(info){
                if(! info.files['README.md'].content.match(/<!--multilang v[0-9]+\s+(.+)(-->)/)) {
                    return [{warning:'no_multilang_section_in_readme'}];
                }
                return [];
            }
        }]
    },
};

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

qaControl.loadProject = function loadProject(projectDir) {
    var info = {};
    return Promises.start(function(){
        if(!projectDir) { throw new Error('null projectDir'); }
        return fs.stat(projectDir);
    }).then(function(stat){
        if(! stat.isDirectory()) {
            throw new Error("'"+projectDir+"' is not a directory");
        }
        return fs.readdir(projectDir);
    }).then(function(files) {
        info['files'] = {};
        for(var f in files) { info['files'][files[f]] = {}; }
        if(files.indexOf('package.json') != -1) {
            info['packageJson'] = {};
        }
        return Promises.all(files.map(function(file){
            var iFile = path.normalize(projectDir+'/'+file);
            return fs.readFile(iFile, 'utf8').then(function(content){
                info['files'][file].content = content;
                if(file==='package.json') {
                    info['packageJson'] = JSON.parse(content);
                }
            });
        }));
    }).then(function() {
        return info;
    });
};

qaControl.controlInfo=function controlInfo(info){
    var resultWarnings=[];
    for(var ruleName in qaControl.rules){
        var rule=qaControl.rules[ruleName];
        var fails=0;
        rule.checks.forEach(function(checkInfo){
            var warningsOfThisRule=checkInfo.warnings(info);
            fails+=warningsOfThisRule.length;
            resultWarnings=resultWarnings.concat(warningsOfThisRule);
        });
        if(fails && rule.shouldAbort){
            break;
        }
    }
    return resultWarnings;
}

qaControl.controlProject=function controlProject(projectDir){
    return Promises.start(function(){
        return qaControl.loadProject(projectDir);
    }).then(function(info){
        return qaControl.controlInfo(info);
    });
}

qaControl.obsoleteControlProject=function controlProject(projectDir){
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
                       warns.push({text:msgs.no_codenautas_section_in_qa_control_project, params:[projectDir]});
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
