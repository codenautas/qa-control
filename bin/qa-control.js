"use strict";
/*jshint eqnull:true */
/*jshint node:true */
/*eslint-disable no-console */

// CMD-TOOL
var qaControl = {};

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var _ = require('lodash');
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
        eslint_warnings_in_file_1: 'el archivo "$1" tiene warnings de ESLint',
        lack_of_jshintconfig_section_in_package_json: 'falta la sección "jshintConfig" en package.json',
        incorrect_jshintconfig_option_1_in_package_json: 'la opcion "$1" en "jshintConfig" es incorrecta en package.json',
        readme_multilang_not_sincronized_with_file_1: 'README.md no esta sincronizado con "$1" para multilang',
        lack_of_repository_section_in_package_json: 'Falta la sección "repository" en package.json',
        invalid_repository_section_in_package_json: 'La sección "repository" en package.json es inválida',
        invalid_dependency_version_number_format_in_dep_1: 'El formato del numero de version es incorrecto en "$1"',
        wrong_use_strict_spelling_in_file_1: '"use strict" está mal escrito en "$1"',
        lack_of_files_section_in_package_json: 'Falta la sección "files" en package.json',
        invalid_files_section_in_package_json: 'La sección "files" en package.json es inválida',
        incorrect_ecmascript_versions_in_package_json: 'Las versiones de ECMAScript utilizadas en package.json son incorrectas',
        older_version_of_qa_control_in_package_json: 'La versión de qa-control en el package.json es vieja'
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
        msg_controlling: 'Controlling project information with definitions rules version ',
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
        msg_controlling: 'Controlando la información del proyecto con definiciones de reglas versión ',
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

qaControl.checkLintConfig = function checkLintConfig(info, lintConfigName, warnLackOf, requiredOptions, warnIncorrect, scoring) {
    var warns = [];
    if(!(lintConfigName in info.packageJson)) {
        warns.push({warning:warnLackOf, scoring:{mandatory:1}});
    }
    else {
        var checkedOptions = info.packageJson[lintConfigName];
        for(var op in requiredOptions) {
            if((false === op in checkedOptions) || JSON.stringify(checkedOptions[op]) !== JSON.stringify(requiredOptions[op])) {
                if(qaControl.verbose){
                    if(false === op in checkedOptions) {
                        console.log("  "+lintConfigName+": Missing property '"+op+"'");
                    } else {
                        console.log("  "+lintConfigName+": property '"+op+"' differs\n    '"+JSON.stringify(checkedOptions[op])+
                                    "'\n    '"+JSON.stringify(requiredOptions[op])+"'");
                    }
                }
                warns.push({warning:warnIncorrect, params:[op], scoring:scoring});
            }
        }
    }
    return warns;
};

qaControl.verbose = false;
qaControl.cucardas_always = false;
qaControl.projectDefinition = {};
qaControl.projectDefinition['0.0.1'] = require("./0.0.1/definition.js")(qaControl);
qaControl.projectDefinition['0.0.2'] = require("./0.0.2/definition.js")(qaControl);
qaControl.projectDefinition['0.1.3'] = require("./0.1.3/definition.js")(qaControl);
qaControl.projectDefinition['0.1.4'] = require("./0.1.4/definition.js")(qaControl);
qaControl.projectDefinition['0.2.0'] = require("./0.2.0/definition.js")(qaControl);

qaControl.lang = process.env.qa_control_lang || 'en';
qaControl.deprecatedVersions = '< 0.0.1';
qaControl.currentVersion = '0.2.0';

qaControl.mainDoc = function mainDoc() {
    return qaControl.projectDefinition[qaControl.currentVersion].fileNameMainDoc;
};

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

qaControl.first = function first(toWhat){
    return function(part){
        return part.substring(0, 1)[toWhat]()+part.substring(1);
    };
};
    
qaControl.jsProjectName = function jsProjectName(projectName) {
    var parts = projectName.split('-');
    return parts.map(qaControl.first("toUpperCase")).join('');
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
        var verCheck = ((info.packageJson || {})['qa-control'] || {})['package-version'];
        //console.log("verCheck", verCheck)
        if(verCheck && ! (verCheck in qaControl.projectDefinition)) {
            throw new Error("inexistent qa-control version: "+verCheck);
        }
        info.usedDefinition = (verCheck in qaControl.projectDefinition) ? verCheck : qaControl.currentVersion;
        return info;
    });
};

qaControl.controlInfo=function controlInfo(info, opts){
    var resultWarnings=[];
    var existingWarnings={};
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    var rules = qaControl.projectDefinition[info.usedDefinition].rules;
    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_controlling+info.usedDefinition+"...\n"); }
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

