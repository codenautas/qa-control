"use strict";

var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var _ = require('lodash');
var semver = require('semver');

var qaControl={};

qaControl.msgs={
    en:{
        // TODO
    },
    es:{
        deprecated_qa_control_version: 'la versión de qa-control es vieja',
        deprecated_version: 'la version $1 es demasiado vieja',
        invalid_qa_control_version: 'la sección "package-version" en qa-control contiene un valor incorrecto',
        invalid_value_1_in_parameter_2: 'valor invalido "$2" para el parametro "$1" en la sección qa-control',
        lack_of_mandatory_file_1: 'falta el archivo obligatorio "$1"',
        lack_of_mandatory_parameter: 'falta el parámetro obligatorio "$1"',
        lack_of_mandatory_section_1: 'falta la sección obligatoria "$1" en la sección qa-control',
        no_codenautas_section_in_qa_control_project: 'falta la sección codenautas en package.json y aparenta ser un proyecto codenautas',
        no_multilang_section_in_readme: 'falta la sección multilang en el archivo README.md',
        no_package_json: 'falta el archivo package.json',
        no_package_version_in_qa_control_section: 'falta la sección "package-version" en la sección qa-control',
        no_qa_control_section_in_package_json: 'falta la sección qa-control en package.json',
        no_version_in_section_codenautas: 'falta la entrada para "package-version" en la sección codenautas del package.json',
        //unparseable_package_json: 'existe package.json pero no puede parsearse',
        lack_of_cucarda_marker_in_readme:'falta la sección "cucardas" en README.md',
        lack_of_mandatory_cucarda_1: 'falta la cucarda oblicatoria $1',
        wrong_format_in_cucarda_1: 'la cucarda "$1" tiene formato incorrecto',
        lack_of_mandatory_line_1_in_file_2: 'falta la linea obligatoria $1 en el archivo $2',
        file_1_does_not_match_custom_2: '$1 no respeta la custombre $2',
        first_line_does_not_match_in_file_1: 'las primeras líneas no coinciden en $1',
        repository_name_not_found: 'pacakgeJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/'
    }
};

