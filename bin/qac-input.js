var Path = require('path');

var mod = {};

var defName = Path.basename(process.cwd())

mod.input = {
  "state": {data: []},
  "name": prompt('Nombre del proyecto', defName, function(n) {
      mod.input.state.data.name = n;
      console.log("this", mod.input["state"]);
        return n;
  }),
  "version": prompt('Versión del proyecto', "0.0.1", function(appver) {
        return appver;
  }),
  "license": "MIT",
  "respository": prompt('codenautas/'+defName, function(repo) {
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

module.exports = mod.input;
