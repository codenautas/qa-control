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
    title:'no qa-control section in package.json (#2)',
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
        delete info.files['appveyor.yml'];
        info.packageJson['qa-control']["test-appveyor"]=false;
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['LEEME.md']},
        { warning:'lack_of_mandatory_file_1',params:['.travis.yml']},
        { warning:'lack_of_mandatory_file_1',params:['.gitignore']},
        { warning:'lack_of_mandatory_file_1',params:['LICENSE']}
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
    title:'no "qa-control" section in "codenautas" project (#21)',
    test:'no_qa_control_section_in_codenautas_project',
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
    test:'lack_of_mandatory_cucarda_1',
    change:function(info){
        var readme=info.files['README.md'].content;
        info.files['README.md'].content = readme.replace('![npm-version]','')
                                                .replace('![downloads]','')
                                                .replace('![dependencies]','');
    },
    expected:[
        { warning:'lack_of_mandatory_cucarda_1',params:['npm-version']},
        { warning:'lack_of_mandatory_cucarda_1',params:['downloads']},
        { warning:'lack_of_mandatory_cucarda_1',params:['dependencies']}
    ]
},{
    base:'stable-project',
    title:'missing optional cucardas in README.md must not create warnings (#8)',
    test:'lack_of_mandatory_cucarda_1',
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
        delete info.packageJson['qa-control']["coverage"];
    },
    expected:[
        { warning:'wrong_format_in_cucarda_1',params:['npm-version']},
        { warning:'wrong_format_in_cucarda_1',params:['downloads']},
        { warning:'wrong_format_in_cucarda_1',params:['coverage']},
        { warning:'wrong_format_in_cucarda_1',params:['dependencies']}
    ]
},{
    base:'stable-project',
    title:'first lines does not match in file (#14)',
    test:'first_lines_does_not_match_in_file_1',
    change:function(info){
        info.files['stable-project.js'].content='// a comment in the first line\n'+info.files['stable-project.js'].content;
    },
    expected:[{ warning:'first_lines_does_not_match_in_file_1',params:['stable-project.js']}]
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
    title:'must soften strings to match customs (#12)',
    test:'file_1_does_not_match_custom_2',
    change:function(info){
        info.files['simple.js'].content =
            info.files['simple.js'].content.replace("var Path = require('path');","var path= require('path');");
    },
    expected:[
        { warning:'file_1_does_not_match_custom_2',params:['simple.js', 'var_path']},
    ]
},{
    base:'stable-project',
    test:'repository_name_not_found',
    change:function(info){
        info.packageJson.repository = "sourcenauta/other/the-project";
    }
},{
    base:'stable-project',
    title:'must warn the use of non best-promise\'s Promises (#13)',
    test:'using_normal_promise_in_file_1',
    change:function(info){
        info.files['simple.js'].content =
            info.files['simple.js'].content = 
                "var Promise = require('promise');\n\n" + info.files['simple.js'].content;
    },
    expected:[
        { warning:'using_normal_promise_in_file_1',params:['simple.js']}
    ]
},{
    base:'stable-project',
    title:'must warn the use of non best-promise\'s Promises for every file (#13)',
    test:'using_normal_promise_in_file_1',
    change:function(info){
        info.files['simple.js'].content += '\n\nvar promise = require("rsvp");\n\n';
        info.files['stable-project.js'].content += '\n\nvar Promise = require("q");\n\n';
        
    },
    expected:[
        { warning:'using_normal_promise_in_file_1',params:['simple.js']},
        { warning:'using_normal_promise_in_file_1',params:['stable-project.js']}
    ]
},{
    base:'stable-project-main-in-subdir',
    title:'must warn if package.json main file does not exists (#22)',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        delete info.files['bin/main.js'];
    },
    expected:[
        { warning:'packagejson_main_file_1_does_not_exists',params:['bin/main.js']}
    ]
},{
    base:'stable-project',
    title:'must warn if JSHINT haves warnings (#26)',
    test:'jshint_warnings_in_file_1',
    change:function(info){
        info.files['stable-project.js'].content=info.files['stable-project.js'].content.replace('};//;','}//');
    },
    expected:[
        { warning:'jshint_warnings_in_file_1',params:['stable-project.js']}
    ]
},{
    base:'stable-project',
    title:'lack of jshintConfig section in package.json (#27)',
    test:'lack_of_jshintconfig_section_in_package_json',
    change:function(info){
        delete info['packageJson']['jshintConfig'];
    }
},{
    base:'stable-project',
    title:'missing options in jshintConfig in package.json (#27)',
    test:'incorrect_jshintconfig_option_1_in_package_json',
    change:function(info){
        delete info['packageJson']['jshintConfig']['curly'];
        delete info['packageJson']['jshintConfig']['forin'];
    },
    expected:[
        { warning:'incorrect_jshintconfig_option_1_in_package_json',params:['curly']},
        { warning:'incorrect_jshintconfig_option_1_in_package_json',params:['forin']}
    ]
},{
    base:'stable-project',
    title:'incorrect options in jshintConfig in package.json (#27)',
    test:'incorrect_jshintconfig_option_1_in_package_json',
    change:function(info){
        var jsh = info['packageJson']['jshintConfig'];
        jsh.asi = true;
        jsh.curly = false;
        jsh.forin = false;
        info['packageJson']['jshintConfig'] = jsh;
    },
    expected:[
        { warning:'incorrect_jshintconfig_option_1_in_package_json',params:['asi']},
        { warning:'incorrect_jshintconfig_option_1_in_package_json',params:['curly']},
        { warning:'incorrect_jshintconfig_option_1_in_package_json',params:['forin']}
    ]
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
       it('generates english messages from spanish warnings', function(done){
            qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                var en=qaControl.msgs.en;
                var es=qaControl.msgs.es;
                expect(_.keys(en).sort()).to.eql(_.keys(es).sort());
                //console.log(qaControl.msgs.en);
                expect(en['deprecated_qa_control_version']).to.be('deprecated qa-control version');
                expect(en['deprecated_version']).to.be('deprecated version');
                expect(en['invalid_qa_control_version']).to.be('invalid qa control version');
                expect(en['invalid_value_1_in_parameter_2']).to.be('invalid value $1 in parameter $2');
                expect(en['lack_of_mandatory_file_1']).to.be('lack of mandatory file $1');
                //expect(en['lack_of_mandatory_parameter']).to.be('lack of mandatory parameter');
                expect(en['lack_of_mandatory_section_1']).to.be('lack of mandatory section $1');
                expect(en['no_qa_control_section_in_codenautas_project']).to.be('no qa control section in codenautas project');
                expect(en['no_multilang_section_in_readme']).to.be('no multilang section in readme');
                expect(en['no_package_json']).to.be('no package json');
                expect(en['no_package_version_in_qa_control_section']).to.be('no package version in qa control section');
                expect(en['no_qa_control_section_in_package_json']).to.be('no qa control section in package json');
                expect(en['no_version_in_section_codenautas']).to.be('no version in section codenautas');
                expect(en['lack_of_cucarda_marker_in_readme']).to.be('lack of cucarda marker in readme');
                expect(en['lack_of_mandatory_cucarda_1']).to.be('lack of mandatory cucarda $1');
                expect(en['wrong_format_in_cucarda_1']).to.be('wrong format in cucarda $1');
                expect(en['lack_of_mandatory_line_1_in_file_2']).to.be('lack of mandatory line $1 in file $2');
                expect(en['file_1_does_not_match_custom_2']).to.be('file $1 does not match custom $2');
                expect(en['first_lines_does_not_match_in_file_1']).to.be('first lines does not match in file $1');
                expect(en['repository_name_not_found']).to.be('pacakgeJson.repository must be in format /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/');
                expect(en['using_normal_promise_in_file_1']).to.be('using normal promise in file $1');
                expect(en['packagejson_main_file_1_does_not_exists']).to.be('packagejson main file $1 does not exists');
                expect(en['jshint_warnings_in_file_1']).to.be('jshint warnings in file $1');
                expect(en['lack_of_jshintconfig_section_in_package_json']).to.be('lack of jshintconfig section in package json');
                expect(en['incorrect_jshintconfig_option_1_in_package_json']).to.be('incorrect jshintconfig option $1 in package json');
                //expect(en['readme_not_sinchronized_with_multilang']).to.be('readme not sinchronized with multilang');
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
    describe('packageJson tests', function(){
        it('packageJson.main must be loaded from subdirectory', function(done){
            qaControl.loadProject('./test/fixtures/stable-project-main-in-subdir').then(function(info){
                expect(info['files']).to.have.key('bin/main.js');
                expect(info['files']['bin/main.js'].content).to.contain('stableProject');
                return qaControl.controlInfo(info);
            }).then(function(warns){
                expect(warns).to.eql([]);
                done();
            }).catch(function(err) {
                console.log("mal", err);
                done(err);
            });
        });
    });
    describe('integrity tests', function(){
        it('verify that qa-control.js only uses existent warning IDs (#24)', function(done){
            fs.readFile('./bin/qa-control.js', {encoding: 'utf8'}).then(function(content) {
                //console.log("con", content);
                var reWarn = /\bwarning\b\s*:\s*['"]([^'"]+)['"]/;
                var reIncompleteWarn = /\bwarning\b\s*:\s*$/;
                var numWarns=0;
                for(var msg in qaControl.msgs) {
                    if(msg !== "en") {
                        // no captura cosas raras, pero obtengo line-number
                        var lines = content.split('\n');
                        for(var ln=0; ln<lines.length; ++ln) {
                            var line = lines[ln];
                            var matches = reWarn.exec(line);
                            if(matches) {
                                var warn = matches[1];
                                //console.log(ln+1, ":", warn);
                                if(false === warn in qaControl.msgs[msg]) {
                                    console.log("Inexistent warning '"+warn+"' on line #"+parseInt(ln+1));
                                    ++numWarns;
                                }
                            }
                            if(reIncompleteWarn.test(line)) {
                                console.log("Incomplete warning on line #"+parseInt(ln+1));
                                ++numWarns;
                            }
                        }
                    }
                }
                if(numWarns) {
                    done('Tengo '+numWarns+' warnings');
                } else {
                    done();
                }
            }).catch(function(err) {
                console.log("mal", err);
                done(err);
            });
        });
    });
    var path='./test/fixtures';
    fs.readdir(path).then(function(files){
        describe('cucardas (#9)', function(){
            files.forEach(function(file){
                if(file.match(/^cucardas-/i)){
                    it('test cucardas by '+file+' fixture',function(done){
                        var packageJson;
                        var warnings=false;
                        var cucardasOut=false;
                        var base = path+'/'+file;
                        fs.readJson(base+'/package.json').then(function(o){
                            packageJson=o;
                            return fs.readJson(base+'/warnings.json');
                        }).catch(function(err) {
                            return false;
                        }).then(function(o){
                            warnings=o;
                            return fs.exists(base+'/cucardas.out');
                        }).catch(function(err) {
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
                            if(cucardasOut) {
                                var cucaContent = qaControl.generateCucardas(cucardas,packageJson);
                                // fs.writeFileSync('./'+file+'_cucardas.out', qaControl.fixEOL(cucardasOut));
                                // fs.writeFileSync('./'+file+'_cucardas.log', qaControl.fixEOL(cucaContent));
                                expect(qaControl.fixEOL(cucardasOut)).to.eql(qaControl.fixEOL(cucaContent));
                            }
                            if(warnings) {
                                return qaControl.loadProject(base).then(function(info) {
                                    info.packageVersion = info.packageJson['qa-control']['package-version'];
                                    return check(info);
                                }).then(function(warns) {
                                    expect(warns).to.eql(warnings);
                                    done();
                                });
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

function generateWarningsArray(lang) {
    var warns = [];
    var messages = qaControl.msgs[lang];
    //console.log(messages);
    for(var msgName in messages) {
        var msg = messages[msgName];
        var warn = { warning:msgName };
        var numParams = msgName.match(/\d+/g);
        if(numParams) {
            var params = [];
            for(var p=0; p<numParams.length; ++p) {
                params.push('param'+parseInt(p+1));
            }
            warn['params'] = params;
        }
        warns.push(warn);
    }
    return warns;
}
    
describe('qa-control main', function(){
    describe('tests of warning output', function(){
        it('stringize warnings in lang "es"', function(done){
            qaControl.fixMessages(qaControl.msgs.en).then(function(){
                //console.log(qaControl.msgs.en);
                return qaControl.stringizeWarnings(generateWarningsArray('es'), 'es');
            }).then(function(warnStr){
                //console.log(warnStr);
                expect(warnStr).to.eql('la versión de qa-control es vieja\n'
                                      +'la version es demasiado vieja\n'
                                      +'la sección "package-version" en qa-control contiene un valor incorrecto\n'
                                      +'valor invalido "param2" para el parametro "param1" en la sección qa-control\n'
                                      +'falta el archivo obligatorio "param1"\n'
                                      +'falta la sección obligatoria "param1" en la sección qa-control\n'
                                      +'falta la sección "qa-control" en package.json y aparenta ser un proyecto codenautas\n'
                                      +'falta la sección multilang en el archivo README.md\n'
                                      +'falta el archivo package.json\n'
                                      +'falta la sección "package-version" en la sección qa-control\n'
                                      +'falta la sección qa-control en package.json\n'
                                      +'falta la entrada para "package-version" en la sección codenautas del package.json\n'
                                      +'falta la sección "cucardas" en README.md\n'
                                      +'falta la cucarda oblicatoria param1\n'
                                      +'la cucarda "param1" tiene formato incorrecto\n'
                                      +'falta la linea obligatoria param1 en el archivo param2\n'
                                      +'param1 no respeta la custombre param2\n'
                                      +'las primeras líneas no coinciden en param1\n'
                                      +'pacakgeJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}/[-a-zA-Z0-9_.]+/\n'
                                      +'se han usado Promise(s) normales en "param1"\n'
                                      +'no existe el archivo "main" (param1) declarado en package.json\n'
                                      +'el archivo "param1" tiene warnings de JSHint\n'
                                      +'falta la sección "jshintConfig" en package.json\n'
                                      +'la opcion "param1" en "jshintConfig" es incorrecta en package.json\n');
                done();
            }).catch(done);
        });
        it('stringize warnings in lang "en"', function(done){
            qaControl.fixMessages(qaControl.msgs.en).then(function(){
                //console.log(qaControl.msgs.en);
                return qaControl.stringizeWarnings(generateWarningsArray('en'), 'en');
            }).then(function(warnStr){
                //console.log(warnStr);
                expect(warnStr).to.eql('deprecated qa-control version\n'
                                       +'pacakgeJson.repository must be in format /{[-a-zA-Z0-9_.]+}/[-a-zA-Z0-9_.]+/\n'
                                       +'deprecated version\n'
                                       +'invalid qa control version\n'
                                       +'invalid value param1 in parameter param2\n'
                                       +'lack of mandatory file param1\n'
                                       +'lack of mandatory section param1\n'
                                       +'no qa control section in codenautas project\n'
                                       +'no multilang section in readme\n'
                                       +'no package json\n'
                                       +'no package version in qa control section\n'
                                       +'no qa control section in package json\n'
                                       +'no version in section codenautas\n'
                                       +'lack of cucarda marker in readme\n'
                                       +'lack of mandatory cucarda param1\n'
                                       +'wrong format in cucarda param1\n'
                                       +'lack of mandatory line param1 in file param2\n'
                                       +'file param1 does not match custom param2\n'
                                       +'first lines does not match in file param1\n'
                                       +'using normal promise in file param1\n'
                                       +'packagejson main file param1 does not exists\n'
                                       +'jshint warnings in file param1\n'
                                       +'lack of jshintconfig section in package json\n'
                                       +'incorrect jshintconfig option param1 in package json\n');
                done();
            }).catch(done);
        });
    });
});