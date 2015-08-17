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
    .option('-s, --silent', 'Don\'t output anything')
    .option('-L, --list-langs', 'List available languages')
    .parse(process.argv);
    
if( !program.listLangs && (""==program.args && !program.projectDir) )
{
    program.help();
}

var params = {};
params.projectDir = program.args[0];
params.silent = program.silent;
params.listLangs = program.listLangs;
params.lang = program.lang;

//console.log(params); process.exit(0);

qaControl.main(params).then(function(){
    //process.stderr.write("Done!");
}).catch(function(err){
    process.stderr.write("ERROR: "+err.message);
});
