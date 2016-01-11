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
    'name': prompt('Project name', defaultProjectName(), function(n) {
        return n;
    }),
    'description': prompt('Project description', defs('description'), function(desc) {
        if(!desc) { throwErr(msgs().msg_error_desc); }
        return desc;
    }),
    'version': prompt('Project version', defs('version') || "0.0.1", function(appver) {
        return appver;
    }),
    'author': prompt('Author', defs('author') || "Codenautas <codenautas@googlegroups.com>", function(author) {
        return author;
    }),
    'license': "MIT",
    "respository": prompt('Repository', defs('repository') || 'codenautas/'+defaultProjectName(), function(repo) {
        return repo; 
    }),
    'contributors': prompt('Add contributor (name: email)', function(nameAndEmail) {
        var contributors = defs('contributors') || [];
        var nae = nameAndEmail.split(':');
        if(nae.length===2) {
            var name = nae[0].trim();
            var email = nae[1].trim();
            if(name === '' || email === '') {
                process.stderr.write('Invalid contributor data\n');
            } else {
                contributors.push({'name':name, 'email':email});
            }
        }
        return contributors.length ? contributors : null;
    }),
    'dependencies': {
        "fs-extra": "0.26.3",
        "fs-promise": "0.3.1",
        
        "best-promise": "0.2.4",
    },
    'devDependencies': {
        "expect.js": ">=0.3.1",
        "istanbul": "0.4.1",
        "mocha": "2.3.4",

        "expect-called": ">=0.4.0"
    },
    'engines': {
        "node": ">= 0.10.0"
    },
    'scripts': {
        "test": "mocha --reporter spec --bail --check-leaks test/",
        "test-ci": "istanbul cover node_modules/mocha/bin/_mocha --report lcovonly -- --reporter spec --check-leaks test/",
        "test-cov": "istanbul cover node_modules/mocha/bin/_mocha -- --reporter dot --check-leaks test/",
        "start": "node example/server.js"
    },
    'jshintConfig': {
            "asi": false,
            "forin": true,
            "curly": true
    },
    'eslintConfig':{
        "env": {
          "node": false
        },
        "rules": {
          "strict": 0,
          "no-console": 1,
          "no-unused-vars": 1
        }
    },
    'qa-control': prompt("qa-control package-version?", defs('qa-control-version') || "0.1.4", function (ver) {
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
