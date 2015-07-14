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
        it('should detect the absence of package.json (#1)', function(done){
            var projDir='./test';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_package_json, params:[projDir]}]);
                done();
            }).catch(done);
        });
        var fixtures='./test/fixtures/';
        it('should detect the absence of codenautas section or any codenautas reference (#2)', function(done){
            var projDir=fixtures+'without-codenautas';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_codenautas_section, params:[projDir]}]);
                done();
            }).catch(done);
        });
        it('should detect the absence of codenautas section in aparent codenautas project (#2)', function(done){
            var projDir=fixtures+'lack-codenautas';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_codenautas_section_in_codenautas_project, params:[projDir]}]);
                done();
            }).catch(done);
        });
        it('should detect the absence of codenautas version (#3)', function(done){
            var projDir=fixtures+'lack-version';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_version_in_section_codenautas, params:[projDir]}]);
                done();
            }).catch(done);
        });
        it('should detect a deprecated codenautas version (#4)', function(done){
            var projDir=fixtures+'deprecated-version';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.deprecated_version, params:['0.0.0']}]);
                done();
            }).catch(done);
        });
        it('should detect the absence of a mandatory parameter (#5)', function(done){
            var projDir=fixtures+'incomplete-codenautas-section';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.lack_mandatory_parameter, params:['run-in']}]);
                done();
            }).catch(done);
        });
    });
});
