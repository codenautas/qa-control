#!/usr/bin/env node

"use strict";

var { program } = require('commander');
var qaControl = require('./qa-control');
var qacInit = require('./qac-init');
var fs = require('fs-promise');
var path = require('path');

program
    .version(require('../package.json').version)
    .argument('[projectDirectory]', 'Project directory to check')
    .usage('[[options] projectDirectory|--list-langs]')
    .option('-l, --lang [lang]', 'Language to generate')
    .option('-v, --verbose', 'Show progress information')
    .option('-L, --list-langs', 'List available languages')
    .option('-c, --cucardas', 'Always generate cucardas.log')
    .option('-i, --init', 'Initialize project with qa-control specs')
    .parse(process.argv);

var opts = program.opts();

if( ( !opts.init && !opts.listLangs && (program.args.length===0 && !opts.projectDir))
    || (opts.lang && false === opts.lang in qaControl.msgs) )
{
    program.help();
}

var params = {};
params.projectDir = program.args[0];
params.verbose = opts.verbose;
params.listLangs = opts.listLangs;
params.lang = opts.lang;
params.cucardas = opts.cucardas;
// console.log(opts); process.exit(0);
// console.log(params); process.exit(0);

var msgs = (opts.init ? qacInit.cmdMsgs : qaControl.cmdMsgs)[params.lang || 'en'];

function printErr(err) {
    process.stderr.write("\nERROR: "+err.message);
    process.stderr.write("\nSTACK: "+err.stack);
}

if(opts.init) {
    process.stdout.write(msgs.msg_initializing+"\n");
    params.verbose = true;
    qacInit.init(params).then(function() {
        ; // nothing to do
    }).catch(function(err){
        switch(err.message) {
            case 'canceled':
                process.stderr.write("\n"+msgs.msg_canceled+"\n");
                break;
            case 'input_error':
                process.stderr.write("\n"+msgs.msg_error+": "+err.desc+"\n");
                break;
            default:
                printErr(err);
        }
    });
} else {
    qaControl.main(params).then(function(warnStr){
        if(! params.listLangs) {
            process.stderr.write(msgs.msg_done+(""===warnStr ? ' '+msgs.msg_nowarns:'')+'!');
        }
    }).catch(function(err){ printErr(err); });    
}
