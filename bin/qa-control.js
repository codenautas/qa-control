"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */

var qaControl = {};

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var _ = require('lodash');
var semver = require('semver');
var jsh = require('jshint');
var multilang = require('multilang');
var stripBom = require('strip-bom');
var yaml = require('js-yaml');

qaControl.msgs={
    en:{
        deprecated_qa_control_version: 'deprecated qa-control version',
        repository_name_not_found: 'packageJson.repository must be in format /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/'
    },
    es:{
        no_test_in_node_four: 'falta probar para node 4 en .travis.yaml',
        deprecated_qa_control_version: 'la versión de qa-control es vieja',
        deprecated_version: 'la version es demasiado vieja',
        invalid_qa_control_version: 'la sección "package-version" en qa-control contiene un valor incorrecto',
        invalid_value_1_in_parameter_2: 'valor invalido "$1" para el parametro "$2" en la sección qa-control',
        lack_of_mandatory_file_1: 'falta el archivo obligatorio "$1"',
        //lack_of_mandatory_parameter_1: 'falta el parámetro obligatorio "$1"',
        lack_of_mandatory_section_1: 'falta la sección obligatoria "$1" en la sección qa-control',
        no_qa_control_section_in_codenautas_project: 'falta la sección "qa-control" en package.json y aparenta ser un proyecto codenautas',
        no_multilang_section_in_1: 'falta la sección multilang en el archivo $1',
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
        first_lines_does_not_match_in_file_1: 'las primeras líneas no coinciden en $1',
        repository_name_not_found: 'packageJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/',
        using_normal_promise_in_file_1: 'se han usado Promise(s) normales en "$1"',
        packagejson_main_file_1_does_not_exists: 'no existe el archivo "main" ($1) declarado en package.json',
        jshint_warnings_in_file_1: 'el archivo "$1" tiene warnings de JSHint',
        lack_of_jshintconfig_section_in_package_json: 'falta la sección "jshintConfig" en package.json',
        incorrect_jshintconfig_option_1_in_package_json: 'la opcion "$1" en "jshintConfig" es incorrecta en package.json',
        readme_multilang_not_sincronized_with_file_1: 'README.md no esta sincronizado con "$1" para multilang',
        lack_of_repository_section_in_package_json: 'Falta la sección "repository" en package.json',
        invalid_repository_section_in_package_json: 'La sección "repository" en package.json es inválida',
        invalid_dependency_version_number_format_in_dep_1: 'El formato del numero de version es incorrecto en "$1"'
    }
};

qaControl.cmdMsgs = {
    en: {
        msg_done:'Done',
        msg_nowarns:'without warnings',
        msg_langs:'Available languages',
        msg_starting: 'Starting qa-control on',
        msg_loaded: 'Loaded default configuration',
        msg_proj: 'Reading project directory',
        msg_reading: 'Reading',
        msg_skipping: 'Skipping directory',
        msg_reading_main: 'Reading "main" from',
        msg_controlling: 'Controlling project information',
        msg_checking: 'Checking rule'
    },
    es: {
        msg_done:'Listo',
        msg_nowarns:'sin advertencias',
        msg_langs:'Idiomas disponibles',
        msg_starting: 'Iniciando qa-control en',
        msg_loaded: 'Confuración por defecto cargada',
        msg_proj: 'Leyendo directorio del proyecto',
        msg_reading: 'Leyendo',
        msg_skipping: 'Salteando directorio',
        msg_reading_main: 'Leyendo "main" de',
        msg_controlling: 'Controlando la información del proyecto',
        msg_checking: 'Verificando regla'
    }
};

// devuelve un buffer con los \n, \r\n, \r como \n
qaControl.fixEOL = function fixEOL(buf) {
    return buf.replace(/\s*\r?\n/g, '\n').replace(/\s*\r/g, '\n');
};

