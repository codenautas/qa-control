/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var Path = require('path');

function defs(entry) {
    var dfs = config.get('defs');
    if(dfs) { return dfs[entry]; }
    return dfs;
}

function qacs(entry) {
    var qac = config.get('qac');
    if(qac) { return qac[entry]; }
    return qac;
}

function defaultProjectName() {
    return defs('name') || Path.basename(config.get('inputDir'));
}

function defaultRepository(selectedName) {
    var repo = defs('repository');
    if(repo) {
        var url = repo.url;
        return url.substring(4, url.length-4);
    }
    return 'https://github.com/codenautas/'+(selectedName || defaultProjectName());
}

function msgs() { return config.get('msgs'); }

function selectDeps(depGroup, packages) {
    var selectedDeps = {};
    var group = qacs(depGroup);
    for(var p=0; p<packages.length; ++p) {
        var pac = packages[p];
        if(pac in group) {
            selectedDeps[pac] = group[pac];
        }
    }
    return selectedDeps;
}

function throwErr(description) {
    throw {
        message:'input_error',
        desc:description
    }    
}

var selectedName = null;

var mod = {
    'name': prompt('Project name', defaultProjectName(), function(n) {
        selectedName = n;
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
    'license': qacs('license'),
    'repository': function (cb) {
        return cb(null, prompt('Repository', defaultRepository(selectedName), function(repo) { return repo; }))
    },
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
    'dependencies': selectDeps('dependencies', ['fs-extra', 'fs-promise', 'best-promise']),
    'devDependencies': selectDeps('devDependencies', ['expect.js', 'istanbul', 'mocha', 'expect-called']),
    'engines': qacs('engines'),
    'scripts': qacs('scripts'),
    'jshintConfig': qacs('jshintConfig'),
    'eslintConfig': qacs('eslintConfig'),
    'qa-control': prompt("qa-control package-version?", config.get('qa-control-version'), function (ver) {
        var qData = qacs('qa-control');
        qData['package-version'] = ver;
        return qData; 
  })
};

module.exports = mod;
