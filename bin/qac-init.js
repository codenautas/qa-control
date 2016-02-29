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
var qaControl = require('./qa-control.js');
var multilang = require('multilang');

qacInit.cmdMsgs = {
    en: {
        msg_initializing: 'Initializing project',
        msg_creating: 'Creating files',
        msg_copying: 'Copying file',
        msg_generating: 'Generationg',
        msg_finished: 'Project initialized',
        msg_error: 'Input error',
        msg_error_desc: '"description" field is mandatory',
        msg_canceled: 'Initialization canceled'
    },
    es: {
        msg_initializing: 'Inicializando proyecto',
        msg_creating: 'Creando archivos',
        msg_copying: 'Creando archivo',
        msg_generating: 'Generando',
        msg_finished: 'Proyecto inicializado',
        msg_error: 'Error en los argumentos',
        msg_error_desc: 'El campo "description" es obligatorio',
        msg_canceled: 'Initialización cancelada'
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
    var qacPackageJson = Path.normalize(Path.dirname(__dirname)+'/package.json');
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

function ask(question, format, callback) {
    var stdin = process.stdin, stdout = process.stdout;
    stdin.resume();
    stdout.write(question + ": ");
 
    stdin.once('data', function(data) {
        data = data.toString().trim();
        if(format.test(data)) {
            callback(data);
        } else {
            stdout.write("It should match: "+ format +"\n");
            ask(question, format, callback);
        }
    });
};

function doAsk(question, format) {
    return Promises.make(function(resolve, reject) {
        ask(question, format, function (data) {
            resolve(data);
        });
    });
};

qacInit.promptForVar = function promptForVar(name, defaultValue) {
    var def = defaultValue ? ' ('+defaultValue+')' : '';
    return doAsk(name+def, /.*/).then(function(res) {
       console.log("res", res);
        return res;
    }).catch(function(err) {
        throw { message:'input_error', desc:err };
    });
};

function getParam(param, ctx) {
    return Promises.start(function() {
        if(param.init) { param.init(ctx); }
        return qacInit.promptForVar(param.name, param.def).then(function(value) {
           // console.log("promptForVar ->", value)
           ctx.result[param.name] = value;
        });
    });
};

qacInit.readParameters = function readParameters(params, existingJson, qacJson) {
    var ctx = {
        result:{},
        defs:existingJson,
        qac:qacJson
    };
    var cadenaDePromesas = Promises.start();
    params.forEach(function(param) {
       cadenaDePromesas = cadenaDePromesas.then(function() {
            return getParam(param, ctx);
       });
    });
    return cadenaDePromesas.then(function() {
       process.stdin.end();
       return ctx.result; 
    }).catch(function(err) {
        throw { message:'input_error', desc:err };
    });
};

// utiliza templateJson como plantilla
qacInit.generateJSon = function generateJSon(readedParameters, templateJson) {
    return Promises.start(function() {
        var outJson = JSON.parse(JSON.stringify(templateJson));
        for(var paramName in readedParameters) {
            var val = readedParameters[paramName];
            outJson[paramName] = val;
        }
        return outJson;
    });
};

qacInit.writeTemplate = function writeTemplate(inputFile, outputFile, vars) {
    return fs.readFile(inputFile, {encoding: 'utf8'}).then(function(content) {
        for(var name in vars) {
            var value = vars[name];
            content = content.replace(new RegExp('{{'+name+'}}', 'g'), value);
        }
        return fs.writeFile(outputFile, content);
    });
};

if(false) {

    qacInit.init = function init(inputParams) {
        var input;
        return qacInit.initDefaults(inputParams).then(function(initResult) {
            input = initResult; //console.log("input", input);
            var configParams = [
                {name:'v1', def:'def1'},
                {name:'v2', def:'def2', init: function(ctx) { if(ctx.result.v1) { this.def = 'have v1'; } } },
                {name:'v3', def:'def3', init: function(ctx) { if(ctx.result.v2) { this.def = 'have v2'; } } }
            ];
            return qacInit.readParameters(configParams, input.existingJson, input.qacJson);
        }).then(function(result) {
            console.log("res",result);
        });
    };

} else {
    function initPackageJson(outDir, initFile, configData) {
        return Promises.make(function(resolve, reject) {
            init(outDir, initFile, configData, function (er, data) {
                if(er) { reject(er); }
                resolve(data);
            });
        });
    };

    qacInit.init = function init(params) {
        var out = process.stdout;
        var outDir = params.projectDir || process.cwd();
        var msgs = qacInit.cmdMsgs[params.lang || 'en'];
        var customData = {
            'inputDir':outDir,
            'msgs':msgs
        };
        var templateDir = Path.normalize(__dirname+'/init-template');
        var customFile = Path.normalize(__dirname+'/qac-input.js');
        var oriREADME = Path.normalize(outDir+'/README.md');
        var oriPackageJson = Path.normalize(outDir+'/package.json');
        var qacPackageJson = Path.normalize(Path.dirname(__dirname)+'/package.json');
        var qacJson;
        var cucaContent='';
        var finalJson;
        var leemeContent='';
        return fs.readJson(qacPackageJson).then(function(json) {
            qacJson = json;
            customData['qac'] = qacJson;
            return fs.exists(oriPackageJson);
        }).then(function(exists) {
            if(exists) { return fs.readJson(oriPackageJson); }
            return { 'first_init': true };
        }).then(function(oriJson) {
            if(! oriJson.first_init) {
                customData['defs'] = oriJson;
                customData['qa-control-version'] = (('qa-control' in oriJson) ? oriJson : qacJson)['qa-control']['package-version'];
            } else {
                customData['qa-control-version'] = qacJson['qa-control']['package-version'];
            }
            return fs.exists(oriREADME);
        }).then(function(exists) {
            if(exists) {
                return fs.readFile(oriREADME, {encoding: 'utf8'});
            }
            return {'not_exists':true};
        }).then(function(existingReadme) {
            if(! existingReadme.not_exists) {
                //console.log(existingReadme);
                var lines = existingReadme.split(/\r?\n/);
                if(lines.length===3 && lines[2]=='') {
                    lines.splice(2, 1);
                }
                if(lines.length!==2) {
                    throw new Error('Existing README.md is not empty')
                }
                if(! ('defs' in customData)) { customData['defs'] = {}; }
                var defs = customData['defs'];
                defs['name'] = lines[0].substr(2);
                defs['description'] = lines[1];
            }
            //customData['yes']=true;
            //customData['silent']=true;
            return initPackageJson(outDir, customFile, customData);
        }).then(function(data) {
            finalJson = data;
            var cucardas=qaControl.projectDefinition[data['qa-control']['package-version']].cucardas;
            cucaContent = qaControl.generateCucardas(cucardas, data);
            //console.log(cucaContent);
            return fs.readFile(Path.normalize(templateDir+'/LICENSE.tpl'), {encoding: 'utf8'});
        }).then(function(licenseTPL) {
            licenseTPL = licenseTPL.replace(new RegExp('{{author}}', 'g'), finalJson.author);
            var now = new Date();
            licenseTPL = licenseTPL.replace(new RegExp('{{year}}', 'g'), now.getFullYear());
            //console.log(licencse);
            var license = Path.resolve(outDir+'/LICENSE');
            out.write(msgs.msg_generating+' '+license+'...\n');
            return fs.writeFile(license, licenseTPL);
        }).then(function() {
            return fs.readFile(Path.normalize(templateDir+'/LEEME.tpl'), {encoding: 'utf8'});
        }).then(function(leeme) {
            leeme = leeme.replace(new RegExp('{{name}}', 'g'), finalJson.name);
            leeme = leeme.replace(new RegExp('{{desc}}', 'g'), finalJson.description);
            leeme = leeme.replace(new RegExp('{{cucardas}}', 'g'), cucaContent);
            //console.log(readme);
            leemeContent = leeme;
            var leemeMD = Path.resolve(outDir+'/LEEME.md');
            out.write(msgs.msg_generating+' '+leemeMD+'...\n');
            return fs.writeFile(leemeMD, leeme);
        }).then(function() {
            var readmeMD = Path.resolve(outDir+'/README.md');
            out.write(msgs.msg_generating+' '+readmeMD+'...\n');
            var readme = multilang.changeNamedDoc(readmeMD, leemeContent, 'en');
            return fs.writeFile(readmeMD, multilang.stripComments(readme));
        }).then(function() {
            out.write(msgs.msg_creating+'...\n');
            return fs.readdir(templateDir);
        }).then(function(files) {
            return Promises.all(files.map(function(file){
                if(! file.match(/(.tpl)$/)) {
                    var oFile = file;
                    if(file.match(/^(dot-)/)) {
                        oFile = '.'+file.substring(4);
                    }
                    out.write('  '+msgs.msg_copying+' '+oFile+'...\n');
                    return fs.copy(Path.resolve(templateDir+'/'+file), Path.resolve(outDir+'/'+oFile));                
                }
            }));
        });
    };
}
module.exports = qacInit;
