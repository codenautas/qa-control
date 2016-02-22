"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var qacInit = {};

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');
var init = require('init-package-json');
var qaControl = require('./qa-control.js');
var multilang = require('multilang');

qacInit.promptForVar = function promptForVar(name, defaultValue) {
    process.stdin.setEncoding('utf8');
    var def = defaultValue ? ' ('+defaultValue+')' : '';
    process.stdout.write(name+def+':');
    return Promises.make(function(resolve, reject) {
        process.stdin.on('readable', function() {
            var chunk = process.stdin.read();
            if(chunk !== null) {
                //process.stdout.write(`data: "${chunk}"`);
                if(chunk.match(/\r?\n/)) {
                    process.stdin.end();
                    resolve(chunk.replace(/\s+$/,''));
                }
            }
        });
        process.stdin.on('end', function(){
            reject("unexpected end");
        });
        process.stdin.on('error', function(err) {
            reject("error:"+err);
        });
    }); 
};

//
    
function getParam(param, ctx) {
    return Promises.start(function() {
        if(param.init) { param.init(ctx); }
        return qacInit.promptForVar(param.name, param.def).then(function(value) {
           ctx.result[param.name] = value;
        });
    });
};

// params es un array de Param
qacInit.readParameters = function readParameters(params, existingJson, qacJson) {
    var ctx = {
        result:{},
        defs:existingJson,
        qac:qacJson
    };
    var cadenaDePromesas = Promises.start();
    params.forEach(function(param) {
       cadenaDePromesas = cadenaDePromesas.then(function() {
            return getParam(param, ctx);
       });
    });
    return cadenaDePromesas.then(function() {
       return ctx.result; 
    }).catch(function(err) {
        throw { message:'input_error', desc:err };
    });
};

// utiliza qacJson como plantilla
qacInit.generateJSon = function generateJSon(readedParameters, qacJson) {
    return Promises.start(function() {
        var outJson = JSON.parse(JSON.stringify(qacJson));
        for(var paramName in readedParameters) {
            var val = readedParameters[paramName];
            outJson[paramName] = val;
        }
        return outJson;
    });
};

qacInit.cmdMsgs = {
    en: {
        msg_initializing: 'Initializing project',
        msg_creating: 'Creating files',
        msg_copying: 'Copying file',
        msg_generating: 'Generationg',
        msg_finished: 'Project initialized',
        msg_error: 'Input error',
        msg_error_desc: '"description" field is mandatory',
        msg_canceled: 'Initialization canceled'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_creating: 'Creando archivos',
        msg_copying: 'Creando archivo',
        msg_generating: 'Generando',
        msg_finished: 'Proyecto inicializado',
        msg_error: 'Error en los argumentos',
        msg_error_desc: 'El campo "description" es obligatorio',
        msg_canceled: 'Initialización cancelada'
    }
};


function initPackageJson(outDir, initFile, configData) {
    return Promises.make(function(resolve, reject) {
        init(outDir, initFile, configData, function (er, data) {
            if(er) { reject(er); }
            resolve(data);
        });
    });
};

