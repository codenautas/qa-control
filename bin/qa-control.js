"use strict";

// CMD-TOOL
var qaControl = {};

var fs = require('fs-extra');
var Path = require('path');
var os = require('os');
var stripBom = require('strip-bom-string');
var yaml = require('js-yaml');
var semver = require("semver");
var bestGlobals = require("best-globals");

// lodash replacements (para best-globals?)
function map(obj, func) {
    var index = -1;
    var res = [];
    for(var key in obj) { if(obj[key]) { res[++index] = func(obj[key], key, obj); } }
    return res;
}

function forEach(obj, func) {
    for(var key in obj) { if(obj[key]) { func(obj[key], key, obj); } }
}
// fin lodash replacements

qaControl.msgs={
    en:{
        lack_of_mandatory_section_1: 'lack of mandatory section "$1" in qa-control section of package.json',
        repository_name_not_found: 'packageJson.repository must be in format /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/',
        lack_of_qa_control_in_dev_dependencies: 'qa-control must be in devDependencies with the same version as qa-control.package-version',
        qa_control_version_mismatch_in_dev_dependencies_1_expected_2: 'qa-control version in devDependencies is "$1" but expected "$2"',
        bailing_could_be_more: '--bail(ing)! There could be more issues'
    },
    es:{
        deprecated_version: 'la version es demasiado vieja',
        invalid_value_1_in_parameter_2_valid_values_3: 'valor invalido "$1" para el parametro "$2" en la sección qa-control. Valores válidos: $3',
        lack_of_mandatory_file_1: 'falta el archivo obligatorio "$1"',
        //lack_of_mandatory_parameter_1: 'falta el parámetro obligatorio "$1"',
        lack_of_mandatory_section_1: 'falta la sección obligatoria "$1" en la sección qa-control',
        no_qa_control_section_in_codenautas_project: 'falta la sección "qa-control" en package.json y aparenta ser un proyecto codenautas',
        no_multilang_section_in_1: 'falta la sección multilang en el archivo $1',
        no_package_json: 'falta el archivo package.json',
        no_qa_control_section_in_package_json: 'falta la sección qa-control en package.json',
        //unparseable_package_json: 'existe package.json pero no puede parsearse',
        lack_of_cucarda_marker_in_readme:'falta la sección "cucardas" en README.md',
        lack_of_mandatory_cucarda_1: 'falta la cucarda oblicatoria $1',
        wrong_format_in_cucarda_1: 'la cucarda "$1" tiene formato incorrecto',
        forbidden_cucarda_1: 'la cucarda "$1" no debe usarse en README.md',
        lack_of_mandatory_line_1_in_file_2: 'falta la linea obligatoria $1 en el archivo $2',
        file_1_does_not_match_custom_2: '$1 no respeta la custombre $2',
        first_lines_does_not_match_in_file_1: 'las primeras líneas no coinciden en $1',
        repository_name_not_found: 'packageJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/',
        using_normal_promise_in_file_1: 'se han usado Promise(s) normales en "$1"',
        packagejson_main_file_1_does_not_exists: 'no existe el archivo "main" ($1) declarado en package.json',
        eslint_warnings_in_file_1: 'el archivo "$1" tiene warnings de ESLint',
        readme_multilang_not_sincronized_with_file_1: 'README.md no esta sincronizado con "$1" para multilang',
        lack_of_repository_section_in_package_json: 'Falta la sección "repository" en package.json',
        invalid_repository_section_in_package_json: 'La sección "repository" en package.json es inválida',
        repository_does_not_match_1: 'el repositorio no coincide con el esperado "$1"',
        invalid_dependency_version_number_format_in_dep_1: 'El formato del numero de version es incorrecto en "$1"',
        wrong_use_strict_spelling_in_file_1: '"use strict" está mal escrito en "$1"',
        lack_of_files_section_in_package_json: 'Falta la sección "files" en package.json',
        invalid_files_section_in_package_json: 'La sección "files" en package.json es inválida',
        incorrect_ecmascript_versions_in_package_json: 'Las versiones de ECMAScript utilizadas en package.json son incorrectas',
        non_recomended_dependency_1_in_package_json: 'Dependencia no recomendada "$1" en package.json',
        lack_of_workflow_file_1: 'falta el archivo de workflow "$1"',
        workflow_file_1_differs: 'el archivo de workflow "$1" difiere del template de qa-control',
        lack_of_qa_control_in_dev_dependencies: 'qa-control debe estar en devDependencies con la misma versión que qa-control.package-version',
        qa_control_version_mismatch_in_dev_dependencies_1_expected_2: 'La versión de qa-control en devDependencies es "$1" pero se esperaba "$2"',
        bailing_could_be_more: '¡Qué --bail(e)! Podrían haber más problemas, correr de nuevo después de corregir estos'
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
    return buf.replace(/[^\S\r\n]*(?:\r\n?|\n)/g, os.EOL).replace(/(\r?\n)+$/g, os.EOL);
};

// bufTest debe empezar con bufStart
qaControl.startsWith = function startsWith(bufTest, bufStart) {
    return qaControl.fixEOL(bufTest).indexOf(qaControl.fixEOL(bufStart))===0;
};

qaControl.getRepositoryUrl = function getRepositoryUrl(packageJson) {
    var repo = packageJson.repository?.url ?? packageJson.repository ?? "";
    var ghRepo = /(https:\/\/github\.com\/)/.exec(repo);
    if(ghRepo) { repo = repo.replace(ghRepo[1], ''); }
    return repo;
};

// devuelve el contenido para el archivo de salida (p.e. cucardas.log)
qaControl.cucaMarker = '<!-- cucardas -->';
qaControl.generateCucardas = function generateCucardas(cucardas, packageJson) {
    var cucaFileContent = qaControl.cucaMarker+'\n';
    /** @type {{tag:string|null}} */
    var info = { tag: null }
    var modulo=packageJson.name;
    var repo=qaControl.getRepositoryUrl(packageJson).replace('/'+modulo,'');
    /*jshint forin: false */
    /*eslint-disable guard-for-in */
    for(var nombreCucarda in cucardas) {
        var cucarda = cucardas[nombreCucarda];
        if(cucarda.forbidden) { continue; }
        if(!cucarda.check || cucarda.check(packageJson)) {
            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,modulo);
            cucaFileContent += cucaStr +'\n';
        }
    }
    /*jshint forin: true */
    /*eslint-enable guard-for-in */
    return cucaFileContent;
};

