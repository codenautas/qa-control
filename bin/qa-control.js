"use strict";

// CMD-TOOL
var qaControl = {};

var fs = require('fs-extra');
var Path = require('path');
var os = require('os');
var readline = require('readline');
var stripBom = require('strip-bom-string');
var yaml = require('js-yaml');
var semver = require("semver");
var bestGlobals = require("best-globals");
var ownPackageJson = require("../package.json");

// lodash replacements (para best-globals?)
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
        lack_of_test_ci_script_in_package_json: 'lack of test-ci script in package.json',
        eslint_could_not_run: 'could not run ESLint, check the configuration file extension',
        sonar_in_private_package_json: '"qa-control.sonar" does not apply in a private project',
        forbidden_workflow_file_1_in_non_publishable: 'the project is not published: workflow "$1" does not apply',
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
        cucardas_block_differs: 'el bloque de cucardas difiere del esperado (orden, líneas sobrantes o formato)',
        lack_of_mandatory_line_1_in_file_2: 'falta la linea obligatoria $1 en el archivo $2',
        file_1_does_not_match_custom_2: '$1 no respeta la custombre $2',
        repository_name_not_found: 'packageJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/',
        using_normal_promise_in_file_1: 'se han usado Promise(s) normales en "$1"',
        packagejson_main_file_1_does_not_exists: 'no existe el archivo "main" ($1) declarado en package.json',
        eslint_warnings_in_file_1: 'el archivo "$1" tiene warnings de ESLint',
        eslint_could_not_run: 'no se pudo correr ESLint, verifique la extensión del archivo de configuración',
        readme_multilang_not_sincronized_with_file_1: 'README.md no esta sincronizado con "$1" para multilang',
        lack_of_repository_section_in_package_json: 'Falta la sección "repository" en package.json',
        invalid_repository_section_in_package_json: 'La sección "repository" en package.json es inválida',
        repository_does_not_match_1: 'el repositorio no coincide con el esperado "$1"',
        invalid_dependency_version_number_format_in_dep_1: 'El formato del numero de version es incorrecto en "$1"',
        wrong_use_strict_spelling_in_file_1: '"use strict" está mal escrito en "$1"',
        lack_of_files_section_in_package_json: 'Falta la sección "files" en package.json',
        invalid_files_section_in_package_json: 'La sección "files" en package.json es inválida',
        dot_file_1_in_files_section: 'El archivo "$1" en la sección "files" de package.json es un archivo .dot',
        incorrect_ecmascript_versions_in_package_json: 'Las versiones de ECMAScript utilizadas en package.json son incorrectas',
        non_recomended_dependency_1_in_package_json: 'Dependencia no recomendada "$1" en package.json',
        lack_of_workflow_file_1: 'falta el archivo de workflow "$1"',
        workflow_file_1_differs: 'el archivo de workflow "$1" difiere del template de qa-control',
        appveyor_yml_differs: 'el archivo appveyor.yml difiere del template de qa-control',
        lack_of_qa_control_in_dev_dependencies: 'qa-control debe estar en devDependencies con la misma versión que qa-control.package-version',
        qa_control_version_mismatch_in_dev_dependencies_1_expected_2: 'La versión de qa-control en devDependencies es "$1" pero se esperaba "$2"',
        "lack_of_test_ci_script_in_package_json": 'Falta el script "test-ci" en package.json',
        sonar_in_private_package_json: 'no corresponde "qa-control.sonar" en un proyecto privado',
        forbidden_workflow_file_1_in_non_publishable: 'el proyecto no se publica: no corresponde el workflow "$1"',
        bailing_could_be_more: '¡Qué --bail(e)! Podrían haber más problemas, correr de nuevo después de corregir estos',
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
        msg_checking: 'Checking rule',
        msg_fixed_issues: 'reported issues fixed',
        msg_delete_question: 'delete',
        msg_deletes_disabled: 'run with --deletes=yes to delete it',
        msg_deletes_needs_tty: '--deletes=ask needs an interactive terminal'
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
        msg_checking: 'Verificando regla',
        msg_fixed_issues: 'problemas arreglados (de los previamente encontrados)',
        msg_delete_question: 'borrar',
        msg_deletes_disabled: 'correr con --deletes=yes para borrarlo',
        msg_deletes_needs_tty: '--deletes=ask necesita una terminal interactiva'
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
    // npm admite varias sintaxis para repository; normalizamos a "owner/repo" cuando el host es github.
    // cubre: https://, git+https://, git://, ssh y la forma scp-like git@github.com:owner/repo.git
    var ghUrl = /github\.com[/:]([-a-zA-Z0-9_.]+)\/([-a-zA-Z0-9_.]+?)(?:\.git)?\/?(?:[#?].*)?$/.exec(repo);
    if(ghUrl) { return ghUrl[1]+'/'+ghUrl[2]; }
    // forma corta: "owner/repo" o "github:owner/repo"
    var shortHand = /^(?:github:)?([-a-zA-Z0-9_.]+)\/([-a-zA-Z0-9_.]+?)(?:\.git)?$/.exec(repo);
    if(shortHand) { return shortHand[1]+'/'+shortHand[2]; }
    return repo;
};

// devuelve el contenido para el archivo de salida (p.e. cucardas.log)
qaControl.cucaMarker = '<!-- cucardas -->';
qaControl.generateCucardas = function generateCucardas(cucardas, packageJson) {
    var cucaFileContent = qaControl.cucaMarker+'\n';
    /** @type {{tag:string|null}} */
    var info = { tag: null }
    var modulo=packageJson.name;
    var repoParts=qaControl.getRepositoryUrl(packageJson).split('/');
    var repo=repoParts[0];
    var repoName=repoParts[repoParts.length-1];
    for(var nombreCucarda in cucardas) {
        var cucarda = cucardas[nombreCucarda];
        if(cucarda.forbidden) { continue; }
        if(!cucarda.check || cucarda.check(packageJson)) {
            var cucaStr = cucarda.md.replace(/\bxxx\b/g,repo).replace(/\byyy\b/g,repoName).replace(/\bzzz\b/g,modulo);
            cucaFileContent += cucaStr +'\n';
        }
    }
    return cucaFileContent;
};

// calcula cómo quedaría el documento principal con el bloque de cucardas canónico (generateCucardas).
// Solo actúa si existe el marcador. Devuelve {mainDocName, fixedContent} si el bloque difiere, o null si ya coincide.
// Es la única fuente de verdad: la detección la usa para avisar y para armar el fix que aplica applyFixes.
/**
 * @param {ProjectInfo} info
 * @returns {{mainDocName:string, fixedContent:string}|null}
 */
qaControl.computeCucardasFix = function computeCucardasFix(info) {
    var mainDocName = qaControl.mainDoc();
    var content = info.files[mainDocName].content;
    if(content.indexOf(qaControl.cucaMarker) === -1) { return null; }
    var cucardas = qaControl.definition.cucardas;
    var expectedLines = qaControl.generateCucardas(cucardas, info.packageJson).replace(/\n+$/,'').split('\n');
    var lines = content.split(/\r\n|\r|\n/);
    var idx = -1;
    for(var i=0; i<lines.length; i++) {
        if(lines[i].indexOf(qaControl.cucaMarker) !== -1) { idx = i; break; }
    }
    // el bloque va desde el marcador hasta la primera línea en blanco (exclusive)
    var end = idx+1;
    while(end < lines.length && lines[end].trim() !== '') { end++; }
    var newContent = lines.slice(0, idx).concat(expectedLines, lines.slice(end)).join('\n');
    if(qaControl.fixEOL(newContent) === qaControl.fixEOL(content)) { return null; }
    return { mainDocName: mainDocName, fixedContent: qaControl.fixEOL(newContent) };
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

qaControl.checkDepVerNumberFormat = function checkDepVerNumberFormat(info) {
    var warns = [];
    if("dependencies" in info.packageJson) {
        for(var depName in info.packageJson.dependencies) {
            var versionNumber = info.packageJson.dependencies[depName];
            if(! semver.valid(versionNumber.match(/^([\^~])/) ? versionNumber.substring(1) : versionNumber)) {
                warns.push({warning:'invalid_dependency_version_number_format_in_dep_1', params:[depName], scoring:{conventions:1}});
            }
        }
    }
    return warns;
};

qaControl.nodeVerInTravisRE = /[678]/;

qaControl.verbose = false;
qaControl.fixMode = false;
// 'ask' | 'yes' | 'no': política para las correcciones que borran archivos
qaControl.deletes = 'ask';
qaControl.codes = false;
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
var configReading=Promise.resolve().then(function(){
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

qaControl.dumpComparison = function (id, obtained, expected, message) {
    console.error('!compareContent:', id, message ?? '');
    fs.writeFileSync(`local-${id}.obtained.txt`, obtained, 'utf8');
    fs.writeFileSync(`local-${id}.expected.txt`, expected, 'utf8');
}

// adjunta al warning cómo repararlo. La propiedad no es enumerable: el warning se sigue comparando
// y serializando como si solo tuviera warning/params/scoring, y applyFixes la lee para corregir.
/**
 * @param {Warning} warn
 * @param {WarningFix} fix
 * @returns {Warning}
 */
qaControl.withFix = function withFix(warn, fix) {
    Object.defineProperty(warn, 'fix', {value:fix, enumerable:false, writable:true, configurable:true});
    return warn;
}

// compara sin escribir: la corrección la aplica applyFixes con el fix que arma la regla
qaControl.compareContent = function (obtained, expected, id, message) {
    const result = qaControl.fixEOL(obtained) === qaControl.fixEOL(expected);
    if (qaControl.verbose || process.env.VERBOSE === id && !result) {
        qaControl.dumpComparison(id, obtained, expected, message);
    }
    return result;
}

// pregunta por consola si se borra un archivo. Solo se usa con --deletes=ask, que requiere una
// terminal interactiva: sin TTY no hay quién responda y no se borra.
/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
qaControl.askDelete = function askDelete(path) {
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    if(!process.stdin.isTTY) {
        console.log('NOT DELETED:', path, '-', cmsgs.msg_deletes_needs_tty);
        return Promise.resolve(false);
    }
    return new Promise(function(resolve, reject) {
        var rl = readline.createInterface({input:process.stdin, output:process.stdout});
        rl.question(cmsgs.msg_delete_question+' '+path+' [y/N] ', function(answer) {
            rl.close();
            resolve(/^\s*(y|s)/i.test(answer));
        });
        rl.on('error', reject);
    });
};

// decide si se borra un archivo según --deletes: 'yes' borra, 'no' informa lo que borraría,
// 'ask' (por defecto) pregunta. Borrar es la única corrección que destruye información, por eso
// no se hace sin confirmación explícita.
/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
qaControl.confirmDelete = function confirmDelete(path) {
    var cmsgs = qaControl.cmdMsgs[qaControl.lang];
    if(qaControl.deletes === 'yes') { return Promise.resolve(true); }
    if(qaControl.deletes === 'no') {
        console.log('NOT DELETED:', path, '-', cmsgs.msg_deletes_disabled);
        return Promise.resolve(false);
    }
    return qaControl.askDelete(path);
};

// aplica las reparaciones que la detección adjuntó a los warnings (propiedad "fix"). Solo se corrige
// lo que se reportó: applyFixes no busca problemas nuevos ni vuelve a evaluar reglas.
// Devuelve la cantidad de warnings efectivamente reparados.
/**
 * @param {ProjectInfo} info
 * @param {Warning[]} warns
 * @returns {Promise<number>}
 */
qaControl.applyFixes = function applyFixes(info, warns) {
    var fixedCount = 0;
    return warns.reduce(function(chain, warn) {
        return chain.then(function() {
            var fix = warn.fix;
            if(!fix) { return; }
            if(fix.action === 'copy') {
                fs.copySync(fix.from, fix.to);
                console.log('CREATED:', fix.to);
            } else if(fix.action === 'delete') {
                return qaControl.confirmDelete(fix.path).then(function(confirmed) {
                    if(!confirmed) { return; }
                    fs.removeSync(fix.path);
                    console.log('DELETED:', fix.path);
                    fixedCount++;
                });
            } else {
                var content = qaControl.fixEOL(fix.content) + (fix.preserve != null ? qaControl.fixEOL(fix.preserve) : '');
                var existed = fs.existsSync(fix.path);
                fs.outputFileSync(fix.path, content, 'utf8');
                console.log(existed ? 'FIXED:' : 'CREATED:', fix.path);
                // algunas reglas posteriores leen el contenido desde info.files (por ejemplo multilang)
                if(fix.updateFile && info.files[fix.updateFile]) {
                    info.files[fix.updateFile].content = content;
                }
            }
            fixedCount++;
        });
    }, Promise.resolve()).then(function() {
        return fixedCount;
    });
};

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
        for(var f in files) { info.files[files[f]] = {}; }
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
                info.warningCount += activeWarnings.length;
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
            if(qaControl.codes) {
                warnStr += warn.warning + ': ';
            }
            warnStr += msg + '\n';
        });
        return warnStr;
    });
};

