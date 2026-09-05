#!/usr/bin/env node

"use strict";

var { program } = require('commander');
var qaControl = require('./qa-control');

program
    .version(require('../package.json').version)
    .argument('[projectDirectory]', 'Project directory to check')
    .usage('[[options] projectDirectory|--list-langs]')
    .option('-l, --lang [lang]', 'Language to generate')
    .option('-v, --verbose', 'Show progress information')
    .option('-L, --list-langs', 'List available languages')
    .option('-c, --cucardas', 'Always generate cucardas.log')
    .option('-b, --bail', 'Stop at first blocking issue')
    .option('-f, --fix', 'Fix files whose content differs from the expected one')
    .option('--deletes [mode]', 'With --fix, whether to delete files that must not exist: yes, no or ask', 'ask')
    .option('--codes', 'Prefix each warning with its internal code (usable in qa-control.silenced)')
    .option('--silence-all', 'Add every active warning code to qa-control.silenced in package.json')
    .option('--repo-is <owner_or_org/repo>', 'Expected GitHub repository (owner_or_org/repo)')
    .parse(process.argv);

var opts = program.opts();

if( ( !opts.listLangs && (program.args.length===0 && !opts.projectDir))
    || (opts.lang && false === opts.lang in qaControl.msgs)
    || ['yes','no','ask'].indexOf(opts.deletes) === -1 )
{
    program.help();
}

var params = {};
params.projectDir = program.args[0];
params.verbose = opts.verbose;
params.listLangs = opts.listLangs;
params.lang = opts.lang;
params.cucardas = opts.cucardas;
params.bail = opts.bail || false;
params.fix = opts.fix || false;
params.deletes = opts.deletes;
params.codes = opts.codes || false;
params.silenceAll = opts.silenceAll || false;
params.repoIs = opts.repoIs || process.env.GITHUB_REPOSITORY || null;
// console.log(opts); process.exit(0);
// console.log(params); process.exit(0);

var msgs = qaControl.cmdMsgs[params.lang || 'en'];

function printErr(err) {
    process.stderr.write("\nERROR: "+err.message);
    process.stderr.write("\nSTACK: "+err.stack);
}

qaControl.main(params).then(function(warnStr){
    if(! params.listLangs) {
        process.stderr.write(msgs.msg_done+(""===warnStr ? ' '+msgs.msg_nowarns:'')+'!');
    }
}).catch(function(err){ printErr(err); });
