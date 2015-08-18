"use strict";

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var _ = require('lodash');
var semver = require('semver');
var jsh = require('jshint');
var multilang = require('multilang');

var qaControl={};

qaControl.msgs={
    en:{
        deprecated_qa_control_version: 'deprecated qa-control version',
        repository_name_not_found: 'pacakgeJson.repository must be in format /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/'
    },
    es:{
        deprecated_qa_control_version: 'la versión de qa-control es vieja',
        deprecated_version: 'la version es demasiado vieja',
        invalid_qa_control_version: 'la sección "package-version" en qa-control contiene un valor incorrecto',
        invalid_value_1_in_parameter_2: 'valor invalido "$2" para el parametro "$1" en la sección qa-control',
        lack_of_mandatory_file_1: 'falta el archivo obligatorio "$1"',
        //lack_of_mandatory_parameter_1: 'falta el parámetro obligatorio "$1"',
        lack_of_mandatory_section_1: 'falta la sección obligatoria "$1" en la sección qa-control',
        no_qa_control_section_in_codenautas_project: 'falta la sección "qa-control" en package.json y aparenta ser un proyecto codenautas',
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
        first_lines_does_not_match_in_file_1: 'las primeras líneas no coinciden en $1',
        repository_name_not_found: 'pacakgeJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/',
        using_normal_promise_in_file_1: 'se han usado Promise(s) normales en "$1"',
        packagejson_main_file_1_does_not_exists: 'no existe el archivo "main" ($1) declarado en package.json',
        jshint_warnings_in_file_1: 'el archivo "$1" tiene warnings de JSHint',
        lack_of_jshintconfig_section_in_package_json: 'falta la sección "jshintConfig" en package.json',
        incorrect_jshintconfig_option_1_in_package_json: 'la opcion "$1" en "jshintConfig" es incorrecta en package.json'/*,
        readme_not_sinchronized_with_multilang: 'README.md no esta sincronizado con multilang'*/
    }
};