// agrega al array qa-control.silenced del package.json los códigos de los warnings activos
// detectados en esta corrida (creando el array si no existe). Reescribe package.json con la
// indentación detectada (opción A: se acepta la normalización de formato, como hace ncu -u).
/**
 * @param {ProjectInfo} info
 * @param {Warning[]} warns
 */
qaControl.silenceAll = function silenceAll(info, warns){
    if(!info.packageJson || !info.files['package.json']) {
        console.log('SILENCE-ALL: no package.json to update');
        return;
    }
    var qac = info.packageJson['qa-control'];
    if(!qac) {
        console.log('SILENCE-ALL: no "qa-control" section in package.json');
        return;
    }
    var current = qac.silenced || [];
    var added = [];
    warns.forEach(function(warn){
        var code = warn.warning;
        if(code === 'bailing_could_be_more' || code === 'cant_continue') { return; }
        if(current.indexOf(code) === -1 && added.indexOf(code) === -1) { added.push(code); }
    });
    if(!added.length) {
        console.log('SILENCE-ALL: nothing to silence');
        return;
    }
    qac.silenced = current.concat(added);
    var raw = info.files['package.json'].content;
    var indentMatch = raw.match(/\n([ \t]+)\S/);
    var indent = indentMatch ? indentMatch[1] : '  ';
    var newContent = qaControl.fixEOL(JSON.stringify(info.packageJson, null, indent) + '\n');
    var fixPath = Path.join(info.projectDir, 'package.json');
    fs.writeFileSync(fixPath, newContent, 'utf8');
    info.files['package.json'].content = newContent;
    console.log('SILENCED:', fixPath, '-', added.join(', '));
};

