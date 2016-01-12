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

function initPackageJson(outDir, initFile, configData) {
    return Promises.make(function(resolve, reject) {
        init(outDir, initFile, configData, function (er, data) {
            if(er) { reject(er); }
            resolve(data);
        });
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
        return initPackageJson(outDir, customFile, customData);
    }).then(function(data) {
        finalJson = data;
        var cucardas=qaControl.projectDefinition[data['qa-control']['package-version']].cucardas;
        cucaContent = qaControl.generateCucardas(cucardas, data);
        //console.log(cucaContent);
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
                out.write('  '+msgs.msg_copying+' '+file+'...\n');
                return fs.copy(Path.resolve(templateDir+'/'+file), Path.resolve(outDir+'/'+file));                
            }
        }));
    });
};

module.exports = qacInit;