/*eslint-disable complexity */
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
/*eslint-enable complexity */

qaControl.checkDepVerNumberFormat = function checkDepVerNumberFormat(info) {
    var warns = [];
    if("dependencies" in info.packageJson) {
        /*jshint forin: false */
        /*eslint-disable guard-for-in */
        for(var depName in info.packageJson.dependencies) {
            var versionNumber = info.packageJson.dependencies[depName];
            if(! semver.valid(versionNumber.match(/^([\^~])/) ? versionNumber.substring(1) : versionNumber)) {
                warns.push({warning:'invalid_dependency_version_number_format_in_dep_1', params:[depName], scoring:{conventions:1}});
            }
        }
        /*jshint forin: true */
        /*eslint-enable guard-for-in */
    }
    return warns;
};

qaControl.nodeVerInTravisRE = /[678]/;

qaControl.verbose = false;
qaControl.cucardas_always = false;
qaControl.repoIs = null;
qaControl.definition = require("./definition/definition.js")(qaControl);

qaControl.lang = process.env.qa_control_lang || 'en';

qaControl.mainDoc = function mainDoc() {
    return qaControl.definition.fileNameMainDoc;
};

qaControl.fixMessages = function fixMessages(messagesToFix) {
    return Promise.resolve().then(function() {
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
var configReading=(function(){
    var definition = qaControl.definition;
    definition.firstLines=definition.firstLines||{};
    return Promise.all(map(definition.sections['run-in'].values,function(runInProperties, runInValue){
        return Promise.all(map(definition.sections.type.values,function(typeProperties, typeValue){
            return fs.readFile(Path.join(__dirname,'definition','first-lines-'+runInValue+'-'+typeValue+'.txt'),{encoding: 'utf8'}).catch(function(err){
                if(err.code!=='ENOENT'){
                    throw err;
                }
                return fs.readFile(Path.join(__dirname,'definition','first-lines-'+runInValue+'.txt'),{encoding: 'utf8'});
            }).then(function(content){
                definition.firstLines[runInValue]=definition.firstLines[runInValue]||{};
                definition.firstLines[runInValue][typeValue]=content;
            });
        }));
    }));
})().then(function(){
    return qaControl.fixMessages(qaControl.msgs.en);
}).then(function(){
    // only for test, in production this sleep must gone
    return bestGlobals.sleep(500);
}).then(function(){
    qaControl.configReady=true;
}).catch(function(err){
    console.log('UNABLE TO LOAD CONFIGURATION');
    console.log('error',err);
    console.log('stack',err.stack);
});

qaControl.loadProject = function loadProject(projectDir) {
    var info = /** @type {ProjectInfo} */ ({projectDir:projectDir});
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    if(qaControl.verbose) { process.stdout.write(cmsgs.msg_starting+projectDir+"'...\n"); }
    return Promise.resolve().then(function(){
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
        files = files.filter(function(f){ return f !== 'cucardas.log'; });
         /*jshint forin: false */
         /*eslint-disable guard-for-in */
        for(var f in files) { info.files[files[f]] = {}; }
         /*jshint forin: true */
         /*eslint-enable guard-for-in */
        if(files.indexOf('package.json') !== -1) {
            info.packageJson = /** @type {PackageJson} */ ({});
        }
        return Promise.all(files.map(function(file){
            var iFile = Path.normalize(projectDir+'/'+file);
            return Promise.resolve().then(function() {
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
        });
    }).then(function() {
        return info;
    });
};

/**
 *
 * @param {ProjectInfo} info
 * @param {QAOptions} [opts]
 * @returns
 */
qaControl.controlInfo=function controlInfo(info, opts){
    var resultWarnings=[];
    var existingWarnings={};
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    var rules = qaControl.definition.rules;
    var silenced = ((info.packageJson || {})['qa-control'] || {}).silenced || [];
    var cadenaDePromesas = Promise.resolve(/** @type {Warning[]} */ ([]));
    info.scoring = opts && opts.scoring;
    var bailed = false;
    info.warningCount = 0;
    forEach(rules, function(rule, ruleName) {
        rule.checks.forEach(function(checkInfo){
            cadenaDePromesas = cadenaDePromesas.then(function() {
                if(rule.eclipsers && rule.eclipsers.some(function(warning){ return existingWarnings[warning]; })){
                    return [];
                }
                if(qaControl.verbose) { process.stdout.write(cmsgs.msg_checking+" '"+ruleName+"'...\n"); }
                return checkInfo.warnings(info);
            }).then(function(warningsOfThisRule) {
                var activeWarnings = warningsOfThisRule.filter(function(w){ return silenced.indexOf(w.warning) === -1; });
                if(activeWarnings.length) {
                    resultWarnings=resultWarnings.concat(activeWarnings);
                    activeWarnings.forEach(function(warning){
                        existingWarnings[warning.warning]=true;
                    });
                    if(rule.couldBail && opts && opts.bail) {
                        bailed = true;
                        throw new Error("ruleIsAborting");
                    }
                    if(rule.mustAbort) {
                        throw new Error("ruleIsAborting");
                    }
                }
                info.warningCount += warningsOfThisRule.length;
                return resultWarnings;
            });
        });
    });
    cadenaDePromesas=cadenaDePromesas.catch(function(err) {
        if(err.message !== 'ruleIsAborting') {
            throw err;
        }
    }).then(function(){
        if(bailed) { resultWarnings.push({warning:'bailing_could_be_more'}); }
        return resultWarnings;
    });
    return cadenaDePromesas;
};

qaControl.stringizeWarnings = function stringizeWarnings(warns, lang) {
    var warnStr = '';
    return Promise.resolve().then(function() {
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
                    msg = msg.replace('$'+(p+1), warn.params[p]);
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
    qaControl.repoIs = (opts && opts.repoIs) || null;
    return Promise.resolve().then(function(){
        return qaControl.loadProject(projectDir);
    }).then(function(info){
        return qaControl.controlInfo(info, opts);
    });
};

qaControl.main=function main(parameters) {
    return Promise.resolve().then(function() {
        if(parameters.listLangs) {
            var msgLang =qaControl.cmdMsgs[parameters.lang || 'en'].msg_langs;
            process.stdout.write(msgLang+':');
             /*jshint forin: false */
             /*eslint-disable guard-for-in */
            for(var lang in qaControl.msgs) { process.stdout.write(" "+lang); }
             /*jshint forin: true */
             /*eslint-enable guard-for-in */
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
