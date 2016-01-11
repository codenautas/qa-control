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
        msg_finished: 'Project initialized',
        msg_error: 'Input error',
        msg_error_desc: '"description" field is mandatory',
        msg_canceled: 'Initialization canceled'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_creating: 'Creando archivos',
        msg_copying: 'Creando archivo',
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
        'directorio':outDir,
        'msgs':msgs
    };
    var templateDir = Path.normalize(__dirname+'/init-template');
    var customFile = Path.normalize(__dirname+'/qac-input.js');
    var oriJson = Path.normalize(outDir+'/package.json');
    return fs.exists(oriJson).then(function(exists) {
        if(exists) { return fs.readJson(oriJson); }
        return { 'no_defaults': true };
    }).then(function(json) {
        if(! json.no_defaults) {
            customData['defs'] = json;
            if('qa-control' in json) {
                customData['defs']['qa-control-version'] = json['qa-control']['package-version'];
            }
        }
        return initPackageJson(outDir, customFile, customData);
    }).then(function() {
        out.write(msgs.msg_creating+'...\n');
        return fs.readdir(templateDir);
    }).then(function(files) {
        return Promises.all(files.map(function(file){
            out.write('  '+msgs.msg_copying+' '+file+'...\n');
            return fs.copy(Path.resolve(templateDir+'/'+file), Path.resolve(outDir+'/'+file));
        }));
    });
};

module.exports = qacInit;
