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
        msg_canceled: 'Initialization canceled'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_finished: 'Proyecto inicializado',
        msg_canceled: 'Initialización cancelada'
    }
};

qacInit.init = function init() {
    var dir = process.cwd();
    var initFile = './qac-input.js';
    return Promises.start(function() {
        return initPackageJson(dir, initFile, {});
    });
};

module.exports = qacInit;