// calcula el package.json con la sección "qa-control" agregada, con los valores por defecto de
// las secciones obligatorias. "type" no se puede inferir del proyecto: se escribe "lib" para que
// el usuario lo revise. No escribe nada: devuelve el fix para que lo aplique applyFixes.
/**
 * @param {ProjectInfo} info
 * @returns {WarningFix|null}
 */
qaControl.computeQaControlSectionFix = function computeQaControlSectionFix(info){
    if(!info.packageJson || !info.files['package.json']) { return null; }
    var newPackageJson = Object.assign({}, info.packageJson, {'qa-control':{
        'package-version': ownPackageJson.version,
        'run-in': 'server',
        type: 'lib'
    }});
    var raw = info.files['package.json'].content;
    var indentMatch = raw.match(/\n([ \t]+)\S/);
    var indent = indentMatch ? indentMatch[1] : '  ';
    return {
        action: 'write',
        path: Path.join(info.projectDir, 'package.json'),
        content: qaControl.fixEOL(JSON.stringify(newPackageJson, null, indent) + '\n'),
        updateFile: 'package.json'
    };
};

// calcula el package.json sin la clave indicada de la sección "qa-control", conservando la
// indentación del original. No escribe nada: devuelve el fix para que lo aplique applyFixes.
/**
 * @param {ProjectInfo} info
 * @param {string} key
 * @returns {WarningFix|null}
 */