qacInit.init = function init(params) {
    var out = process.stdout;
    var outDir = params.projectDir || process.cwd();
    var msgs = qacInit.cmdMsgs[params.lang || 'en'];
    var customData = {
        'inputDir':outDir,
        'msgs':msgs
    };
    var templateDir = Path.normalize(__dirname+'/init-template');
    var customFile = Path.normalize(__dirname+'/qac-input.js');
    var oriREADME = Path.normalize(outDir+'/README.md');
    var oriPackageJson = Path.normalize(outDir+'/package.json');
    var qacPackageJson = Path.normalize(Path.dirname(__dirname)+'/package.json');
    var qacJson;
    var cucaContent='';
    var finalJson;
    var leemeContent='';
    return fs.readJson(qacPackageJson).then(function(json) {
        qacJson = json;
        customData['qac'] = qacJson;
        return fs.exists(oriPackageJson);
    }).then(function(exists) {
        if(exists) { return fs.readJson(oriPackageJson); }
        return { 'first_init': true };
    }).then(function(oriJson) {
        if(! oriJson.first_init) {
            customData['defs'] = oriJson;
            customData['qa-control-version'] = (('qa-control' in oriJson) ? oriJson : qacJson)['qa-control']['package-version'];
        } else {
            customData['qa-control-version'] = qacJson['qa-control']['package-version'];
        }
        return fs.exists(oriREADME);
    }).then(function(exists) {
        if(exists) {
            return fs.readFile(oriREADME, {encoding: 'utf8'});
        }
        return {'not_exists':true};
    }).then(function(existingReadme) {
        if(! existingReadme.not_exists) {
            //console.log(existingReadme);
            var lines = existingReadme.split(/\r?\n/);
            if(lines.length===3 && lines[2]=='') {
                lines.splice(2, 1);
            }
            if(lines.length!==2) {
                throw new Error('Existing README.md is not empty')
            }
            if(! ('defs' in customData)) { customData['defs'] = {}; }
            var defs = customData['defs'];
            defs['name'] = lines[0].substr(2);
            defs['description'] = lines[1];
        }
        //customData['yes']=true;
        //customData['silent']=true;
        return initPackageJson(outDir, customFile, customData);
    }).then(function(data) {
        finalJson = data;
        var cucardas=qaControl.projectDefinition[data['qa-control']['package-version']].cucardas;
        cucaContent = qaControl.generateCucardas(cucardas, data);
        //console.log(cucaContent);
        return fs.readFile(Path.normalize(templateDir+'/LICENSE.tpl'), {encoding: 'utf8'});
    }).then(function(licenseTPL) {
        licenseTPL = licenseTPL.replace(new RegExp('{{author}}', 'g'), finalJson.author);
        var now = new Date();
        licenseTPL = licenseTPL.replace(new RegExp('{{year}}', 'g'), now.getFullYear());
        //console.log(licencse);
        var license = Path.resolve(outDir+'/LICENSE');
        out.write(msgs.msg_generating+' '+license+'...\n');
        return fs.writeFile(license, licenseTPL);
    }).then(function() {
        return fs.readFile(Path.normalize(templateDir+'/LEEME.tpl'), {encoding: 'utf8'});
    }).then(function(leeme) {
        leeme = leeme.replace(new RegExp('{{name}}', 'g'), finalJson.name);
        leeme = leeme.replace(new RegExp('{{desc}}', 'g'), finalJson.description);
        leeme = leeme.replace(new RegExp('{{cucardas}}', 'g'), cucaContent);
        //console.log(readme);
        leemeContent = leeme;
        var leemeMD = Path.resolve(outDir+'/LEEME.md');
        out.write(msgs.msg_generating+' '+leemeMD+'...\n');
        return fs.writeFile(leemeMD, leeme);
    }).then(function() {
        var readmeMD = Path.resolve(outDir+'/README.md');
        out.write(msgs.msg_generating+' '+readmeMD+'...\n');
        var readme = multilang.changeNamedDoc(readmeMD, leemeContent, 'en');
        return fs.writeFile(readmeMD, multilang.stripComments(readme));
    }).then(function() {
        out.write(msgs.msg_creating+'...\n');
        return fs.readdir(templateDir);
    }).then(function(files) {
        return Promises.all(files.map(function(file){
            if(! file.match(/(.tpl)$/)) {
                var oFile = file;
                if(file.match(/^(dot-)/)) {
                    oFile = '.'+file.substring(4);
                }
                out.write('  '+msgs.msg_copying+' '+oFile+'...\n');
                return fs.copy(Path.resolve(templateDir+'/'+file), Path.resolve(outDir+'/'+oFile));                
            }
        }));
    });
};

module.exports = qacInit;
