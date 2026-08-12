#!/usr/bin/env node

"use strict";

// Baja los workflows modelo desde codenautas/.github (carpeta .in-each-repo)
// hacia el .github/workflows de este repositorio, que es la fuente de verdad
// que qa-control le exige a los demás proyectos.

var fs = require('fs-extra');
var Path = require('path');
var qaControl = require('./qa-control');

var SOURCE_REPO = 'codenautas/.github';
var SOURCE_DIR = '.in-each-repo';
var DEFAULT_REF = 'main';
var TARGET_DIR = Path.join(__dirname, '../.github/workflows');

function apiUrl(ref) {
    return 'https://api.github.com/repos/'+SOURCE_REPO+'/contents/'+SOURCE_DIR+'?ref='+encodeURIComponent(ref);
}

function get(url, accept) {
    var headers = {
        'Accept': accept,
        'User-Agent': 'qa-control-sync-workflows'
    };
    // El token es opcional: sirve para no chocar con el rate limit de 60/hora por IP.
    if(process.env.GITHUB_TOKEN) { headers.Authorization = 'Bearer '+process.env.GITHUB_TOKEN; }
    return fetch(url, {headers:headers}).then(function(response) {
        if(!response.ok) {
            throw new Error('GitHub respondió '+response.status+' '+response.statusText+' para '+url);
        }
        return response;
    });
}

function listSourceFiles(ref) {
    return get(apiUrl(ref), 'application/vnd.github+json').then(function(response) {
        return response.json();
    }).then(function(entries) {
        if(!Array.isArray(entries)) {
            throw new Error('Se esperaba un listado de archivos en '+SOURCE_DIR+' y se recibió otra cosa');
        }
        return entries.filter(function(entry) { return entry.type === 'file'; });
    });
}

function downloadFile(entry) {
    return get(entry.download_url, 'text/plain').then(function(response) {
        return response.text();
    }).then(function(content) {
        return {name:entry.name, content:content};
    });
}

function writeFile(file) {
    var targetPath = Path.join(TARGET_DIR, file.name);
    return fs.readFile(targetPath, 'utf8').catch(function(err) {
        if(err.code === 'ENOENT') { return null; }
        throw err;
    }).then(function(previousContent) {
        var newContent = qaControl.fixEOL(file.content);
        if(previousContent !== null && qaControl.fixEOL(previousContent) === newContent) {
            return {name:file.name, action:'unchanged'};
        }
        return fs.outputFile(targetPath, newContent, 'utf8').then(function() {
            return {name:file.name, action:previousContent === null ? 'created' : 'updated'};
        });
    });
}

function reportExtraFiles(sourceNames) {
    return fs.readdir(TARGET_DIR).catch(function(err) {
        if(err.code === 'ENOENT') { return []; }
        throw err;
    }).then(function(localNames) {
        return localNames.filter(function(name) { return sourceNames.indexOf(name) === -1; });
    });
}

function main() {
    if(typeof fetch !== 'function') {
        return Promise.reject(new Error('Se necesita Node 18 o superior (fetch no está disponible)'));
    }
    var ref = process.argv[2] || DEFAULT_REF;
    console.log('Sincronizando desde '+SOURCE_REPO+'/'+SOURCE_DIR+' @ '+ref);
    return listSourceFiles(ref).then(function(entries) {
        return Promise.all(entries.map(downloadFile));
    }).then(function(files) {
        return Promise.all(files.map(writeFile)).then(function(results) {
            results.forEach(function(result) {
                console.log('  '+result.action.toUpperCase()+': '+result.name);
            });
            return files.map(function(file) { return file.name; });
        });
    }).then(function(sourceNames) {
        return reportExtraFiles(sourceNames);
    }).then(function(extraFiles) {
        if(extraFiles.length) {
            console.log('');
            console.log('Estos archivos están en .github/workflows y no en el origen (no se borran, revisalos a mano):');
            extraFiles.forEach(function(name) { console.log('  '+name); });
        }
    });
}

main().catch(function(err) {
    process.stderr.write('\nERROR: '+err.message+'\n');
    process.exitCode = 1;
});