// bufTest debe empezar con bufStart
qaControl.startsWith = function startsWith(bufTest, bufStart) {
    return qaControl.fixEOL(bufTest).indexOf(qaControl.fixEOL(bufStart))===0;
};

qaControl.getRepositoryUrl = function getRepositoryUrl(packageJson) {
    var repo = packageJson.repository.url ? packageJson.repository.url : packageJson.repository;
    var ghRepo = /(https:\/\/github\.com\/)/.exec(repo);
    if(ghRepo) { repo = repo.replace(ghRepo[1], ''); }
    return repo;
};

// devuelve el contenido para el archivo de salida (p.e. cucardas.log)
qaControl.cucaMarker = '<!-- cucardas -->';
qaControl.generateCucardas = function generateCucardas(cucardas, packageJson) {
    var cucaFileContent = qaControl.cucaMarker+'\n';
    var modulo=packageJson.name;
    var repo=qaControl.getRepositoryUrl(packageJson).replace('/'+modulo,'');
     /*jshint forin: false */
    for(var nombreCucarda in cucardas) {
        var cucarda = cucardas[nombreCucarda];
        if(!cucarda.check || cucarda.check(packageJson)) {
            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
            cucaFileContent += cucaStr +'\n';
        }
    }
     /*jshint forin: true */
    return cucaFileContent;
};
qaControl.verbose = false;
qaControl.cucardas_always = false;
qaControl.mainDoc = function mainDoc() {
    return qaControl.projectDefinition[qaControl.currentVersion].fileNameMainDoc;
};

