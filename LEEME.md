# qa-control

<!--lang:es-->
Herramienta de control de calidad para proyectos hechos con node/npm

<!--lang:en--]
Quality assurance tool for node/npm projects

[!--lang:*-->

<!-- cucardas -->
![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/qa-control.svg)](https://npmjs.org/package/qa-control)
[![downloads](https://img.shields.io/npm/dm/qa-control.svg)](https://npmjs.org/package/qa-control)
[![build](https://github.com/codenautas/qa-control/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/qa-control/actions/workflows/node.js.yml)
[![coverage](https://img.shields.io/coveralls/codenautas/qa-control/master.svg)](https://coveralls.io/r/codenautas/qa-control)
[![dependencies](https://snyk.io/test/github/codenautas/qa-control/badge.svg)](https://snyk.io/test/github/codenautas/qa-control)
[![qa-control](http://codenautas.com/github/codenautas/qa-control.svg)](http://codenautas.com/github/codenautas/qa-control)

<!--multilang v0 es:LEEME.md en:README.md -->

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

## Instalación

<!--lang:en--]

## Install

[!--lang:*-->

```sh
$ npm install -g qa-control
```

<!--lang:es-->

## Uso (línea de comandos)

<!--lang:en--]

## Usage (command-line)

[!--lang:*-->

```sh
$ pwd
/home/user/npm-packages/this-module
```

<!--lang:es-->

```sh
$ qa-control --list-langs
Idiomas disponibles: en es

$ qa-control . --lang=es
Listo sin advertencias!
```

<!--lang:en--]

```sh
$ qa-control --list-langs
Available languages: en es

$ qa-control . 
Done without warnings!
```

[!--lang:es-->

## Uso (código)

<!--lang:en--]

## Usage (code)

[!--lang:*-->

```js
var qaControl = require('qa-control');

qaControl.controlProject('./path/to/my/project').then(function(warnings){
    console.log(warnings);
});

```

## License

[MIT](LICENSE)

----------------


