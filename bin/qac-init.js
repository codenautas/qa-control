"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var qacInit = {};

var fs = require('fs-promise');
var Path = require('path');
var qaControl = require('./qa-control.js');
var multilang = require('multilang');
var semver = require("semver");

qacInit.cmdMsgs = {
    en: {
        msg_initializing: 'Initializing project',
        msg_creating: 'Creating files',
        msg_copying: 'Copying file',
        msg_generating: 'Generationg',
        msg_running: 'Running',
        msg_finished: 'Project initialized',
        msg_canceled: 'Initialization canceled',
        msg_should_match: 'Input should match',
        msg_error_empty: 'cannot be empty',
        msg_error_invalid: 'is invalid'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_creating: 'Creando archivos',
        msg_copying: 'Creando archivo',
        msg_generating: 'Generando',
        msg_running: 'Corriendo',
        msg_finished: 'Proyecto inicializado',
        msg_canceled: 'Initialización cancelada',
        msg_should_match: 'La entrada debe estar en formato',
        msg_error_empty: 'no puede estar vacío',
        msg_error_invalid: 'es inválido'
    }
};

qacInit.loadIfExists = function loadIfExists(fileName, isJson) {
    return fs.exists(fileName).then(function(existe) {
        if(existe) {
            return isJson ? fs.readJson(fileName) : fs.readFile(fileName, {encoding:'utf8'});
        }
        return {noexiste:true};
    }).then(function(content) {
       return (! content.noexiste) ? content : null;
    });
};

qacInit.loadJsonIfExists = function loadIfExists(fileName) {
    return qacInit.loadIfExists(fileName, true);
};

qacInit.initDefaults = function initDefaults(initParams) {
    var rv = {
        outDir: initParams.projectDir || process.cwd(),
        msgs: qacInit.cmdMsgs[initParams.lang || 'en'],
        tplDir: Path.normalize(__dirname+'/init-template'),
        existingJson:{},
        qacJson:{}
    };
    var oriREADME = Path.normalize(rv.outDir+'/README.md');
    var oriPackageJson = Path.normalize(rv.outDir+'/package.json');
    var qacPackageJson = Path.normalize(__dirname+'/init-package.json');
    var qacJson;
    return fs.readJson(qacPackageJson).then(function(json) {
        rv.qacJson = json;
        return qacInit.loadJsonIfExists(oriPackageJson);
    }).then(function(oriJson) {
        if(oriJson) {
            rv.existingJson = oriJson;
            rv.existingJson['qac-version'] = (('qa-control' in oriJson) ? oriJson : rv.qacJson)['qa-control']['package-version'];
        } else {
            rv.existingJson['qac-version'] = rv.qacJson['qa-control']['package-version'];
        }
        return qacInit.loadIfExists(oriREADME);
    }).then(function(existingReadme) {
        if(existingReadme) {
            //console.log(existingReadme);
            var lines = existingReadme.split(/\r?\n/);
            if(lines.length===3 && lines[2]=='') {
                lines.splice(2, 1);
            }
            if(lines.length!==2) {
                throw new Error('Existing README.md is not empty')
            }
            rv.existingJson['name'] = lines[0].substr(2);
            rv.existingJson['description'] = lines[1];
        }
        return rv;
    });
};

qacInit.ask = function ask(param, msgs, callback) {
    //if(param.valid) { console.log("param", param, "valid:", param.valid(param.def) ? "true" : "false");  }
    var def = param.def && (! param.valid || param.valid(param.def)) ? ' ('+param.def+')' : '';
    var stdin = process.stdin;
    var stdout = process.stdout;
    stdin.resume();
    var prompt = param.prompt || param.name.substring(0,1).toUpperCase()+param.name.substring(1);
    stdout.write(prompt+def+ ": ");
    stdin.once('data', function(data) {
        data = data.toString().trim();
        if(data === '') { data = param.def; }
        if((param.valid && param.valid(data)) || (! param.valid  && data !== '')) {
            callback(data);
        } else {
            stdout.write('"'+data+'" '+msgs.msg_error_invalid+'\n');
            qacInit.ask(param, msgs, callback);
        }
    });
};

qacInit.promptForVar = function promptForVar(param, msgs) {
    return new Promise(function(resolve, reject) {
        qacInit.ask(param, msgs, function (data) {
            resolve(data);
        });
    });
};

function getParam(param, ctx) {
    return Promise.resolve().then(function() {
        if(param.init) { param.init(ctx); }
        if(param.noPrompt) {
            return param.def;
        } else {
            return qacInit.promptForVar(param, ctx.input.msgs);
        }
    }).then(function(value) {
        if(value!=='') {
            ctx.result[param.name] = value;
            if(param.post) { ctx.result[param.name] = param.post(ctx); }
        }
    });
};

