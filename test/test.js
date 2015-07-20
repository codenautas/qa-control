"use strict";

var expect = require('expect.js');
var qac = require('..');

var fixtures=[{
    base:'stable-project',
    test:'no_package_json_1',
    change:function(info){
        delete info.files['package.json'];
    },
    expectedParams:['stable-project']
},{
    base:'stable-project',
    test:'no_codenautas_section',
    change:function(info){
        delete info.packageJson.codenautas;
    }
},{
    base:'stable-project',
    test:'invalid_value_1_in_parameter_2',
    change:function(info){
        info.packageJson.codenautas['type']='invalid-type-for-test';
    },
    expected:[{
        text:qaControl.msgs.es.invalid_value_1_in_parameter_2,
        params:['invalid-type-for-test','type']
    }]
}]

describe('qa-control', function(){
    describe('load project', function(){
        it('loads ok', function(done){
            qaControl.loadProject('./test/fixures/stable-project').then(function(info){
                expect(Object.keys(info)).to.eql([
                    'packageJsonText',
                    'packageJson',
                    'files'
                ]);
                expect(info.packageJsonText).to.match(/^{\n  "name": "stable-project"/);
                expect(info.packageJson.name).to.be('stable-project');
                expect(info.packageJson.codenautas["package-version"]).to.eql("0.0.1");
                expect(info.file['README.md'].content).to.match(/^<!--multilang v0 en:README.md es:LEEME.md -->/);
            }).catch(done);
        });
    });
    describe('text qa-control by fixtures', function(){
        var perfectProjects={};
        fixtures.forEach(function(fixture){
            var fixtureName='fixture '+fixture.test;
            if(fixture.skipped){
                it.skipped(fixtureName, function(){});
                return;
            }
            if(fixtureName,function(done){
                Promises.start(function(){
                    if(!perfectProject[fixture.base]){
                        return qaControl.loadProject(fixture.base).then(function(info){
                            perfectProject[fixture.base]=info;
                            return info;
                        });
                    }else{
                        return perfectProject[fixture.base];
                    }
                }).then(function(info){
                    return cloneProject(info);
                }).then(function(clonedInfo){
                    fixture.change(clonedInfo);
                    return qaControl.controlInfo(clonedInfo);
                }).then(function(warnings){
                    if(!fixture.expected){
                        fixture.expected=[{text:qaControl.msgs.es[fixture.test], params:[]}];
                        if(fixture.expectedParams){
                            fixture.expected.params=fixture.expectedParams;
                        }
                    }
                    expect(warnings).to.eql(fixture.expected);
                    done();
                }).catch(done);
            });
        });
    });
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
        var projDir=fixtures+'incomplete-codenautas-section';
        it('should detect the absence of a mandatory parameter (#5)', function(done){
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.lack_of_mandatory_parameter, params:['run-in']},
                                      {text:msgs.lack_of_mandatory_parameter, params:['type']}]);
                done();
            }).catch(done);
        });
        it.skip('should detect the absence of a mandatory files (#6)', function(done){
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.lack_of_mandatory_parameter, params:['README.md']},
                                      {text:msgs.lack_of_mandatory_parameter, params:['LEEME.md']},
                                      {text:msgs.lack_of_mandatory_parameter, params:['.travis.yml']},
                                      {text:msgs.lack_of_mandatory_parameter, params:['.gitignore']},
                                      {text:msgs.lack_of_mandatory_parameter, params:['LICENSE']}
                                     ]);
                done();
            }).catch(done);
        });
    });
});
