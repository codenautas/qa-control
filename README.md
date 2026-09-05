# qa-control

Quality assurance tool for node/npm projects


[![npm-version](https://img.shields.io/npm/v/qa-control.svg)](https://npmjs.org/package/qa-control)
[![downloads](https://img.shields.io/npm/dm/qa-control.svg)](https://npmjs.org/package/qa-control)
[![build](https://github.com/codenautas/qa-control/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/codenautas/qa-control/actions/workflows/build-and-test.yml)
[![coverage](https://img.shields.io/coveralls/codenautas/qa-control/master.svg)](https://coveralls.io/r/codenautas/qa-control)
[![qa-control](https://github.com/codenautas/qa-control/actions/workflows/qa-control.yml/badge.svg)](https://github.com/codenautas/qa-control/actions/workflows/qa-control.yml)



language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


## Install


```sh
$ npm install -g qa-control
```


## Usage (command-line)


```sh
$ pwd
/home/user/npm-packages/this-module
```


```sh
$ qa-control --list-langs
Available languages: en es

$ qa-control .
Done without warnings!
```


## Advenced  usage


```js
var qaControl = require('qa-control');

qaControl.controlProject('./path/to/my/project').then(function(warnings){
    console.log(warnings);
});

```

## License

[MIT](LICENSE)

----------------
