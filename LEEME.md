<!-- multilang from README.md




NO MODIFIQUE ESTE ARCHIVO. FUE GENERADO AUTOMÁTICAMENTE POR multilang.js




-->
# qa-control


Herramienta de control de calidad para proyectos Node


<!-- cucardas -->
![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![npm-version](https://img.shields.io/npm/v/qa-control.svg)](https://npmjs.org/package/qa-control)
[![downloads](https://img.shields.io/npm/dm/qa-control.svg)](https://npmjs.org/package/qa-control)
[![build](https://img.shields.io/travis/codenautas/qa-control/master.svg)](https://travis-ci.org/codenautas/qa-control)
[![coverage](https://img.shields.io/coveralls/codenautas/qa-control/master.svg)](https://coveralls.io/r/codenautas/qa-control)
[![climate](https://img.shields.io/codeclimate/github/codenautas/qa-control.svg)](https://codeclimate.com/github/codenautas/qa-control)
[![dependencies](https://img.shields.io/david/codenautas/qa-control.svg)](https://david-dm.org/codenautas/qa-control)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)


## Instalación


```sh
$ npm install -g qa-control
```


## Uso (línea de comandos)


```sh
$ pwd
/home/user/npm-packages/this-module
```

```sh
$ qa-control --list-langs
Idiomas disponibles: en es

$ qa-control . --lang=es
Listo sin advertencias!
```


## Uso (código)


```js
var qaControl = require('qa-control');

qaControl.controlProject('./path/to/my/project').then(function(warnings){
    console.log(warnings);
});

```

## License

[MIT](LICENSE)

----------------


