"use strict";

var _ = require("lodash");
var stripBom = require("strip-bom");
var semver = require("semver");
var jsh = require('jshint280');
var esl = require('eslint');
var multilang = require('multilang');
var fs = require('fs-promise');
var Path = require('path');

module.exports = function(qaControl){
    return {
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
            training:{
                check: function(packageJson){ 
                    return packageJson['qa-control'].purpose==='training';
                },
                md:'![training](https://img.shields.io/badge/stability-training-ffa0c0.svg)',
                imgExample:'https://img.shields.io/badge/stability-training-ffa0c0.svg'
            },
            example:{
                check: function(packageJson){ 
                    return packageJson['qa-control'].purpose==='example';
                },
                md:'![example](https://img.shields.io/badge/stability-example-a0a0f0.svg)',
                imgExample:'https://img.shields.io/badge/stability-example-a0a0f0.svg'
            },
            stable:{
                check: function(packageJson){ 
                    return semver.satisfies(packageJson.version,'>=1.0.0') && !packageJson['qa-control'].purpose;
                },
                md:'![stable](https://img.shields.io/badge/stability-stable-brightgreen.svg)',
                imgExample:'https://img.shields.io/badge/stability-stable-brightgreen.svg'
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
            },
            'qa-control':{
                mandatory:true,
                md:'[![qa-control](http://codenautas.com/github/xxx/yyy.svg)](http://codenautas.com/github/xxx/yyy)',
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
        eslint_options: {
            "env": {
              "node": false
            },
            "rules": {
              "strict": 0,
              "no-console": 1,
              "no-unused-vars": 1
            }
        },
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
            }, // agregar desde acá
            no_test_in_node_four:{
                checks:[{
                    warnings:function(info){
                        if(info.dotTravis && info.dotTravis.node_js.filter(function(x){ return x[0]==="4" || x[0]==="5";}).length<2){
                            return [{warning:'no_test_in_node_four', scoring:{versions:1}}];
                        }
                        return [];
                    }
                }],
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
                            var ProjectName = qaControl.jsProjectName(info.packageJson.name);
                            var projectName = qaControl.first("toLowerCase")(ProjectName);
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
                                                console.log('RUN-IN', whichRunIn);
                                                console.log('DIF STARTS IN:',JSON.stringify(code.substring(i, Math.min(model1.length, i+20))));
                                                console.log('MODEL 1      :',JSON.stringify(model1.substring(i, Math.min(model1.length, i+20))));
                                                console.log('MODEL 2      :',JSON.stringify(model2.substring(i, Math.min(model1.length, i+20))));
                                                console.log('FOR MODULE NAME:',projectName,'OR',ProjectName);
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
                        return qaControl.checkLintConfig(info,
                                                         'jshintConfig',
                                                         'lack_of_jshintconfig_section_in_package_json',
                                                         qaControl.projectDefinition[info.packageVersion].jshint_options,
                                                         'incorrect_jshintconfig_option_1_in_package_json',
                                                         {jshint:1});
                    }
                }]
            },
            eslint_config:{
                checks:[{
                    warnings:function(info){
                        return qaControl.checkLintConfig(info,
                                                         'eslintConfig',
                                                         'lack_of_eslintconfig_section_in_package_json',
                                                         qaControl.projectDefinition[info.packageVersion].eslint_options,
                                                         'incorrect_eslintconfig_option_1_in_package_json',
                                                         {eslint:1});
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
            eslint:{
                eclipsers:['packagejson_main_file_1_does_not_exists', 'first_lines_does_not_match_in_file_1',
                           'lack_of_eslintconfig_section_in_package_json', 'incorrect_eslintconfig_option_1_in_package_json'],
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        var eslintOpts = 
                            info.packageJson.eslintConfig || 
                            qaControl.projectDefinition[info.packageVersion].eslint_options;
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                var content = info.files[file].content;
                                var data = esl.linter.verify(content, eslintOpts);
                                if(data.length) {
                                    if(qaControl.verbose){
                                        console.log('JSHINT output:');
                                        console.log('eslintOpts',eslintOpts);
                                        console.log(data.length, " JSHINT errors");
                                        console.log(data);
                                        //console.log(data);
                                    }
                                    warns.push({warning:'eslint_warnings_in_file_1', params:[file], scoring:{eslint:1}});
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
                            var reDep=/^~?\d+\.\d+\.\d+$/;
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
            },
            use_strict:{
                checks:[{
                    warnings:function(info){
                        var warns = [];
                        for(var file in info.files) {
                            if(file.match(/(.js)$/)) {
                                var content = info.files[file].content;
                                var lines = info.files[file].content.split(/\r?\n/);
                                var prevLine = null;
                                for(var l=0; l<lines.length; ++l) {
                                    var line = lines[l];
                                    var trimLine = line.replace(/^(\s+)/,'');
                                    //console.log("line:"+l, '['+line+']', "trimmed", '['+trimLine+']', "prev", '['+prevLine+']');
                                    if(trimLine.length>0
                                        && trimLine[0].match(/['"']/)
                                        && prevLine
                                        && prevLine.match(/{$/)
                                        && ! prevLine.match(/[a-zA-Z0-9_]+\s?:/)
                                        )
                                    {
                                        if(! trimLine.match(/"use strict";/)) {
                                            if(qaControl.verbose){
                                                console.log('['+file+']');
                                                console.log('  '+(l-1)+':"'+prevLine+'"');
                                                console.log('  '+(l)+':"'+line+'"');
                                            }
                                            warns.push({warning:'wrong_use_strict_spelling_in_file_1', params:[file], scoring:{customs:1}});
                                        }
                                    }
                                    prevLine = line;
                                }
                            }
                        }
                        return warns;
                    }
                }]
            }
        }
    };
};
