var Path = require('path');

function defaultProjectName() {
    return Path.basename(config.get('directorio'));
}

function msgs() { return config.get('msgs'); }

function throwErr(description) {
    throw {
        message:'input_error',
        desc:description
    }    
}

var mod = {
    "name": prompt('Nombre del proyecto', defaultProjectName(), function(n) {
        return n;
    }),
    "description": prompt('Descripción del proyecto', null, function(desc) {
        if(!desc) { throwErr(msgs().msg_error_desc); }
        return desc;
    }),
    "version": prompt('Versión del proyecto', "0.0.1", function(appver) {
        return appver;
    }),
    "license": "MIT",
    "respository": prompt('Repositorio:', 'codenautas/'+defaultProjectName(), function(repo) {
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
    "qa-control": prompt("Versión de qa-control a utilizar?", "0.1.4", function (ver) {
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