// devuelve un buffer con los \n, \r\n, \r como \n
qaControl.fixEOL = function fixEOL(buf) {
    return buf.replace(/\s*\r?\n/g, '\n').replace(/\s*\r/g, '\n');
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
qaControl.verbose = false;

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
            'proof-of-concept':{
                check: function(packageJson){ 
                    return packageJson['qa-control'].purpose=='proof-of-concept';
                },
                md:'![proof-of-concept](https://img.shields.io/badge/stability-proof_of_concept-ff70c0.svg)',
                imgExample:'https://img.shields.io/badge/stability-desgining-red.svg'
            },
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
                    return semver.satisfies(packageJson.version,'0.x.x')
                              && !semver.satisfies(packageJson.version,'0.0.x')
                              && packageJson['qa-control'].purpose==null;
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
            // Emilio: esto parece un error de refactoring, confirmalo y borralo!!!!!
            // build:{
                // check: function(packageJson){ 
                    // return !packageJson['qa-control']['test-appveyor'];
                // },
                // md:'[![build](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
                // imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/medalla-ejemplo-linux.png',
                // docDescription: 'linux/build'
            // },
            linux:{
                md:'[![build](https://img.shields.io/travis/xxx/yyy/master.svg)](https://travis-ci.org/xxx/yyy)',
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
                    return packageJson['qa-control']['coverage'];
                },
                md:'[![coverage](https://img.shields.io/coveralls/xxx/yyy/master.svg)](https://coveralls.io/r/xxx/yyy)',
                imgExample:'https://raw.githubusercontent.com/codenautas/codenautas/master/img/coverage.png',
                docDescription: ''
            },
            climate:{
                check: function(packageJson){ 
                    return packageJson['qa-control']['coverage'] || packageJson['qa-control'].purpose==null;
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
                detect:'var winos=',
                match:"var winOS = Path.sep==='\\\\';"
            },
            var_path:{
                detect:'var path=',
                match:"var Path = require('path');"
            }
        },
        jshint_options: { "asi": false, "curly": true, "forin": true },
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
                                        'no_qa_control_section_in_codenautas_project':
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
                        var files=qaControl.projectDefinition[info.packageVersion].files;
                        for(var fileName in files) {
                            var file = files[fileName];
                            if(file.mandatory && !info.files[fileName]) {
                                warns.push({warning:'lack_of_mandatory_file_1', params:[fileName]});
                            } else {
                                if(file.presentIf && file.presentIf(info.packageJson) && !info.files[fileName]) {
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
                            var cucaID = '!['+/!\[([-a-z]+)]/.exec(cucarda.md)[1]+']';
                            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
                            if(readme.indexOf(cucaID) == -1) {
                                if(cucarda.mandatory) {
                                    warns.push({warning:'lack_of_mandatory_cucarda_1', params:[nombreCucarda]});
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
                        var customs = qaControl.projectDefinition[info.packageVersion].customs;
                        function makeCheck(strOrRegexp, isMatchFunc) {
                            var checker;
                            if(strOrRegexp == null){
                                checker=function(str) { return false; };
                            }else if(strOrRegexp instanceof RegExp) {
                                checker=function(str) {
                                    //console.log("va RE", strOrRegexp.source);
                                    //console.log(" y ", strOrRegexp.test(str) ? "matchea" : "NO matchea");
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
                                    var content = info.files[file].content;
                                    var custom = customs[customeName];
                                    var detect = makeCheck(custom.detect);
                                    var match = makeCheck(custom.match, true);
                                    //console.log(file, " detect:", detect(content), " match: ", match(content))
                                    if(detect(content) && ! match(content)) {
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
                            var first=function(toWhat){
                                return function(part){
                                    return part.substring(0, 1)[toWhat]()+part.substring(1);
                                }
                            }
                            var ProjectName = parts.map(first("toUpperCase")).join('');
                            var projectName = first("toLowerCase")(ProjectName);
                            var mainName = ('main' in info.packageJson) ? info.packageJson.main : 'index.js';
                            if(false == mainName in info.files) {
                                warns.push({warning:'packagejson_main_file_1_does_not_exists', params:[mainName]})
                            } else if(!qaControl.startsWith(info.files[mainName].content, codeCheck.firstLines.replace(/nombreDelModulo/g, ProjectName)) && 
                                      !qaControl.startsWith(info.files[mainName].content, codeCheck.firstLines.replace(/nombreDelModulo/g, projectName))
                            ) {
                                if(qaControl.verbose){
                                    var code=qaControl.fixEOL(info.files[mainName].content);
                                    var model1=qaControl.fixEOL(codeCheck.firstLines.replace(/nombreDelModulo/g, projectName));
                                    var model2=qaControl.fixEOL(codeCheck.firstLines.replace(/nombreDelModulo/g, ProjectName));
                                    for(var i=0; i<model1.length; i++){
                                        if(code[i]!=model1[i] && code[i]!=model2[i]){
                                            console.log('DIF STARTS IN:',JSON.stringify(code.substring(i, Math.min(model1.length, i+20))));
                                            console.log('MODEL 1      :',JSON.stringify(model1.substring(i, Math.min(model1.length, i+20))));
                                            console.log('MODEL 2      :',JSON.stringify(model2.substring(i, Math.min(model1.length, i+20))));
                                            break;
                                        }
                                    }
                                }
                                warns.push({warning:'first_lines_does_not_match_in_file_1', params:[mainName]});
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
                                    warns.push({warning:'using_normal_promise_in_file_1', params:[file]});
                                }
                            }
                        }
                        return warns;
                    }
                }]
            },
            jshint:{
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        var jshOptions = { "asi": false, "curly": true, "forin": true };
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                var content = info.files[file].content;
                                jsh.JSHINT(content, qaControl.projectDefinition[info.packageVersion].jshint_options, false);
                                var errors = jsh.JSHINT.data().errors;
                                if(errors) {
                                    //console.log(errors);
                                    warns.push({warning:'jshint_warnings_in_file_1', params:[file]});
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
                        if(false ==  'jshintConfig' in info['packageJson']) {
                            warns.push({warning:'lack_of_jshintconfig_section_in_package_json'});
                        }
                        else {
                            var requiredOptions = qaControl.projectDefinition[info.packageVersion].jshint_options;
                            var checkedOptions = info['packageJson']['jshintConfig'];
                            for(var op in requiredOptions) {
                                if((false === op in checkedOptions) || checkedOptions[op] !== requiredOptions[op]) {
                                    warns.push({warning:'incorrect_jshintconfig_option_1_in_package_json', params:[op]});
                                }
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

qaControl.fixMessages = function fixMessages(messagesToFix) {
    return Promises.start(function() {
        for(var warn in qaControl.msgs.es) {
            var msg = qaControl.msgs.es[warn];
            if(false === warn in messagesToFix) {
                messagesToFix[warn] = warn.replace(/_(\d+)/g,' -$1').replace(/-/g, '$').replace(/_/g,' ');
            }
        }
    });
}

qaControl.configReady=false;
var configReading=Promises.all(_.map(qaControl.projectDefinition,function(definition, version){
    return Promises.all(_.map(definition.sections['run-in'].values,function(properties, value){
        return fs.readFile(__dirname+'/'+version+'/first-lines-'+value+'.txt',{encoding: 'utf8'}).then(function(content){
            properties.firstLines=content;
        });
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
    var info = {};
    if(qaControl.verbose) { process.stdout.write("Starting qa-control on '"+projectDir+"'...\n"); }
    return Promises.start(function(){
        if(!qaControl.configReady) return configReading;
    }).then(function(){
        if(qaControl.verbose) { process.stdout.write("Loaded default configuration.\n"); }
        if(!projectDir) { throw new Error('null projectDir'); }
        return fs.exists(projectDir);
    }).then(function(exists) {
        if(!exists) { throw new Error("'"+projectDir+"' does not exists"); }
        return fs.stat(projectDir);
    }).then(function(stat){
        if(! stat.isDirectory()) {
            throw new Error("'"+projectDir+"' is not a directory");
        }
        if(qaControl.verbose) { process.stdout.write("Reading project directory...\n"); }
        return fs.readdir(projectDir);
    }).then(function(files) {
        info['files'] = {};
        for(var f in files) { info['files'][files[f]] = {}; }
        if(files.indexOf('package.json') != -1) {
            info['packageJson'] = {};
        }
        return Promises.all(files.map(function(file){
            var iFile = Path.normalize(projectDir+'/'+file);
            return Promises.start(function() {
                return fs.stat(iFile);
            }).then(function(stat) {
                if(stat.isFile()) {
                    if(qaControl.verbose) { process.stdout.write("Reading '"+iFile+"'...\n"); }
                    return fs.readFile(iFile, 'utf8').then(function(content){
                        info['files'][file].content = content;
                        if(file==='package.json') {
                            info['packageJson'] = JSON.parse(content);
                        }
                    });
                } else {
                    if(qaControl.verbose) { process.stdout.write("Skipping directory '"+iFile+"'.\n"); }
                    delete info['files'][file]; // not a file, we erase it
                }
            });
        })).then(function() {
            var mainName = info['packageJson'].main;
            if(info['packageJson'].main && false === mainName in info['files']) {
                info['files'][mainName] = {};
                var mainFile = Path.normalize(projectDir+'/'+mainName);
                if(qaControl.verbose) { process.stdout.write("Reading 'main' from '"+mainFile+"'...\n"); }
                return fs.stat(mainFile).then(function(stat) {
                    if(stat.isFile()) {
                        return fs.readFile(mainFile, 'utf8').then(function(content) {
                            info['files'][mainName].content = content;
                        });
                    }
                });
            }            
        });
    }).then(function() {
        return info;
    });
};

qaControl.controlInfo=function controlInfo(info){
    var resultWarnings=[];
    var rules = qaControl.projectDefinition[qaControl.currentVersion].rules;
    if(qaControl.verbose) { process.stdout.write("Controlling project information...\n"); }
    var cadenaDePromesas = Promises.start();
    _.forEach(rules, function(rule, ruleName) {
        rule.checks.forEach(function(checkInfo){
            cadenaDePromesas = cadenaDePromesas.then(function() {
                if(qaControl.verbose) { process.stdout.write("Checking rule '"+ruleName+"'...\n"); }
                return checkInfo.warnings(info);
            }).then(function(warningsOfThisRule) {
                if(warningsOfThisRule.length) {
                    resultWarnings=resultWarnings.concat(warningsOfThisRule);
                    if(rule.shouldAbort) { throw new Error("ruleIsAborting"); }
                }
                return resultWarnings;
            });
        });
    });
    cadenaDePromesas=cadenaDePromesas.catch(function(err) {
        if(err.message !== 'ruleIsAborting') {
            throw err;
        };
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
}

qaControl.controlProject=function controlProject(projectDir){
    return Promises.start(function(){
        return qaControl.loadProject(projectDir);
    }).then(function(info){
        return qaControl.controlInfo(info);
    });
}

qaControl.main=function main(parameters) {
    return Promises.start(function() {
        qaControl.verbose = parameters.verbose;
        if(parameters.listLangs) {
            process.stdout.write("Available languages:");
            for(var lang in qaControl.msgs) { process.stdout.write(" "+lang); }
            process.stdout.write("\n");
        } else {
            return qaControl.controlProject(parameters.projectDir).then(function(warns) {
                if(parameters.lang) {
                    console.log("lang: ", parameters.lang);
                }
                return qaControl.stringizeWarnings(warns, parameters.lang || "en");
            }).then(function(warnString) {
                process.stdout.write(warnString);
                return warnString;
            });
        }        
    });
};

module.exports = qaControl;
