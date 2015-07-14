"use strict";

var expect = require('expect.js');
var qac = require('..');

describe('qa-control', function(){
    describe('tests that abort on wrong input', function(){
        it('should fail if path is null', function(done){
            qac.controlProject(null).then(function(warns){
                done(warns);
            }).catch(function(err){
                expect(err).to.match(/null projectDir/);
                done();
            });
        });
        it('should fail if path does not exists', function(done){
            qac.controlProject('/non existent path/').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/does not exists/);
                done();
            });
        });
        it('should fail if path is not a directory', function(done){
            qac.controlProject('./package.json').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/is not a directory/);
                done();
            });
        });
    });
    describe('basic tests', function(){
        var msgs=qac.msgs[qac.lang];
        it('should fail in the absence of package.json', function(done){
            var projDir='./test';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_package_json, params:[projDir]}]);
                done();
            }).catch(done);
        });
    });
});
