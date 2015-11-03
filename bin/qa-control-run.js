#!/usr/bin/env node

"use strict";

var program = require('commander');
var qaControl = require('./qa-control');
var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');

program
    .version(require('../package').version)
    .usage('[[options] projectDirectory|--list-langs]')
    .option('-l, --lang [lang]', 'Language to generate')
    .option('-v, --verbose', 'Show progress information')
    //.option('-s, --silent', 'Don\'t output anything')
    .option('-L, --list-langs', 'List available languages')
    .option('-c, --cucardas', 'Always generate cucardas.log')
    .parse(process.argv);
    
if( ( !program.listLangs && (""==program.args && !program.projectDir))
    || (program.lang && false === program.lang in qaControl.msgs) )
{
    program.help();
}

var params = {};
params.projectDir = program.args[0];
params.verbose = program.verbose;
//params.silent = program.silent;
params.listLangs = program.listLangs;
params.lang = program.lang;
params.cucardas = program.cucardas;

//console.log(params); process.exit(0);

qaControl.main(params).then(function(warnStr){
    if(! params.listLangs) {
        var msgs = qaControl.cmdMsgs[params.lang || 'en'];
        process.stderr.write(msgs.msg_done+(""===warnStr ? ' '+msgs.msg_nowarns:'')+'!');
    }
}).catch(function(err){
    process.stderr.write("\nERROR: "+err.message);
    process.stderr.write("\nSTACK: "+err.stack);
});
