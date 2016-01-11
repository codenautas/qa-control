var Path = require('path');

function defs(entry) {
    var defs = config.get('defs');
    if(defs) { return defs[entry]; }
    return defs;
}

function defaultProjectName() {
    return defs('name') || Path.basename(config.get('directorio'));
}

function msgs() { return config.get('msgs'); }

function throwErr(description) {
    throw {
        message:'input_error',
        desc:description
    }    
}

var mod = {
    "name": prompt('Project name', defaultProjectName(), function(n) {
        return n;
    }),
    "description": prompt('Project description', defs('description'), function(desc) {
        if(!desc) { throwErr(msgs().msg_error_desc); }
        return desc;
    }),
    "version": prompt('Project version', defs('version') || "0.0.1", function(appver) {
        return appver;
    }),
    "author": prompt('Author', defs('author') || "Codenautas <codenautas@googlegroups.com>", function(author) {
        return author;
    }),
    "license": "MIT",
    "respository": prompt('Repositorio', defs('repository') || 'codenautas/'+defaultProjectName(), function(repo) {
        return repo; 
    }),
    'jshint-section': {
        "jshintConfig": {
            "asi": false,
            "forin": true,
            "curly": true
        }
    },
    'eslint-section': {
        "eslintConfig":{
            "env": {
              "node": false
            },
            "rules": {
              "strict": 0,
              "no-console": 1,
              "no-unused-vars": 1
            }
        }
    },
    "qa-control": prompt("qa-control package-version?", defs('qa-control-version') || "0.1.4", function (ver) {
        return { "package-version": ver,
            "run-in": "server",
            "test-appveyor": true,
            "type": "app",
            "stage": "designing",
            "coverage": 70
        }; 
  })
};

module.exports = mod;