qaControl.projectDefinition = {
    '0.0.1': {
        fileNameMainDoc: 'LEEME.md',
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
                mandatory:true,
                values: {
                    app: {},
                    lib: {},
                    "cmd-tool": {}
                }
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
            'proof-of-concept':{
                check: function(packageJson){ 
                    return packageJson['qa-control'].purpose==='proof-of-concept';
                },
                md:'![proof-of-concept](https://img.shields.io/badge/stability-proof_of_concept-ff70c0.svg)',
                imgExample:'https://img.shields.io/badge/stability-designing-red.svg'
            },
            designing:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'0.0.x') && !packageJson['qa-control'].purpose;
                },
                md:'![designing](https://img.shields.io/badge/stability-designing-red.svg)',
                imgExample:'https://img.shields.io/badge/stability-designing-red.svg',
                docDescription: 'opt. manual'
            },
            extending:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'0.x.x') &&
                            !semver.satisfies(packageJson.version,'0.0.x') &&
                            !packageJson['qa-control'].purpose;
                },
                md:'![extending](https://img.shields.io/badge/stability-extending-orange.svg)',
                imgExample:'https://img.shields.io/badge/stability-extending-orange.svg',
                docDescription: 'opt. manual'
            },
            'npm-version':{
                mandatory:true,
                md:'[![npm-version](https://img.shields.io/npm/v/yyy.svg)](https://npmjs.org/package/yyy)',
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
                check: function(packageJson){ 
                    return !packageJson['qa-control']['test-appveyor'];
                },
                md:'[![build](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-linux.png',
                docDescription: 'linux/build'
            },
            linux:{
                check: function(packageJson){ 
                    return !!packageJson['qa-control']['test-appveyor'];
                },
                md:'[![linux](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-linux.png',
                hideInManual: true,
            },
            windows:{
                check: function(packageJson){ 
                    return !!packageJson['qa-control']['test-appveyor'];
                },
                md:'[![windows](https://ci.appveyor.com/api/projects/status/github/xxx/yyy?svg=true)](https://ci.appveyor.com/project/xxx/yyy)',
                imgExample:'https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true',
                docDescription: 'casos especiales'
            },
            coverage:{
                check: function(packageJson){ 
                    return packageJson['qa-control'].coverage;
                },
                md:'[![coverage](https://img.shields.io/coveralls/xxx/yyy/master.svg)](https://coveralls.io/r/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/coverage.png',
                docDescription: ''
            },
            climate:{
                check: function(packageJson){ 
                    return packageJson['qa-control'].coverage || ! packageJson['qa-control'].purpose;
                },
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
        customs:{
            softRegExp:function(realRegex) {
                var re=realRegex.replace(/\\/g, '\\\\')
                                .replace(/\s*(=+)\s*/g,'\\s*$1\\s*')
                                .replace(/ /g, '\\s+')
                                .replace(/\(/g, '\\(')
                                .replace(/\)/g, '\\)');
                return new RegExp(re, 'im');
            },
            funtion_eid:{
                detect:'function eid',
                match:'function eid(id){ return document.getElementById(id); }'
            },
            var_winos:{
                // separo los siguientes dos strings en dos partes para que no salte un warning
                detect:'var '+'winos=',
                match:"var "+"winOS = Path.sep==='\\\\';"
            },
            var_path:{
                detect:'var path=',
                match:"var Path = require('path');"
            }
        },
        jshint_options: { "asi": false, "curly": true, "forin": true },
        // Si info.scoring == true, cada regla debe agregar junto al warning, un objeto 'scoring'
        // con na o más de las siguientes propiedades:
        //   qac: 1
        //   mandatories: 1
        //   cucardas:1
        //   multilang:1
        //   versions:1
        //   parameters:1
        //   format:1
        //   customs:1
        //   jshint:1
        //   dependencies:1
        // Emilio redefinirá valores de cada score
        rules:{
            exist_package_json:{
                checks:[{
                    warnings:function(info){
                        if(!info.files['package.json']){
                            return [{warning:'no_package_json', scoring:{mandatories:1}}];
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
                                        'no_qa_control_section_in_codenautas_project':
                                        'no_qa_control_section_in_package_json', scoring:{qac:1}}];
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
                            return [{warning:'no_package_version_in_qa_control_section', scoring:{qac:1}}];
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
                            return [{warning:'invalid_qa_control_version',params:[ver], scoring:{versions:1}}];
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
                            return [{warning:'deprecated_qa_control_version',params:[ver], scoring:{versions:1}}];
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
                        var files=qaControl.projectDefinition[info.packageVersion].files;
                        for(var fileName in files) {
                            if(files.hasOwnProperty(fileName)) {
                                var file = files[fileName];
                                if(file.mandatory && !info.files[fileName]) {
                                    warns.push({warning:'lack_of_mandatory_file_1', params:[fileName], scoring:{mandatories:1}});
                                } else {
                                    if(file.presentIf && file.presentIf(info.packageJson) && !info.files[fileName]) {
                                        warns.push({warning:'lack_of_mandatory_file_1', params:[fileName], scoring:{mandatories:1}});
                                    }
                                }
                            }
                        }
                        return warns;
                    }
                }],
                shouldAbort:true
            },
            repository_in_package_json:{
                checks:[{
                    warnings:function(info) {
                        var warns = [];
                        if(!('repository' in info.packageJson)) {
                            warns.push({warning:'lack_of_repository_section_in_package_json', scoring:{mandatories:1}});
                        } else {
                            if(! qaControl.getRepositoryUrl(info.packageJson).match(/^([-a-zA-Z0-9_.]+\/[-a-zA-Z0-9_.]+)$/)){
                                return [{warning:'repository_name_not_found', scoring:{mandatories:1}}];
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
                         /*jshint forin: false */
                        for(var sectionName in sections){
                            var sectionDef=sections[sectionName];
                            if(sectionDef.mandatory && !(sectionName in qaControlSection)){
                                warns.push({warning:'lack_of_mandatory_section_1',params:[sectionName], scoring:{mandatories:1}});
                            }else{
                                var observedValue=qaControlSection[sectionName];
                                if(sectionDef.values && !(observedValue in sectionDef.values)){
                                    warns.push({warning:'invalid_value_1_in_parameter_2',params:[observedValue,sectionName], scoring:{parameters:1}});
                                }
                            }
                        }
                         /*jshint forin: true */
                        return warns;
                    }
                }],
                shouldAbort:true
            },
            mandatory_lines:{
                checks:[{
                    warnings:function(info) {
                        var warns =[];
                        var files=qaControl.projectDefinition[info.packageVersion].files;
                        _.forEach(files, function(file, fileName) {
                            if(file.mandatoryLines) {
                                var fileContent = info.files[fileName].content;
                                file.mandatoryLines.forEach(function(mandatoryLine) {
                                   // agrego '\n' antes para no utilizar expresiones regulares
                                   if(fileContent.indexOf('\n'+mandatoryLine)===-1) {
                                       warns.push({warning:'lack_of_mandatory_line_1_in_file_2',
                                                   params:[mandatoryLine, fileName],
                                                   scoring:{mandatories:1}});
                                   }
                                });
                            }
                        });
                        return warns;
                    }
                }]
            },
            no_multilang_section_in_1:{
                checks:[{
                    warnings:function(info){
                        if(!info.files[qaControl.mainDoc()].content.match(/<!--multilang v[0-9]+\s+(.+)(-->)/)) {
                            return [{
                                warning:'no_multilang_section_in_1', 
                                params:[qaControl.mainDoc()], 
                                scoring:{multilang:1}
                            }];
                        }
                        return [];
                    }
                }]
            },
            invalid_repository_in_package_json:{
                checks:[{
                    warnings:function(info) {
                        var warns = [];
                        var repoParts = qaControl.getRepositoryUrl(info.packageJson).split('/');
                        var projName = repoParts[repoParts.length-1];
                        if(projName !== info.packageJson.name) {
                            return [{warning:'invalid_repository_section_in_package_json', scoring:{format:1}}];
                        }
                        return warns;
                    }
                }]
            },
            cucardas:{
                eclipsers:['invalid_repository_section_in_package_json', 'lack_of_repository_section_in_package_json'],
                checks:[{
                    warnings:function(info){
                        var warns=[];
                        var readme=info.files[qaControl.mainDoc()].content;
                        if(readme.indexOf(qaControl.cucaMarker) === -1) {
                            warns.push({warning:'lack_of_cucarda_marker_in_readme'});
                        }
                        var cucardas=qaControl.projectDefinition[info.packageVersion].cucardas;
                        var modulo=info.packageJson.name;
                        var repo=qaControl.getRepositoryUrl(info.packageJson).replace('/'+modulo,'');
                         /*jshint forin: false */
                        for(var nombreCucarda in cucardas) {
                            var cucarda = cucardas[nombreCucarda];
                            var cucaID = '!['+/!\[([-a-z]+)]/.exec(cucarda.md)[1]+']';
                            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
                            if(readme.indexOf(cucaID) === -1) {
                                if(cucarda.mandatory) {
                                    warns.push({warning:'lack_of_mandatory_cucarda_1', params:[nombreCucarda], scoring:{cucardas:1}});
                                }
                            } else {
                                if('check' in cucarda && ! cucarda.check(info.packageJson)) {
                                    warns.push({warning:'wrong_format_in_cucarda_1', params:[nombreCucarda], scoring:{cucardas:1}});
                                }
                                if(readme.indexOf(cucaStr) === -1) {
                                    // si tengo cucarda mal formada, devuelvo warning aunque no sea obligatoria
                                    // porque existió la intención de definirla
                                    warns.push({warning:'wrong_format_in_cucarda_1', params:[nombreCucarda], scoring:{cucardas:1}});
                                }
                            }
                        }
                         /*jshint forin: true */
                        if(warns.length || qaControl.cucardas_always) {
                            fs.writeFile(Path.normalize(info.projectDir+'/cucardas.log'), qaControl.generateCucardas(cucardas, info.packageJson));
                        }
                        return warns;
                    }
                }]
            },
            customs:{
                checks:[{
                    warnings:function(info) {
                        var warns=[];
                        var customs = qaControl.projectDefinition[info.packageVersion].customs;
                        function makeCheck(strOrRegexp, isMatchFunc) {
                            var checker;
                            if(!strOrRegexp){
                                checker=function() { return false; };
                            }else if(strOrRegexp instanceof RegExp) {
                                checker=function(str) {
                                    return strOrRegexp.test(str);
                                };
                            } else {
                                checker=function(str) {
                                    if(isMatchFunc) {
                                        return str.indexOf(strOrRegexp) !== -1;
                                    } else {
                                        return customs.softRegExp(strOrRegexp).test(str);
                                    }
                                };
                            }
                            return checker;
                        }
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                for(var customeName in customs) {
                                    if(customs.hasOwnProperty(customeName)) {
                                        var content = info.files[file].content;
                                        var custom = customs[customeName];
                                        var detect = makeCheck(custom.detect);
                                        var match = makeCheck(custom.match, true);
                                        //console.log(file, " detect:", detect(content), " match: ", match(content))
                                        if(detect(content) && ! match(content)) {
                                            warns.push({warning:'file_1_does_not_match_custom_2', params:[file,customeName], scoring:{customs:1}});
                                        }
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
                        var whichType=qaControlSection.type;
                        var firstLines=qaControl.projectDefinition[info.packageVersion].firstLines[whichRunIn][whichType];
                        if(firstLines) {
                            var parts = info.packageJson.name.split('-');
                            var first=function(toWhat){
                                return function(part){
                                    return part.substring(0, 1)[toWhat]()+part.substring(1);
                                };
                            };
                            var ProjectName = parts.map(first("toUpperCase")).join('');
                            var projectName = first("toLowerCase")(ProjectName);
                            var mainName = ('main' in info.packageJson) ? info.packageJson.main : 'index.js';
                            if(!(mainName in info.files)) {
                                warns.push({warning:'packagejson_main_file_1_does_not_exists', params:[mainName], scoring:{customs:1}});
                            } else {
                                var fileContent = stripBom(info.files[mainName].content);

                                if(!qaControl.startsWith(fileContent, firstLines.replace(/nombreDelModulo/g, ProjectName)) && 
                                      !qaControl.startsWith(fileContent, firstLines.replace(/nombreDelModulo/g, projectName))
                                ) {
                                    if(qaControl.verbose){
                                        var code=qaControl.fixEOL(fileContent);
                                        var model1=qaControl.fixEOL(firstLines.replace(/nombreDelModulo/g, projectName));
                                        var model2=qaControl.fixEOL(firstLines.replace(/nombreDelModulo/g, ProjectName));
                                        for(var i=0; i<model1.length; i++){
                                            if(code[i]!== model1[i] && code[i] !== model2[i]){
                                                console.log('DIF STARTS IN:',JSON.stringify(code.substring(i, Math.min(model1.length, i+20))));
                                                console.log('MODEL 1      :',JSON.stringify(model1.substring(i, Math.min(model1.length, i+20))));
                                                console.log('MODEL 2      :',JSON.stringify(model2.substring(i, Math.min(model1.length, i+20))));
                                                break;
                                            }
                                        }
                                    }
                                    warns.push({warning:'first_lines_does_not_match_in_file_1', params:[mainName], scoring:{customs:1}});
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            normal_promises:{
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                var content = info.files[file].content;
                                if(content.match(/require\(["'](promise|q|rsvp|es6promise)['"]\)/m)) {
                                    warns.push({warning:'using_normal_promise_in_file_1', params:[file], scoring:{customs:1}});
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            jshint_config:{
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        if(!('jshintConfig' in info.packageJson)) {
                            warns.push({warning:'lack_of_jshintconfig_section_in_package_json'});
                        }
                        else {
                            var requiredOptions = qaControl.projectDefinition[info.packageVersion].jshint_options;
                            var checkedOptions = info.packageJson.jshintConfig;
                            for(var op in requiredOptions) {
                                if((false === op in checkedOptions) || checkedOptions[op] !== requiredOptions[op]) {
                                    warns.push({warning:'incorrect_jshintconfig_option_1_in_package_json', params:[op], scoring:{jshint:1}});
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            jshint:{
                eclipsers:['packagejson_main_file_1_does_not_exists', 'first_lines_does_not_match_in_file_1',
                           'lack_of_jshintconfig_section_in_package_json', 'incorrect_jshintconfig_option_1_in_package_json'],
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        var jshintOpts = 
                            info.packageJson.jshintConfig || 
                            qaControl.projectDefinition[info.packageVersion].jshint_options;
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                var content = info.files[file].content;
                                jsh.JSHINT(content, jshintOpts , false);
                                var data = jsh.JSHINT.data();
                                if(data.errors) {
                                    if(qaControl.verbose){
                                        console.log('JSHINT output:');
                                        console.log('jshintOpts',jshintOpts);
                                        console.log(data.errors.length, " JSHINT errors");
                                        console.log(data.errors);
                                        //console.log(data);
                                    }
                                    warns.push({warning:'jshint_warnings_in_file_1', params:[file], scoring:{jshint:1}});
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            multilang:{
                checks:[{
                    warnings:function(info) {
                        var warns = [];
                        var defReadme = qaControl.mainDoc();
                        var content = info.files[defReadme].content;
                        var obtainedLangs = multilang.obtainLangs(content);
                        /*jshint forin: false */
                        for(var lang in obtainedLangs.langs) {
                            var file=obtainedLangs.langs[lang].fileName;
                            if(file !== defReadme) {
                                var mlContent = multilang.changeNamedDoc(file, content, lang);
                                if(mlContent !== info.files[file].content) {
                                    //var now=Date.now();
                                    // fs.writeFileSync("_"+now+"_gen_"+file, mlContent, 'utf8');
                                    // fs.writeFileSync("_"+now+"_ori_"+file, info.files[file].content, 'utf8');
                                    warns.push({warning:'readme_multilang_not_sincronized_with_file_1', params:[file], scoring:{multilang:1}});
                                }
                            }
                        }
                        /*jshint forin: true */
                        return warns;
                    }
                }]
            },
            dependencies:{
                checks:[{
                    warnings:function(info) {
                        var warns = [];
                        if("dependencies" in info.packageJson) {
                            var reDep=/^\d+\.\d+\.\d+$/;
                            /*jshint forin: false */
                            for(var depName in info.packageJson.dependencies) {
                                var depVal = info.packageJson.dependencies[depName];
                                if(! reDep.test(depVal)) {
                                    // console.log(depName, depVal);
                                    warns.push({warning:'invalid_dependency_version_number_format_in_dep_1', params:[depName], scoring:{dependencies:1}});
                                }
                            }
                            /*jshint forin: true */
                        }
                        return warns;
                    }
                }]
            }
        }
    }
};

qaControl.projectDefinition['0.0.2'] = _.defaults({}, qaControl.projectDefinition['0.0.1']);

// rules that must be evaluated first
qaControl.projectDefinition['0.0.2'].rules = _.defaults({
    no_test_in_node_four:{
        checks:[{
            warnings:function(info){
                if(info.dotTravis && !(info.dotTravis.node_js.filter(function(x){ return x[0]=="4";}).length)){
                    return [{warning:'no_test_in_node_four', scoring:{versions:1}}];
                }
                return [];
            }
        }],
    },
}, qaControl.projectDefinition['0.0.1'].rules);

qaControl.lang = process.env.qa_control_lang || 'en';
qaControl.deprecatedVersions = '< 0.0.1';
qaControl.currentVersion = '0.0.1';

qaControl.fixMessages = function fixMessages(messagesToFix) {
    return Promises.start(function() {
        /*jshint forin: false */
        for(var warn in qaControl.msgs.es) {
            if(false === warn in messagesToFix) {
                messagesToFix[warn] = warn.replace(/_(\d+)/g,' -$1').replace(/-/g, '$').replace(/_/g,' ');
            }
        }
         /*jshint forin: true */
    });
};

qaControl.configReady=false;
var configReading=Promises.all(_.map(qaControl.projectDefinition,function(definition, version){
    definition.firstLines=definition.firstLines||{};
    return Promises.all(_.map(definition.sections['run-in'].values,function(runInProperties, runInValue){
        return Promises.all(_.map(definition.sections.type.values,function(typeProperties, typeValue){
            return fs.readFile(__dirname+'/'+version+'/first-lines-'+runInValue+'-'+typeValue+'.txt',{encoding: 'utf8'}).catch(function(err){
                if(err.code!=='ENOENT'){
                    throw err;
                }
                return fs.readFile(__dirname+'/'+version+'/first-lines-'+runInValue+'.txt',{encoding: 'utf8'});
            }).then(function(content){
                definition.firstLines[runInValue]=definition.firstLines[runInValue]||{};
                definition.firstLines[runInValue][typeValue]=content;
            });
        }));
    }));
})).then(function(){
    return qaControl.fixMessages(qaControl.msgs.en);
}).then(function(){
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
    var info = {projectDir:projectDir};
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_starting+projectDir+"'...\n"); }
    return Promises.start(function(){
        if(!qaControl.configReady) { return configReading; }
    }).then(function(){
        if(qaControl.verbose) { process.stdout.write(cmsgs.msg_loaded+"\n"); }
        if(!projectDir) { throw new Error('null projectDir'); }
        return fs.exists(projectDir);
    }).then(function(exists) {
        if(!exists) { throw new Error("'"+projectDir+"' does not exists"); }
        return fs.stat(projectDir);
    }).then(function(stat){
        if(! stat.isDirectory()) {
            throw new Error("'"+projectDir+"' is not a directory");
        }
        if(qaControl.verbose) { process.stdout.write(cmsgs.msg_proj+"...\n"); }
        return fs.readdir(projectDir);
    }).then(function(files) {
        info.files = {};
         /*jshint forin: false */
        for(var f in files) { info.files[files[f]] = {}; }
         /*jshint forin: true */
        if(files.indexOf('package.json') !== -1) {
            info.packageJson = {};
        }
        return Promises.all(files.map(function(file){
            var iFile = Path.normalize(projectDir+'/'+file);
            return Promises.start(function() {
                return fs.stat(iFile);
            }).then(function(stat) {
                if(stat.isFile()) {
                    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_reading+" '"+iFile+"'...\n"); }
                    return fs.readFile(iFile, 'utf8').then(function(content){
                        info.files[file].content = stripBom(content);
                    });
                } else {
                    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_skipping+" '"+iFile+"'.\n"); }
                    delete info.files[file]; // not a file, we erase it
                }
            });
        })).then(function() {
            if(info.files['package.json']){
                info.packageJson = JSON.parse(info.files['package.json'].content);
                var mainName = info.packageJson.main;
                if(info.packageJson.main && false === mainName in info.files) {
                    info.files[mainName] = {};
                    var mainFile = Path.normalize(projectDir+'/'+mainName);
                    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_reading_main+" '"+mainFile+"'...\n"); }
                    return fs.stat(mainFile).then(function(stat) {
                        if(stat.isFile()) {
                            return fs.readFile(mainFile, 'utf8').then(function(content) {
                                info.files[mainName].content = stripBom(content);
                            });
                        }
                    }).catch(function(err) {
                        if(err.code === 'ENOENT') {
                            delete info.files[mainName];
                        } else {
                            throw err;                            
                        }
                    });
                }            
            }
        }).then(function() {
            if(info.files['.travis.yml']){
                info.dotTravis = yaml.safeLoad(info.files['.travis.yml'].content);
            }
        });
    }).then(function() {
        return info;
    });
};

qaControl.controlInfo=function controlInfo(info, opts){
    var resultWarnings=[];
    var existingWarnings={};
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    var rules = (qaControl.projectDefinition[((info.packageJson||{})['qa-control']||{})['package-version']||qaControl.currentVersion]||qaControl.projectDefinition[qaControl.currentVersion]).rules;
    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_controlling+"...\n"); }
    var cadenaDePromesas = Promises.start();
    info.scoring = opts && opts.scoring;
    _.forEach(rules, function(rule, ruleName) {
        rule.checks.forEach(function(checkInfo){
            cadenaDePromesas = cadenaDePromesas.then(function() {
                if(rule.eclipsers && rule.eclipsers.some(function(warning){ return existingWarnings[warning]; })){
                    return [];
                }
                if(qaControl.verbose) { process.stdout.write(cmsgs.msg_checking+" '"+ruleName+"'...\n"); }
                return checkInfo.warnings(info);
            }).then(function(warningsOfThisRule) {
                if(warningsOfThisRule.length) {
                    resultWarnings=resultWarnings.concat(warningsOfThisRule);
                    warningsOfThisRule.forEach(function(warning){
                        existingWarnings[warning.warning]=true; 
                    });
                    if(rule.shouldAbort) { throw new Error("ruleIsAborting"); }
                }
                return resultWarnings;
            });
        });
    });
    cadenaDePromesas=cadenaDePromesas.catch(function(err) {
        if(err.message !== 'ruleIsAborting') {
            throw err;
        }
    }).then(function(){
        return resultWarnings;
    });
    return cadenaDePromesas;
};

qaControl.stringizeWarnings = function stringizeWarnings(warns, lang) {
    var warnStr = '';
    return Promises.start(function() {
        //console.log("stringizeWarnings(", warns, ",", lang, ")");
        if(qaControl.verbose && warns.length) { process.stdout.write("Making warnings readable...\n"); }
        var messages = qaControl.msgs[lang];
        warns.forEach(function(warn) {
            var msg = messages[warn.warning] || warn.warning;
            //console.log("message", msg, warn);
            var numParams = warn.warning.match(/\d/g);
            if(numParams) {
                //console.log(warn.warning, msg, " tiene ", numParams.length, " parametros y params tiene ", warn.params)
                 for(var p=0; p<numParams.length; ++p) {
                    msg = msg.replace('$'+parseInt(p+1), warn.params[p]);
                }
            }
            if(qaControl.verbose) {
                warnStr += 'WARNING: ';
            }
            warnStr += msg + '\n';
        });
        return warnStr;
    });
};

qaControl.controlProject=function controlProject(projectDir, opts){
    qaControl.verbose = opts && opts.verbose;
    qaControl.cucardas_always = opts && opts.cucardas;
    return Promises.start(function(){
        return qaControl.loadProject(projectDir);
    }).then(function(info){
        return qaControl.controlInfo(info, opts);
    });
};

qaControl.main=function main(parameters) {
    return Promises.start(function() {
        if(parameters.listLangs) {
            var msgLang =qaControl.cmdMsgs[parameters.lang || 'en'].msg_langs;
            process.stdout.write(msgLang+':');
             /*jshint forin: false */
            for(var lang in qaControl.msgs) { process.stdout.write(" "+lang); }
             /*jshint forin: true */
            process.stdout.write("\n");
        } else {
            qaControl.lang = parameters.lang || "en";
            return qaControl.controlProject(parameters.projectDir, parameters).then(function(warns) {
                return qaControl.stringizeWarnings(warns, qaControl.lang);
            }).then(function(warnString) {
                process.stdout.write(warnString);
                return warnString;
            });
        }        
    });
};

module.exports = qaControl;
