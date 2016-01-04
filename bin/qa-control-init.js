"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var qaControlInit = {};

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

qaControlInit.cmdMsgs = {
    en: {
        msg_initializing: 'Initializing project',
        msg_finish: 'Project initialized'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_finish: 'Proyecto inicializado'
    }
};

qaControlInit.init = function init() {
    
};

module.exports = qaControlInit;