qaControl.computeQaControlKeyRemovalFix = function computeQaControlKeyRemovalFix(info, key){
    if(!info.packageJson || !info.files['package.json']) { return null; }
    var qaSection = Object.assign({}, info.packageJson['qa-control']);
    delete qaSection[key];
    var newPackageJson = Object.assign({}, info.packageJson, {'qa-control':qaSection});
    var raw = info.files['package.json'].content;
    var indentMatch = raw.match(/\n([ \t]+)\S/);
    var indent = indentMatch ? indentMatch[1] : '  ';
    return {
        action: 'write',
        path: Path.join(info.projectDir, 'package.json'),
        content: qaControl.fixEOL(JSON.stringify(newPackageJson, null, indent) + '\n'),
        updateFile: 'package.json'
    };
};

// detecta (sin corregir), y con --fix aplica solo lo detectado y vuelve a detectar desde cero
// (releyendo el proyecto del disco) para informar lo que quedó pendiente. La corrección de un
// problema puede destrabar reglas que se cortaron por cant_continue: esas se ven en la corrida
// siguiente, por eso --fix puede necesitar correrse varias veces.
qaControl.controlProject=function controlProject(projectDir, opts){
    qaControl.verbose = opts && opts.verbose;
    qaControl.fixMode = opts && opts.fix;
    qaControl.codes = opts && opts.codes;
    qaControl.cucardas_always = opts && opts.cucardas;
    qaControl.repoIs = (opts && opts.repoIs) || null;
    qaControl.deletes = (opts && opts.deletes) || 'ask';
    function detect(){
        return qaControl.loadProject(projectDir).then(function(info){
            return qaControl.controlInfo(info, opts).then(function(warns){
                return {info:info, warns:warns};
            });
        });
    }
    return Promise.resolve().then(detect).then(function(first){
        if(!qaControl.fixMode) {
            if(opts && opts.silenceAll) { qaControl.silenceAll(first.info, first.warns); }
            return first.warns;
        }
        return qaControl.applyFixes(first.info, first.warns).then(function(fixedCount){
            if(!fixedCount) {
                if(opts && opts.silenceAll) { qaControl.silenceAll(first.info, first.warns); }
                return first.warns;
            }
            var cmsgs = qaControl.cmdMsgs[qaControl.lang];
            console.log(fixedCount, cmsgs.msg_fixed_issues);
            return detect().then(function(second){
                if(opts && opts.silenceAll) { qaControl.silenceAll(second.info, second.warns); }
                return second.warns;
            });
        });
    });
};

qaControl.main=function main(parameters) {
    return Promise.resolve().then(function() {
        if(parameters.listLangs) {
            var msgLang =qaControl.cmdMsgs[parameters.lang || 'en'].msg_langs;
            process.stdout.write(msgLang+':');
            for(var lang in qaControl.msgs) { process.stdout.write(" "+lang); }
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
