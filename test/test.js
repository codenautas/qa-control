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
        info.files['package.json'].content = "otro contenido";        
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
    test:'invalid_qa_control_version',
    change:function(info){
        info.packageJson['qa-control']['package-version']='not-a-version-number';
    },
    expected:[
        { warning:'invalid_qa_control_version',params:['not-a-version-number']},
    ]
},{
    base:'stable-project',
    title:'abort on deprecated qa-control section version (#4)',
    test:'deprecated_qa_control_version',
    change:function(info){
        info.packageJson['qa-control']['package-version']='0.0.0';
    },
    expected:[
        { warning:'deprecated_qa_control_version',params:['0.0.0']},
    ]
},{
    base:'stable-project',
    test:'lack_of_mandatory_section_1',
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
    title:'lack of mandatory files (#6)',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        //delete info.files['README.md']; // si saco este salta no_multilang_section_in_readme
        delete info.files['LEEME.md'];
        delete info.files['.travis.yml'];
        delete info.files['.gitignore'];
        delete info.files['LICENSE'];
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['LEEME.md']},
        { warning:'lack_of_mandatory_file_1',params:['.travis.yml']},
        { warning:'lack_of_mandatory_file_1',params:['.gitignore']},
        { warning:'lack_of_mandatory_file_1',params:['LICENSE']}
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
    title:'no "multilang" section in README.md (#7)',
    test:'no_multilang_section_in_readme',
    change:function(info){
        info.files['README.md'].content = info.files['README.md'].content.replace('multilang v0','');
    }
},{
    base:'stable-project',
    title:'no "qa-control" section in "codenautas" project',
    test:'no_codenautas_section_in_qa_control_project',
    change:function(info){
        delete info.packageJson['qa-control'];
    }
},{
    base:'stable-project',
    title:'cockades marker must exist in README.md (#8)',
    test:'lack_of_cockade_marker_in_readme',
    change:function(info){
        info.files['README.md'].content = info.files['README.md'].content.replace('<!-- cucardas -->','');
    }
},{
    base:'stable-project',
    title:'missing mandatory cockades in README.md (#8)',
    test:'missing_mandatory_cockade_1',
    change:function(info){
        
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![version]','')
                                                .replace('![downloads]','')
                                                .replace('![linux]','')
                                                .replace('![dependencies]','');
    },
    expected:[
        { warning:'missing_mandatory_cockade_1',params:['npm-version']},
        { warning:'missing_mandatory_cockade_1',params:['downloads']},
        { warning:'missing_mandatory_cockade_1',params:['build']},
        { warning:'missing_mandatory_cockade_1',params:['dependencies']}
    ]
},{
    base:'stable-project',
    title:'missing optional cockades in README.md must not create warnings(#8)',
    test:'missing_mandatory_cockade_1',
    change:function(info){
        
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![designing]','')
                                                .replace('![extending]','')
                                                .replace('![windows]','')
                                                .replace('![coverage]','')
                                                .replace('![climate]','');
    },
    expected:[]
},{
    base:'stable-project',
    title:'wrong format in mandatory cockades in README.md (#8)',
    test:'wrong_format_in_cockade_1',
    change:function(info){
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![version](https://img.shields.io/npm','![version](https://HHHimg.shields.io/npm')
                                                .replace('[![downloads](https://img.shields.io/npm/','[![downloads](https://im__shields.io/npm/')
                                                .replace('[![linux](https://img.shields.io/travis','[![linux](http://img.shields.io/travis')
                                                .replace('[![dependencies](https://img.shields.io','[![dependencies](https://EEimg.shields.io');
    },
    expected:[
        { warning:'wrong_format_in_cockade_1',params:['npm-version']},
        { warning:'wrong_format_in_cockade_1',params:['downloads']},
        { warning:'wrong_format_in_cockade_1',params:['build']},
        { warning:'wrong_format_in_cockade_1',params:['dependencies']}
    ]
},{
    skipped:true,
    base:'stable-project',
    title:'first line does not match in file (#14)',
    test:'first_line_does_not_match_in_file_1',
    change:function(info){
        info.files['stable-project.js'].content='// a comment in the first line\n'+info.files['stable-project.js'].content;
    }
},{
    base:'stable-project',
    title:'lack of mandatory lines in .gitignore (#10)',
    test:'lack_of_mandatory_line_1_in_file_2',
    change:function(info){
        info.files['.gitignore'].content = info.files['.gitignore'].content.replace('local-*','').replace('*-local.*','');
    },
    expected:[
        { warning:'lack_of_mandatory_line_1_in_file_2',params:['local-*', '.gitignore']},
        { warning:'lack_of_mandatory_line_1_in_file_2',params:['*-local.*', '.gitignore']}
    ]
},{
    base:'stable-project',
    title:'must respect costums (#12)',
    test:'file_1_does_not_match_costum_2',
    change:function(info){
        info.files['simple.js'].content =
            info.files['simple.js'].content.replace('Path.sep===','Path.sep==')
                                                   .replace('eid(id){ return document.getElementById(id); }','eid(elId){ return document.getElementById(elId); }');
    },
    expected:[
        { warning:'file_1_does_not_match_costum_2',params:['simple.js', 'funtion_eid']},
        { warning:'file_1_does_not_match_costum_2',params:['simple.js', 'var_winos']}
    ]
}];

function cloneProject(info){
    return _.cloneDeep(info);
}

describe('qa-control', function(){
    describe('load project', function(){
        it('waits for config already readed', function(done){
            qac.loadProject('./test/fixtures/stable-project').then(function(info){
                expect(qac.configReady).to.ok();
                expect(
                    qac.projectDefinition['0.0.1'].sections['run-in'].values.server.firstLines
                ).to.match(/^"use strict";/);
                done();
            }).catch(done);
        });
        it('loads ok', function(done){
            qac.loadProject('./test/fixtures/stable-project').then(function(info){
                expect(Object.keys(info)).to.eql([
                    'files',
                    'packageJson'
                ]);
                expect(Object.keys(info.files)).to.eql(['.gitignore','.travis.yml','LEEME.md','LICENSE','README.md','appveyor.yml','package.json','simple.js','stable-project.js']);
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
    describe('tests that abort on wrong input', function(){
        it('must fail if path is null', function(done){
            qac.controlProject(null).then(function(warns){
                done(warns);
            }).catch(function(err){
                expect(err).to.match(/null projectDir/);
                done();
            });
        });
        it('must fail if path does not exist', function(done){
            qac.controlProject('/non existent path/').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/does not exists/);
                done();
            });
        });
        it('must fail if path is not a directory', function(done){
            qac.controlProject('./package.json').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/is not a directory/);
                done();
            });
        });
    });
});