qacInit.readParameters = function readParameters(inputParams, params) {
    var ctx = {
        result:{},
        input: inputParams
    };
    var cadenaDePromesas = Promise.resolve().then();
    params.forEach(function(param) {
        cadenaDePromesas = cadenaDePromesas.then(function() {
            return getParam(param, ctx);
        });
    });
    return cadenaDePromesas.then(function() {
        process.stdin.end();
        params.forEach(function(param) {
            if(param.temporary) { delete ctx.result[param.name]; }
        });
        return ctx.result; 
    }).catch(function(err) {
        process.stdin.end();
        //console.log("err.stack", err.stack)
        throw { message:'input_error', desc:err };
    });
};

// utiliza templateJson como plantilla
qacInit.generateJSon = function generateJSon(readedParameters, templateJson) {
    return Promise.resolve().then(function() {
        var outJson = JSON.parse(JSON.stringify(templateJson));
        for(var paramName in readedParameters) {
            var val = readedParameters[paramName];
            outJson[paramName] = val;
        }
        return outJson;
    });
};

qacInit.writeTemplate = function writeTemplate(inputFile, outputFile, vars) {
    var cont;
    return fs.readFile(inputFile, {encoding: 'utf8'}).then(function(content) {
        for(var name in vars) {
            var value = vars[name];
            content = content.replace(new RegExp('{{'+name+'}}', 'g'), value);
        }
        cont = content;
        return fs.writeFile(outputFile, cont);
    }).then(function() {
       return cont; 
    });
};

qacInit.re = {
    name      : /^([a-zA-Z][a-zA-Z]+)$/,                            // alpha, minusculas
    namex    : /^([a-z]+[a-z0-9-]*[a-z0-9]+)$/,                     // alnum+'-', minusculas
    namexs    : /^([a-z]+[a-z0-9.-]*[a-z0-9]+)$/,                   // alnum+'-'+'.', minusculas 
    namexcml : /^([A-Z]+[A-Za-z0-9.-]*[A-Za-z0-9]+)$/,              // alnum+'-'+'.', minusculas, primera en mayusculas
    email      : /^(<?[A-Za-z]+[a-z0-9.]+@[a-z0-9]+\.[a-z0-9]+>?)$/ // muy mejorable
};

function validName(nameparts) {
    for(var n in nameparts) {
        if(! nameparts[n].match(qacInit.re.name)) { return false; }
    }
    return true;
}
    
qacInit.configParams = [
    {
        name:'name', prompt:'Project name', def:'',
        init:function(ctx) {
            this.def = ctx.input.existingJson.name ? ctx.input.existingJson.name : Path.basename(ctx.input.outDir);
        },
        valid:function(name) { return name.match(qacInit.re.namex); }
    },{
        name:'description', prompt:'Project description', def:'',
        init: function(ctx) {
            this.def = ctx.input.existingJson.description || ctx.result['name']+' module'; 
        }
    },{
        name:'version', prompt:'Project version', def:'',
        init: function(ctx) { this.def = ctx.input.existingJson.version || '0.0.1'; },
        valid:function(ver) { return semver.valid(ver); }
    },{
        name:'organization', def:'codenautas', temporary:true,
        valid:function(org) { return org.match(qacInit.re.namex); }
    },{
        name:'author', prompt:'Author (FirstN[ LastL] <EMail>)', def:'',
        init: function(ctx) {
            this.def = ctx.input.existingJson.author
                       || (ctx.result.organization == 'codenautas' ? 'Codenautas <codenautas@googlegroups.com>' : '');
        },
        valid:function(author) {
            var pts = author.split(' ');
            return validName(pts.slice(0, pts.length-1)) &&  pts[pts.length-1].match(qacInit.re.email);
        }
    },{
        name:'repository', def:'',
        init: function(ctx) {
            var repo = ctx.input.existingJson.repository;
            this.def = repo ? repo.url ?
                                repo.url.substring(4, repo.url.length-4)
                                : repo
                            : ctx.result.organization+'/'+ctx.result.name;
        }
    },{
        name:'license', def:'',
        init: function(ctx) { this.def = ctx.input.qacJson.license; },
        valid:function(lic) { return lic.match(qacInit.re.namexcml); }
    },{
        name:'contributors', prompt: 'Add contributor (Name: email)', def:'',
        parseNE:function(nameAndEmail) {
            var nae = nameAndEmail.split(':');
            if(nae.length===2) { return {name: nae[0].trim(), email: nae[1].trim()}; }
            return false;
        },
        post: function(ctx) {
            var contributors = ctx.input.existingJson.contributors || [];
            var nae = this.parseNE(ctx.result[this.name]);
            contributors.push({'name':nae.name, 'email':nae.email});
            return contributors.length ? contributors : null;
        },
        valid:function(nameAndEmail) {
            if(nameAndEmail==='') { return true; }
            var nae = this.parseNE(nameAndEmail);
            if(nae) { return validName(nae.name.split(' ')) && nae.email.match(qacInit.re.email); }
            return false;
        }
    },{
        name:'main', def:'', noPrompt:true, init:function(ctx) { this.def=ctx.input.qacJson['main']; }
    },{
        name:'files', def:[], noPrompt:true, init:function(ctx) { this.def=ctx.input.qacJson['files']; }
    },{
        name:'dependencies', def:'', noPrompt:true,
        init: function(ctx) { this.def = ctx.input.qacJson['dependencies']; }
    },{
        name:'devDependencies', def:'', noPrompt:true,
        init: function(ctx) { this.def = ctx.input.qacJson['devDependencies']; }
    },{
        name:'engines', def:'', noPrompt:true, init: function(ctx) { this.def = ctx.input.qacJson['engines']; }
    },{
        name:'scripts', def:'', noPrompt:true, init: function(ctx) { this.def = ctx.input.qacJson['scripts']; }
    },{
        name:'jshintConfig', def:'', noPrompt:true, init: function(ctx) { this.def = ctx.input.qacJson['jshintConfig']; }
    },{
        name:'eslintConfig', def:'', noPrompt:true, init: function(ctx) { this.def = ctx.input.qacJson['eslintConfig']; }
    },{
        name:'qa-control-version', prompt: 'qa-control package-version', def:'',
        init: function(ctx) { this.def = ctx.input.qacJson['qa-control']['package-version']; },
        post: function(ctx) {
            var contributors = ctx.input.existingJson.contributors || [];
            var ver = ctx.result[this.name];
            var qacData = ctx.input.qacJson['qa-control'];
            qacData['package-version'] = ver;
            return ver;
        },
        valid: function(ver) {
            if(semver.valid(ver)) {
                for(var v in qaControl.projectDefinition) {
                    if(semver.satisfies(ver, v)) { return true; }
                }
            }
            return false;
        }
    },{
        name:'qa-control', def:'', noPrompt:true, init: function(ctx) { this.def = ctx.input.qacJson['qa-control']; }
    }
];
        
