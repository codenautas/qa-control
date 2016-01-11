var Path = require('path');

function defaultProjectName() {
    return Path.basename(config.get('directorio'));
}

var mod = {
  "name": prompt('Nombre del proyecto', defaultProjectName(), function(n) {
        return n;
  }),
  "version": prompt('Versión del proyecto', "0.0.1", function(appver) {
        return appver;
  }),
  "license": "MIT",
  "respository": prompt('Repositorio:', 'codenautas/'+defaultProjectName(), function(repo) {
     return repo; 
  }),
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
