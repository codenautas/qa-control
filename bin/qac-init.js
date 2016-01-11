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

function initPackageJson(dir, initFile, configData) {
    return Promises.make(function(resolve, reject) {
        init(dir, initFile, configData, function (er, data) {
            if(er) { reject(er); }
            resolve(data);
        });
    });
};

qacInit.cmdMsgs = {
    en: {
        msg_initializing: 'Initializing project',
        msg_finished: 'Project initialized',
        msg_error: 'Input error',
        msg_error_desc: '"description" field is mandatory',
        msg_canceled: 'Initialization canceled'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_finished: 'Proyecto inicializado',
        msg_error: 'Error en los argumentos',
        msg_error_desc: 'El campo "description" es obligatorio',
        msg_canceled: 'Initialización cancelada'
    }
};

qacInit.init = function init(params) {
    var dir = params.projectDir || process.cwd();
    //console.log("dir", dir)
    var customData = {
        'directorio':dir,
        'msgs':qacInit.cmdMsgs[params.lang || 'en']
    };
    var customFile = Path.normalize(__dirname+'/qac-input.js');
    var oriJson = Path.normalize(dir+'/package.json');
    return fs.exists(oriJson).then(function(exists) {
        if(exists) { return fs.readJson(oriJson); }
        return { 'no_defaults': true };
    }).then(function(json) {
        if(! json.no_defaults) {
            customData['defs'] = json;
            // console.log("json", json);
            if('qa-control' in json) {
                customData['defs']['qa-control-version'] = json['qa-control']['package-version'];
            }
        }
        // console.log("customData", customData);
        return initPackageJson(dir, customFile, customData);
    });
};

module.exports = qacInit;