// devuelve un buffer con los \n, \r\n, \r como \n
qaControl.fixEOL = function fixEOL(buf) {
    return buf.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

// bufTest debe empezar con bufStart
qaControl.startsWith = function startsWith(bufTest, bufStart) {
    return qaControl.fixEOL(bufTest).indexOf(qaControl.fixEOL(bufStart))==0;
};

// devuelve el contenido para el archivo de salida (p.e. cucardas.log)
qaControl.cucaMarker = '<!-- cucardas -->';
qaControl.generateCucardas = function generateCucardas(cucardas, packageJson) {
    var cucaFileContent = qaControl.cucaMarker+'\n';
    var modulo=packageJson.name;
    var repo=packageJson.repository.replace('/'+modulo,'');
    for(var nombreCucarda in cucardas) {
        var cucarda = cucardas[nombreCucarda];
        if(!cucarda.check || cucarda.check(packageJson)) {
            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
            cucaFileContent += cucaStr +'\n';
        }
    }
    return cucaFileContent;
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
            '.gitignore':{
                mandatory:true,
                mandatoryLines:['local-*','*-local.*']
            },
            'LICENSE':{ mandatory:true },
            'appveyor.yml':{
                presentIf:function(packageJson){
                    return !!packageJson['qa-control']["test-appveyor"];
                }
            }
        },
        cucardas:{
            designing:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'0.0.x') && packageJson['qa-control'].purpose==null
                },
                md:'![designing](https://img.shields.io/badge/stability-desgining-red.svg)',
                imgExample:'https://img.shields.io/badge/stability-desgining-red.svg',
                docDescription: 'opt. manual'
            },
            extending:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'0.x.x') && !semver.satisfies(packageJson.version,'0.0.x') && packageJson['qa-control'].purpose==null;
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
                md:'[![linux](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-linux.png',
                docDescription: 'linux/build'
            },
            windows:{
                md:'[![windows](https://ci.appveyor.com/api/projects/status/github/xxx/yyy?svg=true)](https://ci.appveyor.com/project/xxx/yyy)',
                imgExample:'https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true',
                docDescription: 'casos especiales'
            },
            coverage:{
                md:'[![coverage](https://img.shields.io/coveralls/xxx/yyy/master.svg)](https://coveralls.io/r/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/coverage.png',
                docDescription: ''
            },
            climate:{
                md:'[![climate](https://img.shields.io/codeclimate/github/xxx/yyy.svg)](https://codeclimate.com/github/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/climate.png',
                docDescription: ''
            },
            dependencies:{
                mandatory:true,
                md:'[![dependencies](https://img.shields.io/david/xxx/yyy.svg)](https://david-dm.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-dependencies.png',
                docDescription: ''
            }
        },
        definitions:{
            funtion_eid:{
                detect:'function eid',
                match:'function eid(id){ return document.getElementById(id); }'
            },
            var_winos:{
                detect:'var winos',
                match:"var winOS = Path.sep==='\\\\';"
            }
        },
        rules:{
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
                        } else {
                            // defino la version para para siguientes checks
                            info.packageVersion = info.packageJson['qa-control']['package-version'];
                        }
                        return [];
                    }
                }],
                shouldAbort:true
            },
            invalid_qa_control_version: {
                checks:[{
                    warnings:function(info){
                        var ver=info.packageVersion;
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
                        var ver=info.packageVersion;
                        if(semver.satisfies(ver, qaControl.deprecatedVersions)){
                            return [{warning:'deprecated_qa_control_version',params:[ver]}];
                        }
                        return [];
                    }
                }],
                shouldAbort:true
            },
            repository_name_format: {
                checks:[{
                    warnings:function(info) {
                        if(! info.packageJson.repository.match(/^([-a-zA-Z0-9_.]+\/[-a-zA-Z0-9_.]+)$/)){
                            return [{warning:'repository_name_not_found'}];
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
                     var mandatoryFiles=qaControl.projectDefinition[info.packageVersion].files;
                     for(var fileName in mandatoryFiles) {
                         var file = mandatoryFiles[fileName];
                         if(file.mandatory && !info.files[fileName]) {
                             warns.push({warning:'lack_of_mandatory_file_1', params:[fileName]});
                         } else {
                             if(file.presentIf && !file.presentIf(info.packageJson)) {
                                 warns.push({warning:'lack_of_mandatory_file_1', params:[fileName]});
                             } else if(file.mandatoryLines) {
                                 var fileContent = info.files[fileName].content;
                                 file.mandatoryLines.forEach(function(mandatoryLine) {
                                    // agrego '\n' antes para no utilizar expresiones regulares
                                    if(fileContent.indexOf('\n'+mandatoryLine)==-1) {
                                        warns.push({warning:'lack_of_mandatory_line_1_in_file_2', params:[mandatoryLine, fileName]});
                                    }
                                 });
                             }
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
                        var sections=qaControl.projectDefinition[info.packageVersion].sections;
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
            cucardas:{
                checks:[{
                    warnings:function(info){
                        var warns=[];
                        var readme=info.files['README.md'].content;
                        if(readme.indexOf(qaControl.cucaMarker) == -1) {
                            warns.push({warning:'lack_of_cucarda_marker_in_readme'});
                        }
                        var cucardas=qaControl.projectDefinition[info.packageVersion].cucardas;
                        var modulo=info.packageJson.name;
                        var repo=info.packageJson.repository.replace('/'+modulo,'');
                        for(var nombreCucarda in cucardas) {
                            var cucarda = cucardas[nombreCucarda];
                            var cucaID = '!['+/!\[([a-z]+)]/.exec(cucarda.md)[1]+']';
                            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
                            if(readme.indexOf(cucaID) == -1) {
                                if(cucarda.mandatory) {
                                    warns.push({warning:'missing_mandatory_cucarda_1', params:[nombreCucarda]});
                                }
                            } else {
                                if('check' in cucarda && ! cucarda.check(info.packageJson)) {
                                    warns.push({warning:'wrong_format_in_cucarda_1', params:[nombreCucarda]});
                                }
                                if(readme.indexOf(cucaStr) == -1) {
                                    // si tengo cucarda mal formada, devuelvo warning aunque no sea obligatoria
                                    // porque existió la intención de definirla
                                    warns.push({warning:'wrong_format_in_cucarda_1', params:[nombreCucarda]});
                                }
                            }
                        }
                        if(warns.length) {
                            fs.writeFileSync("cucardas.log", qaControl.generateCucardas(cucardas, info.packageJson));
                        }
                        return warns;
                    }
                }]
            },
            customs:{
                checks:[{
                    warnings:function(info) {
                        var warns=[];
                        var customs = qaControl.projectDefinition[info.packageVersion].definitions;
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                for(var customeName in customs) {
                                    var content = info.files[file].content;
                                    var custome = customs[customeName];
                                    if(content.toLowerCase().indexOf(custome.detect) !== -1
                                        && content.indexOf(custome.match)==-1)
                                    {
                                        warns.push({warning:'file_1_does_not_match_custom_2', params:[file,customeName]});
                                    }
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            first_lines:{
                checks:[{
                    warnings:function(info) {
                        var warns=[];
                        var qaControlSection=info.packageJson['qa-control'];
                        var whichRunIn=qaControlSection['run-in'];
                        var codeCheck=qaControl.projectDefinition[info.packageVersion].sections['run-in']['values'][whichRunIn];
                        if(codeCheck) {
                        // transformar el nombre de proyecto
                            var parts = info.packageJson.name.split('-');
                            var project = '';
                            for(var p=0; p<parts.length; ++p) {
                                var part=parts[p];
                                project += part.substring(0, 1).toUpperCase()+part.substring(1);
                            }
                            var mainName = ('main' in info.packageJson) ? info.packageJson.main : 'index.js';
                            
                            if(! qaControl.startsWith(info.files[mainName].content, codeCheck.firstLines.replace('nombreDelModulo', project))) {
                                warns.push({warning:'first_line_does_not_match_in_file_1', params:[mainName]});
                            }
                        }
                        return warns;
                    }
                }]
            }
        }
    }
};

qaControl.lang = process.env.qa_control_lang || 'en';
qaControl.deprecatedVersions = '< 0.0.1';
qaControl.currentVersion = '0.0.1';

qaControl.configReady=false;
var configReading=Promises.all(_.map(qaControl.projectDefinition,function(definition, version){
    return Promises.all(_.map(definition.sections['run-in'].values,function(properties, value){
        return fs.readFile(__dirname+'/'+version+'/first-lines-'+value+'.txt',{encoding: 'utf8'}).then(function(content){
            properties.firstLines=content;
        });
    }));
})).then(function(){
    // only for test, in production this sleep must gone
    return Promises.sleep(500);
}).then(function(){
    qaControl.configReady=true;
}).catch(function(err){
    console.log('UNABLE TO LOAD CONFIGURATION');
    console.log('error',err);
    console.log('stack',err.stack);
});

qaControl.loadProject = function loadProject(projectDir) {
    var info = {};
    return Promises.start(function(){
        if(!qaControl.configReady) return configReading;
    }).then(function(){
        if(!projectDir) { throw new Error('null projectDir'); }

        return fs.exists(projectDir);
    }).then(function(exists) {
        if(!exists) { throw new Error("'"+projectDir+"' does not exists"); }
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
    var rules = qaControl.projectDefinition[qaControl.currentVersion].rules;
    for(var ruleName in rules){
        var rule=rules[ruleName];
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

module.exports = qaControl;
