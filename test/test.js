"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qac = require('..');
var Promises = require('best-promise');

var fixtures=[{
    base:'stable-project',
    test:'no_package_json',
    change:function(info){
        delete info.files['package.json'];
    }
},{
    base:'stable-project',
    title:'no qa-control section in package.json(#2)',
    test:'no_qa_control_section_in_package_json',
    change:function(info){
        delete info.packageJson['qa-control'];
    }
},{
    base:'stable-project',
    title:'no package-version in qa-control section (#3)',
    test:'no_package_version_in_qa_control_section',
    change:function(info){
        delete info.packageJson['qa-control']['package-version'];
    }
},{
    base:'stable-project',
    test:'lack_of_mandatory_attribute_1',
    change:function(info){
        delete info.packageJson['qa-control']['run-in'];
        delete info.packageJson['qa-control']['type'];
    },
    expected:[
        { warning:'lack_of_mandatory_section_1',params:['run-in']},
        { warning:'lack_of_mandatory_section_1',params:['type']}
    ]
},{
    base:'stable-project',
    test:'invalid_value_1_in_parameter_2',
    change:function(info){
        info.packageJson['qa-control']['run-in']='invalid-run-in-for-test';
    },
    expected:[{
        warning:'invalid_value_1_in_parameter_2',
        params:['invalid-run-in-for-test','run-in']
    }]
},{
    base:'stable-project',
    test:'no_multilang_section_in_readme',
    change:function(info){
        info.files['README.md'].content = "content without multilang section";
    }
}]

function cloneProject(info){
    return _.cloneDeep(info);
}

describe('qa-control', function(){
    describe('load project', function(){
        it('loads ok', function(done){
            qac.loadProject('./test/fixtures/stable-project').then(function(info){
                expect(Object.keys(info)).to.eql([
                    'files',
                    'packageJson'
                ]);
                expect(Object.keys(info.files)).to.eql(['.gitignore','.travis.yml','LEEME.md','LICENSE','README.md','appveyor.yml','package.json']);
                expect(info.files['package.json'].content).to.match(/^{\n  "name": "stable-project"/);
                expect(info.packageJson.name).to.be('stable-project');
                expect(info.packageJson["qa-control"]["package-version"]).to.eql("0.0.1");
                expect(info.packageJson["qa-control"]["run-in"]).to.eql("server");
                expect(info.packageJson["qa-control"]["test-appveyor"]).to.eql(true);
                expect(info.packageJson["qa-control"]["type"]).to.eql("lib");
                expect(info.packageJson["qa-control"]["coverage"]).to.eql(100);
                expect(info.files['README.md'].content).to.match(/^<!--multilang v0 en:README.md es:LEEME.md -->/);
                done();
            }).catch(done);
        });
    });
    describe('test qa-control by fixtures', function(){
        var perfectProjects={};
        fixtures.forEach(function(fixture){
            var fixtureName='fixture '+(fixture.title ? fixture.title :fixture.test);
            if(fixture.skipped){
                it.skip(fixtureName, function(){});
                return;
            }
            it(fixtureName,function(done){
                Promises.start(function(){
                    if(!perfectProjects[fixture.base]){
                        return qac.loadProject('test/fixtures/'+fixture.base).then(function(info){
                            perfectProjects[fixture.base]=info;
                            return info;
                        });
                    }else{
                        return perfectProjects[fixture.base];
                    }
                }).then(function(info){
                    return cloneProject(info);
                }).then(function(clonedInfo){
                    fixture.change(clonedInfo);
                    return qac.controlInfo(clonedInfo);
                }).then(function(warnings){
                    if(!fixture.expected){
                        fixture.expected=[{warning:fixture.test}];
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
    describe.skip('tests that abort on wrong input', function(){
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
    describe.skip('basic tests', function(){
        var msgs=qac.msgs[qac.lang];
        var fixtures='./test/fixtures/';
        it('should detect the absence of codenautas section in aparent codenautas project (#2)', function(done){
            var projDir=fixtures+'lack-codenautas';
            qac.controlProject(projDir).then(function(warns){
                expect(warns).to.eql([{text:msgs.no_codenautas_section_in_codenautas_project, params:[projDir]}]);
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
