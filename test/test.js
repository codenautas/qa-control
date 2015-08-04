"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var qaControl = require('..');
var Promises = require('best-promise');
var fs = require('fs-promise');

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
    title:'cucardas marker must exist in README.md (#8)',
    test:'lack_of_cucarda_marker_in_readme',
    change:function(info){
        info.files['README.md'].content = info.files['README.md'].content.replace('<!-- cucardas -->','');
    }
},{
    base:'stable-project',
    title:'missing mandatory cucardas in README.md (#8)',
    test:'missing_mandatory_cucarda_1',
    change:function(info){
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![npm-version]','')
                                                .replace('![downloads]','')
                                                .replace('![dependencies]','');
    },
    expected:[
        { warning:'missing_mandatory_cucarda_1',params:['npm-version']},
        { warning:'missing_mandatory_cucarda_1',params:['downloads']},
        { warning:'missing_mandatory_cucarda_1',params:['dependencies']}
    ]
},{
    base:'stable-project',
    title:'missing optional cucardas in README.md must not create warnings(#8)',
    test:'missing_mandatory_cucarda_1',
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
    title:'wrong format in mandatory cucardas in README.md (#8)',
    test:'wrong_format_in_cucarda_1',
    change:function(info){
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![npm-version](https://img.shields.io/npm','![npm-version](https://HHHimg.shields.io/npm')
                                                .replace('[![downloads](https://img.shields.io/npm/','[![downloads](https://im__shields.io/npm/')
                                                .replace('[![dependencies](https://img.shields.io','[![dependencies](https://EEimg.shields.io');
    },
    expected:[
        { warning:'wrong_format_in_cucarda_1',params:['npm-version']},
        { warning:'wrong_format_in_cucarda_1',params:['downloads']},
        { warning:'wrong_format_in_cucarda_1',params:['dependencies']}
    ]
},{
    base:'stable-project',
    title:'first line does not match in file (#14)',
    test:'first_line_does_not_match_in_file_1',
    change:function(info){
        info.files['stable-project.js'].content='// a comment in the first line\n'+info.files['stable-project.js'].content;
    },
    expected:[{ warning:'first_line_does_not_match_in_file_1',params:['stable-project.js']}]
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
    title:'must respect customs (#12)',
    test:'file_1_does_not_match_custom_2',
    change:function(info){
        info.files['simple.js'].content =
            info.files['simple.js'].content.replace('Path.sep===','Path.sep==')
                                                   .replace('eid(id){ return document.getElementById(id); }','eid(elId){ return document.getElementById(elId); }');
    },
    expected:[
        { warning:'file_1_does_not_match_custom_2',params:['simple.js', 'funtion_eid']},
        { warning:'file_1_does_not_match_custom_2',params:['simple.js', 'var_winos']}
    ]
},{
    base:'stable-project',
    test:'repository_name_not_found',
    change:function(info){
        info.packageJson.repository = "sourcenauta/other/the-project";
    }
}];

function cloneProject(info){
    return _.cloneDeep(info);
}

describe('qa-control', function(){
    describe('load project', function(){
        it('waits for config already readed', function(done){
            qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                expect(qaControl.configReady).to.ok();
                expect(
                    qaControl.projectDefinition['0.0.1'].sections['run-in'].values.server.firstLines
                ).to.match(/^"use strict";/);
                done();
            }).catch(done);
        });
        it('loads ok', function(done){
            qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
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
                        return qaControl.loadProject('test/fixtures/'+fixture.base).then(function(info){
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
                    return qaControl.controlInfo(clonedInfo);
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
            qaControl.controlProject(null).then(function(warns){
                done(warns);
            }).catch(function(err){
                expect(err).to.match(/null projectDir/);
                done();
            });
        });
        it('must fail if path does not exist', function(done){
            qaControl.controlProject('/non existent path/').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/does not exists/);
                done();
            });
        });
        it('must fail if path is not a directory', function(done){
            qaControl.controlProject('./package.json').then(function(info){
                done(info);
            }).catch(function(err){
                expect(err).to.match(/is not a directory/);
                done();
            });
        });
    });
    var path='./test/fixtures';
    fs.readdir(path).then(function(files){
        describe('cucardas (#9)', function(){
            files.forEach(function(file){
                if(file.match(/^cucardas-/i)){
                    //if(file === 'cucardas-extending') { return; }
                    //if(file === 'cucardas-proof-of-concept') { return; }
                    it('test cucardas by '+file+' fixture',function(done){
                        console.log("DIR:", file);
                        var packageJson;
                        var warnings=false;
                        var cucardasOut=false;
                        var base = path+'/'+file;
                        fs.readJson(base+'/package.json').then(function(o){
                            packageJson=o;
                            return fs.readJson(base+'/warnings.json');
                        }).catch(function(err) {
                            //console.log("  warnings.json ERROR: ", err.stack);
                            return false;
                        }).then(function(o){
                            warnings=o;
                            return fs.exists(base+'/cucardas.out');
                        }).catch(function(err) {
                            //console.log("  cucardas.out ERROR: ", err.stack);
                            return false;
                        }).then(function(o) {
                            cucardasOut = o;
                            if(cucardasOut) {
                                return fs.readFile(base+'/cucardas.out', {encoding: 'utf8'});
                            }
                            return o;
                        }).then(function(o) {
                            cucardasOut = o;
                            return fs.exists(base+'/README.md');
                        }).then(function(readme) {
                            var packVer = packageJson['qa-control']['package-version'];
                            var project = qaControl.projectDefinition[packVer];
                            var cucardas = qaControl.projectDefinition[packVer].cucardas;
                            var check = project.rules.cucardas['checks'][0].warnings;
                            if(false && warnings) {
                                return qaControl.loadProject(base).then(function(info) {
                                    //console.log(info);
                                    info.packageVersion = info.packageJson['qa-control']['package-version'];
                                    return check(info);
                                }).then(function(warns) {
                                    //console.log("warns", warns);
                                    expect(warns).to.eql(warnings);
                                    done();
                                });
                            }
                            if(cucardasOut) {
                                var cucaContent = qaControl.generateCucardas(cucardas,packageJson);
                                fs.writeFileSync('./'+file+'_cucardas.out', qaControl.fixEOL(cucardasOut));
                                fs.writeFileSync('./'+file+'_cucardas.log', qaControl.fixEOL(cucaContent));
                                //expect(qaControl.fixEOL(cucardasOut)).to.eql(qaControl.fixEOL(cucaContent));
                            }
                            done();
                        }).catch(function(err){ // OJO: este es el fixture sin warnings.json !!!
                           console.log(err.stack);
                           console.log("ERROR en DIR:", file);
                           done(err);
                        });
                    });
                }
            });
        });
    });
});
