"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var qaControlInit = {};

var Promises = require('best-promise');
var fs = require('fs-promise');
var Path = require('path');

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

module.exports = qaControlInit;