qacInit.init = function init(initParams) {
    var echo = function(message) { process.stdout.write(message); }
    if(! initParams.verbose) { echo = function() {} }
    var inputParams;
    var tplData = {
        vars: {},
        tpls: [],
        other: []
    };
    var packageJS;
    return qacInit.initDefaults(initParams).then(function(initResult) {
        inputParams = initResult; //console.log("inputParams", inputParams);
        return qacInit.readParameters(inputParams, qacInit.configParams);
    }).then(function(data) {
        //console.log("res",data);
        packageJS = data;
        delete packageJS['qa-control-version'];
        echo(inputParams.msgs.msg_creating+' package.json...\n');
        return fs.writeJson(Path.resolve(inputParams.outDir+'/package.json'), packageJS);
    }).then(function() {
        tplData.vars.name = packageJS.name;
        tplData.vars.nameJS = qaControl.jsProjectName(packageJS.name);
        tplData.vars.description = packageJS.description;
        var now = new Date();
        tplData.vars.year = now.getFullYear();
        var cucardas=qaControl.projectDefinition[packageJS['qa-control']['package-version']].cucardas;
        tplData.vars.cucardas = qaControl.generateCucardas(cucardas, packageJS);
        tplData.vars.author = packageJS.author;
        //console.log("tplData.vars", tplData.vars)
        echo(inputParams.msgs.msg_creating+'...\n');
        return fs.readdir(inputParams.tplDir);
    }).then(function(files) {
        tplData.tpls = files.filter(function(file) { return file.match(/(.tpl)$/); });
        tplData.other = files.filter(function(file) { return tplData.tpls.indexOf(file) < 0 })
        //console.log("tplData", tplData);
        return Promise.all(tplData.other.map(function(file){
            var oFile = file;
            if(file.match(/^(dot-)/)) { oFile = '.'+file.substring(4); }
            echo('  '+inputParams.msgs.msg_copying+' '+oFile+'...\n');
            return fs.copy(Path.resolve(inputParams.tplDir+'/'+file), Path.resolve(inputParams.outDir+'/'+oFile));                
        }));
    }).then(function() {
        return Promise.all(tplData.tpls.map(function(file) {
            var oFile = file.substr(0, file.length-4); // removemos '.tpl'
            echo('  '+inputParams.msgs.msg_generating+' '+oFile+'...\n');
            return qacInit.writeTemplate(Path.resolve(inputParams.tplDir+'/'+file),Path.resolve(inputParams.outDir+'/'+oFile), tplData.vars).then(function(out) {
                //console.log("out", out);
            });
        }));
    }).then(function() {
        return fs.readFile(Path.resolve(inputParams.outDir+'/LEEME.md'), {encoding: 'utf8'});
    }).then(function(leemeContent) {
        var readmeMD = Path.resolve(inputParams.outDir+'/README.md');
        echo(inputParams.msgs.msg_generating+' '+readmeMD+'...\n');
        var readme = multilang.changeNamedDoc(readmeMD, leemeContent, 'en');
        return fs.writeFile(readmeMD, multilang.stripComments(readme));
    }).then(function() {
        echo(inputParams.msgs.msg_running+' QA-control... ');
        return qaControl.controlProject(inputParams.outDir/*, initParams*/);
    }).then(function(warns) {
        return qaControl.stringizeWarnings(warns, qaControl.lang);
    }).then(function(warnString) {
        echo((warnString !== '') ? '\n'+warnString : 'ok');
        echo('\n'+inputParams.msgs.msg_finished+'\n');
    });
};

module.exports = qacInit;
