var Path = require('path');

module.exports = {
  "name": prompt('Nombre del proyecto', Path.basename(Path.dirname(__filename)), function(name) {
        return name;
  }),
  "version": prompt('Versión del proyecto', "0.0.1", function(appver) {
        return appver;
  }),
  "qa-control-version": prompt("Versión de qa-control a utilizar?", "0.1.4", function (ver) {

  return { "qa-control": {
            "package-version": ver,
            "run-in": "server",
            "test-appveyor": true,
            "type": "app",
            "stage": "designing",
            "coverage": 70
        }}; 
  })
}
