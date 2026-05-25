"use strict";

var expect = require('expect.js');
var qaControl = require('..');
var fs = require('fs-extra');
var Path = require('path');
var yaml = require('js-yaml');

function stripScoring(warnArray) {
    for(var w=0; w<warnArray.length; ++w) {
        if('scoring' in warnArray[w]) {
            delete warnArray[w]['scoring'];
        }
    }
    return warnArray;
};

function stripNotices(warnArray) {
    for(var w=0; w<warnArray.length; ++w) {
        if('scoring' in warnArray[w]) {
            if('notice' in warnArray[w]['scoring']) {
                warnArray.splice(w, 1);
            }
        }
    }
    return warnArray;
};

const WARNING_CANT_CONTINUE = {warning:'cant_continue'};
const WARNING_BAILING_CONTINUE = {warning:'bailing_could_be_more'};

/** @type {Fixture[]} */
var fixtures=[{
    base:'stable-project',
    test:'no_package_json',
    options: {scoring: true},
    change:function(info){
        delete info.files['package.json'];
    },
    expected:[
        { warning:'no_package_json',scoring:{fatal:1}},
        { warning:'cant_continue',scoring:{fatal:1}},
    ]
},{
    base:'stable-project',
    title:'no qa-control section in package.json (#2)',
    test:'no_qa_control_section_in_package_json',
    options:{scoring: true},
    change:function(info){
        delete info.packageJson['qa-control'];
        info.files['package.json'].content = "otro contenido";        
    },
    expected: [{ warning: 'no_qa_control_section_in_package_json', scoring:{fatal:1} } ]
},{
    base:'stable-project',
    test:'lack_of_mandatory_section_1',
    options:{bail:true},
    change:function(info){
        delete info.packageJson['qa-control']['run-in'];
        delete info.packageJson['qa-control']['type'];
    },
    expected:[
        { warning:'lack_of_mandatory_section_1',params:['run-in']},
        { warning:'lack_of_mandatory_section_1',params:['type']},
        WARNING_BAILING_CONTINUE
    ]
},{
    base:'stable-project',
    title:'lack of mandatory files (#6)',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        //delete info.files['README.md']; // si saco este salta no_multilang_section_in_1
        delete info.files['LEEME.md'];
        delete info.files['.gitignore'];
        delete info.files['LICENSE'];
        delete info.files['appveyor.yml'];
        info.packageJson['qa-control']["test-appveyor"]=false;
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['LEEME.md']},
        { warning:'lack_of_mandatory_file_1',params:['.gitignore']},
        { warning:'lack_of_mandatory_file_1',params:['LICENSE']},
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project',
    title:'lack of mandatory files v2',
    test:'lack_of_mandatory_file_v2_1',
    change:function(info){
        //delete info.files['README.md']; // si saco este salta no_multilang_section_in_1
        delete info.files['LEEME.md'];
        delete info.files['.gitignore'];
        delete info.files['LICENSE'];
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['LEEME.md']},
        { warning:'lack_of_mandatory_file_1',params:['.gitignore']},
        { warning:'lack_of_mandatory_file_1',params:['LICENSE']},
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project',
    test:'invalid_value_1_in_parameter_2',
    change:function(info){
        info.packageJson['qa-control']['run-in']='invalid-run-in-for-test';
    },
    expected:[
        {
            warning:'invalid_value_1_in_parameter_2',
            params:['invalid-run-in-for-test','run-in']
        },
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project',
    title:'no "multilang" section in main doc LEEME.md (#7)',
    test:'no_multilang_section_in_1',
    change:function(info){
        info.files['LEEME.md'].content = info.files['LEEME.md'].content.replace('multilang v0','');
    },
    expected:[ { warning:'no_multilang_section_in_1', params:['LEEME.md'] } ]
},{
    base:'stable-project',
    title:'README.md (multilang) not sinchronized (#7)',
    test:'readme_multilang_not_sincronized_with_file_1',
    change:function(info){
        info.files['README.md'].content = info.files['README.md'].content.replace('the description','');
    },
    expected:[
        {warning:'readme_multilang_not_sincronized_with_file_1', params:['README.md']}
    ]
},{
    base:'stable-project',
    title:'no "qa-control" section in "codenautas" project (#21)',
    test:'no_qa_control_section_in_codenautas_project',
    options: {scoring: true},
    change:function(info){
        delete info.packageJson['qa-control'];
    },
    expected:[{warning:'no_qa_control_section_in_codenautas_project', scoring:{fatal:1}}]
},{
    base:'stable-project',
    title:'cucardas marker must exist in README.md (#8)',
    test:'lack_of_cucarda_marker_in_readme',
    change:function(info){
        info.files['LEEME.md'].content = info.files['LEEME.md'].content.replace('<!-- cucardas -->','');
    },
    expected:[
        { warning:'lack_of_cucarda_marker_in_readme' },
        // Modificar LEEME.md hace que multilang genere distinto README.md
        { warning:'readme_multilang_not_sincronized_with_file_1', params:['README.md']}
    ]
},{
    base:'stable-project',
    title:'missing mandatory cucardas in README.md (#8)',
    test:'lack_of_mandatory_cucarda_1',
    change:function(info){
        var readme=info.files['LEEME.md'].content;
        info.files['LEEME.md'].content = readme.replace('![npm-version]','')
                                                .replace('![downloads]','')
                                                .replace('![security]','');
    },
    expected:[
        { warning:'lack_of_mandatory_cucarda_1',params:['npm-version']},
        { warning:'lack_of_mandatory_cucarda_1',params:['downloads']},
        { warning:'lack_of_mandatory_cucarda_1',params:['security']},
        { warning:'readme_multilang_not_sincronized_with_file_1', params:['README.md']}
    ]
},{
    base:'stable-project',
    title:'missing optional cucardas in README.md must not create warnings (#8)',
    test:'lack_of_mandatory_cucarda_1',
    change:function(info){
        var readme=info.files['LEEME.md'].content;
        info.files['LEEME.md'].content = readme.replace('![designing]','')
                                                .replace('![extending]','')
                                                .replace('![windows]','')
                                                .replace('![coverage]','')
                                                .replace('![climate]','');
    },
    expected:[
        { warning:'readme_multilang_not_sincronized_with_file_1', params:['README.md'] }
    ]
},{
    base:'stable-project',
    title:'wrong format in mandatory cucardas in README.md (#8)',
    test:'wrong_format_in_cucarda_1',
    change:function(info){
        var readme=info.files['LEEME.md'].content;
        info.files['LEEME.md'].content = readme.replace('![npm-version](https://img.shields.io/npm','![npm-version](https://HHHimg.shields.io/npm')
                                                .replace('[![downloads](https://img.shields.io/npm/','[![downloads](https://im__shields.io/npm/')
                                                .replace('[![security](https://socket.dev','[![security](https://EEsocket.dev');
        delete info.packageJson['qa-control']["coverage"];
    },
    expected:[
        { warning:'wrong_format_in_cucarda_1',params:['npm-version']},
        { warning:'wrong_format_in_cucarda_1',params:['downloads']},
        { warning:'wrong_format_in_cucarda_1',params:['coverage']},
        { warning:'wrong_format_in_cucarda_1',params:['security']},
        { warning:'readme_multilang_not_sincronized_with_file_1', params:['README.md']}
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
        { warning:'eslint_warnings_in_file_1',params:['simple.js']},
    ]
},{
    base:'stable-project',
    test:'repository_name_not_found',
    change:function(info){
        info.packageJson.repository = "sourcenauta/other/the-project";
    },
    expected:[
        { warning:'repository_name_not_found'},
        { warning: "invalid_repository_section_in_package_json"},
        WARNING_CANT_CONTINUE
    ]
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
        { warning:'using_normal_promise_in_file_1',params:['simple.js']},
        { warning:'eslint_warnings_in_file_1',params:['simple.js']}, 
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
        { warning:'using_normal_promise_in_file_1',params:['stable-project.js']},
        { warning:'eslint_warnings_in_file_1',params:['simple.js']}, 
        { warning:'eslint_warnings_in_file_1',params:['stable-project.js']}, 
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
    title:'lack of repository section in package json (#28)',
    test:'lack_of_repository_section_in_package_json',
    change:function(info){
        delete info['packageJson']['repository'];
    },
    expected:[ 
        { warning: 'lack_of_repository_section_in_package_json' },
        { warning: 'invalid_repository_section_in_package_json' },
        WARNING_CANT_CONTINUE]
},{
    base:'stable-project',
    title:'invalid repository section in package json (repo changed)',
    test:'invalid_repository_section_in_package_json_repo_changed',
    options: {bail:true},
    change:function(info){
        info['packageJson']['repository'] = info['packageJson']['repository'].replace('stable-project', 'another-proyect');
    },
    expected:[
        { warning:'invalid_repository_section_in_package_json' },
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project',
    title:'lack of mandatory lines in .gitignore should not abort (#30)',
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
    title:'lack of optionally mandatory files',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        delete info.files['appveyor.yml'];
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['appveyor.yml']},
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project',
    title:'must handle repository as an object (#34)',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        info['packageJson']['repository'] = { "type": "git", "url": "codenautas/stable-project" };
    },
    expected:[]
},{
    base:'stable-project',
    title:'must handle repository with github prefix (#34)',
    test:'lack_of_mandatory_file_1',
    change:function(info){
        info['packageJson']['repository'] = { "type": "git", "url": "https://github.com/codenautas/stable-project" };
    },
    expected:[]
},{
    base:'stable-project',
    title:'must reject invalid version numbers in "dependencies" section (#38)',
    test:'invalid_dependency_version_number_format_in_dep_1',
    change:function(info){
        info.packageJson.dependencies['pg'] = "~4.4.";
        info.packageJson.dependencies['promise'] = ">=7.0.";
    },
    expected:[
        { warning:'invalid_dependency_version_number_format_in_dep_1',params:['pg'] },
        { warning:'invalid_dependency_version_number_format_in_dep_1',params:['promise'] }
    ]
},{
    base:'stable-project-v0.1.4',
    title:'must reject files without correct "use strict" (#43)',
    test:'wrong_use_strict_spelling_in_file_1',
    change:function(info){
        info.files['simple.js'].content = info.files['simple.js'].content.replace('//USE_STRICT_MARK', '    "use spirit";');
    },
    expected:[
        { warning:'wrong_use_strict_spelling_in_file_1',params:['simple.js'] }
    ]
},{
    base:'stable-project-v0.1.4',
    title:'must accept strings in object definitions instead of generate "use strict" warning (#51)',
    test:'wrong_use_strict_spelling_in_file_1',
    change:function(info) {},
    expected:[]
},{
    base:'with-wrong-qa-control-version',
    test:'must-detect-GHA-issues',
    change:function(info) {},
    expected:[ 
        { warning: 'workflow_file_1_differs', params: [ 'build-and-test.yml' ] },
        { warning: 'lack_of_workflow_file_1', params: [ 'publish.yml' ] },
        { warning: 'workflow_file_1_differs', params: [ 'qa-control.yml' ] }
    ]
},{
    base:'stable-project-last-version',
    title:'check for last version (0.2.0 para #52)',
    change:function(info){},
    expected:[]
},{
    base:'stable-project-last-version',
    title:'must detect missing "files" section in package.json (#60)',
    test:'lack_of_files_section_in_package_json',
    change:function(info){
        delete info.packageJson.files;
    }
},{
    base:'stable-project-last-version',
    title:'must detect ivalid "files" section in package.json (#60)',
    test:'invalid_files_section_in_package_json',
    change:function(info){
        //info.packageJson.files.push('.gitignore');
        info.packageJson.files.push('noexiste');
    }
},{
    base:'stable-project-last-version',
    title:'must permit empty "files" section in package.json (#62)',
    change:function(info){
        info.packageJson.files = [];
    },
    expected:[]
},{
    base:'stable-project-last-version',
    title:'must permit "~2.0.0-beta3" style of version declarations (#64)',
    change:function(info){
        info.packageJson.dependencies['pug'] = "~2.0.0-beta3";
    },
    expected:[]
},{
    base:'stable-project-v0.3.0',
    title:'check for last version (0.3.0)',
    change:function(info){},
    expected:[]
},{
    base:'stable-project-v0.3.0',
    title:'must reject eslintConfig in package.json (#65)',
    test:'unexpected_eslintconfig_section_in_package_json',
    change:function(info){
        info.packageJson['eslintConfig'] = {};
    }
},{
    base:'stable-project-v0.3.0',
    title:'must reject all lint sections in package.json (#65)',
    change:function(info){
        info.packageJson['eslintConfig'] = {};
    },
    expected:[
        { warning: 'unexpected_eslintconfig_section_in_package_json'}
    ]
},{
    base:'stable-project-v0.3.0',
    title:'lack of mandatory lint files (#65)',
    change:function(info){
        delete info.files['.eslintrc.yml'];
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['.eslintrc.yml']},
        WARNING_CANT_CONTINUE
    ]
},{
    base:'stable-project-v0.3.0',
    title:'non-recomended dependency (#68)',
    change:function(info){
        info.packageJson.dependencies['lodash'] = "4.17.1";
    },
    expected:[
        { warning: 'non_recomended_dependency_1_in_package_json', params:['lodash']}
    ]
},{
    base:'stable-project-v0.3.0',
    title:'non-recomended devDependencies (#68)',
    change:function(info){
        info.packageJson.devDependencies['best-promise'] = "1.0.0";
        info.packageJson.devDependencies['promise-plus'] = "1.0.0";
        info.packageJson.devDependencies['lodash'] = "4.17.1";
    },
    expected:[
        { warning: 'non_recomended_dependency_1_in_package_json', params:['best-promise']},
        { warning: 'non_recomended_dependency_1_in_package_json', params:['lodash']},
        { warning: 'non_recomended_dependency_1_in_package_json', params:['promise-plus']},
    ]
},{
    base:'stable-project-v0.3.0',
    title:'non-recomended all dependencies (#68)',
    change:function(info){
        info.packageJson.devDependencies['best-promise'] = "1.0.0";
        info.packageJson.dependencies['promise-plus'] = "1.0.0";
    },
    expected:[
        { warning: 'non_recomended_dependency_1_in_package_json', params:['best-promise']},
        { warning: 'non_recomended_dependency_1_in_package_json', params:['promise-plus']}
    ]
},{
    base:'stable-project-v0.3.0',
    title:'must reject jslint as devDependency (bundled in qa-control)',
    change:function(info){
        info.packageJson.devDependencies['jslint'] = "^10.0.0";
    },
    expected:[
        { warning: 'non_recomended_dependency_1_in_package_json', params:['jslint']}
    ]
},{
    base:'stable-project',
    title:'forbidden cucarda outdated-deps',
    change:function(info){
        var badge = '[![outdated-deps](https://img.shields.io/david/codenautas/stable-project.svg)](https://david-dm.org/codenautas/stable-project)';
        info.files['LEEME.md'].content = info.files['LEEME.md'].content.replace(
            '<!-- cucardas -->\n',
            '<!-- cucardas -->\n'+badge+'\n'
        );
        info.files['README.md'].content = info.files['README.md'].content.replace(
            '[![npm-version]',
            badge+'\n'+'[![npm-version]'
        );
    },
    expected:[
        { warning:'forbidden_cucarda_1', params:['outdated-deps']}
    ]
},{
    base:'stable-project',
    title:'forbidden cucarda climate',
    change:function(info){
        var badge = '[![climate](https://api.codeclimate.com/v1/badges/codenautas/stable-project/maintainability)](https://codeclimate.com/github/codenautas/stable-project)';
        info.files['LEEME.md'].content = info.files['LEEME.md'].content.replace(
            '<!-- cucardas -->\n',
            '<!-- cucardas -->\n'+badge+'\n'
        );
        info.files['README.md'].content = info.files['README.md'].content.replace(
            '[![npm-version]',
            badge+'\n'+'[![npm-version]'
        );
    },
    expected:[
        { warning:'forbidden_cucarda_1', params:['climate']}
    ]
},{
    base:'stable-project-v0.3.0',
    title:'minimum profile skips linters and lint config files',
    change:function(info){
        info.packageJson['qa-control']['profile'] = 'minimum';
        delete info.files['.eslintrc.yml'];
    },
    expected:[]
},{
    base:'stable-project-v0.3.0',
    title:'multilang:no skips LEEME.md requirement and multilang checks',
    change:function(info){
        info.packageJson['qa-control']['multilang'] = 'no';
        delete info.files['LEEME.md'];
    },
    expected:[]
}];


function cloneProject(info){
    return JSON.parse(JSON.stringify(info));
}

describe('qa-control', function(){
    describe('load project', function(){
        it('waits for config already readed', function(){
            return qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                expect(qaControl.configReady).to.ok();
                expect(
                    qaControl.definition.firstLines['server']['lib']
                ).to.match(/^"use strict";/);
            });
        });
        it('loads ok', function(){
            var projDir = './test/fixtures/stable-project';
            return qaControl.loadProject(projDir).then(function(info){
                expect(Object.keys(info)).to.eql([
                    'projectDir',
                    'files',
                    'packageJson'
                ]);
                expect(info.projectDir).to.eql(projDir);
                expect(Object.keys(info.files)).to.eql(['.eslintrc.yml','.gitignore','.jshintrc','LEEME.md','LICENSE','README.md','appveyor.yml','package.json','simple.js','stable-project.js']);
                expect(info.files['package.json'].content).to.match(/^{\n  "name": "stable-project"/);
                expect(info.packageJson.name).to.be('stable-project');
                expect(info.packageJson["qa-control"]["run-in"]).to.eql("server");
                expect(info.packageJson["qa-control"]["test-appveyor"]).to.eql(true);
                expect(info.packageJson["qa-control"]["type"]).to.eql("lib");
                expect(info.packageJson["qa-control"]["coverage"]).to.eql(100);
                expect(info.files['LEEME.md'].content).to.match(/^<!--multilang v0 es:LEEME.md en:README.md -->/);
            });
        });
        it('generates english messages from spanish warnings', function(){
            return qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                var en=qaControl.msgs.en;
                var es=qaControl.msgs.es;
                expect(Object.keys(en).sort()).to.eql(Object.keys(es).sort());
                //console.log(qaControl.msgs.en);
                expect(en['deprecated_version']).to.be('deprecated version');
                expect(en['invalid_value_1_in_parameter_2']).to.be('invalid value $1 in parameter $2');
                expect(en['lack_of_mandatory_file_1']).to.be('lack of mandatory file $1');
                //expect(en['lack_of_mandatory_parameter']).to.be('lack of mandatory parameter');
                expect(en['lack_of_mandatory_section_1']).to.be('lack of mandatory section "$1" in qa-control section of package.json');
                expect(en['no_qa_control_section_in_codenautas_project']).to.be('no qa control section in codenautas project');
                expect(en['no_multilang_section_in_1']).to.be('no multilang section in $1');
                expect(en['no_package_json']).to.be('no package json');
                expect(en['no_qa_control_section_in_package_json']).to.be('no qa control section in package json');
                expect(en['lack_of_cucarda_marker_in_readme']).to.be('lack of cucarda marker in readme');
                expect(en['lack_of_mandatory_cucarda_1']).to.be('lack of mandatory cucarda $1');
                expect(en['wrong_format_in_cucarda_1']).to.be('wrong format in cucarda $1');
                expect(en['lack_of_mandatory_line_1_in_file_2']).to.be('lack of mandatory line $1 in file $2');
                expect(en['file_1_does_not_match_custom_2']).to.be('file $1 does not match custom $2');
                expect(en['first_lines_does_not_match_in_file_1']).to.be('first lines does not match in file $1');
                expect(en['repository_name_not_found']).to.be('packageJson.repository must be in format /{[-a-zA-Z0-9_.]+}\/[-a-zA-Z0-9_.]+/');
                expect(en['using_normal_promise_in_file_1']).to.be('using normal promise in file $1');
                expect(en['packagejson_main_file_1_does_not_exists']).to.be('packagejson main file $1 does not exists');
                expect(en['eslint_warnings_in_file_1']).to.be('eslint warnings in file $1');
                expect(en['readme_multilang_not_sincronized_with_file_1']).to.be('readme multilang not sincronized with file $1');
                expect(en['lack_of_repository_section_in_package_json']).to.be('lack of repository section in package json');
                expect(en['invalid_repository_section_in_package_json']).to.be('invalid repository section in package json');
                expect(en['repository_does_not_match_1']).to.be('repository does not match $1');
                expect(en['invalid_dependency_version_number_format_in_dep_1']).to.be('invalid dependency version number format in dep $1');
                expect(en['wrong_use_strict_spelling_in_file_1']).to.be('wrong use strict spelling in file $1');
                expect(en['non_recomended_dependency_1_in_package_json']).to.be('non recomended dependency $1 in package json');
            });
        });
    });
    describe('test qa-control by fixtures', function(){
        var perfectProjects={};
        fixtures.forEach(function(fixture){
            var fixtureName='fixture '+(fixture.title ? fixture.title :fixture.test)+(fixture.scoring ?' (S)':'');
            if(fixture.skipped){
                it.skip(fixtureName, function(){});
                return;
            }
            it(fixtureName,function(){
                return Promise.resolve().then(function(){
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
                    // qaControl.verbose = true;
                    var options = fixture.options ?? {}
                    return qaControl.controlInfo(clonedInfo, options);
                }).then(function(warnings){
                    if(!fixture.expected){
                        fixture.expected=[{warning: /** @type {string} */ (fixture.test)}];
                        if(fixture.expectedParams){
                            /** @type {any} */ (fixture.expected).params=fixture.expectedParams;
                        }
                    }
                    if(! fixture.notices) { stripNotices(warnings); }
                    if(! fixture.options?.scoring) { stripScoring(warnings); }
                    //qaControl.stringizeWarnings(warnings, 'es').then(function(warns) { console.log(warns); });
                    expect(warnings).to.eql(fixture.expected);
                }).then(function() {
                    return fs.unlink(Path.normalize(perfectProjects[fixture.base].projectDir+'/cucardas.log'));
                }).catch(function(err) {
                    if(err.code !== 'ENOENT') { throw err; }
                });
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
                expect(stripNotices(warns)).to.eql([]);
                done();
            }).catch(function(err) {
                console.log("mal", err);
                done(err);
            });
        });
        it('generate warnings but not exception when no exists package.json', function(){
            return qaControl.controlProject('./test/fixtures/without-package-json').then(function(warnings){
                expect(stripScoring(warnings)).to.eql([
                    {warning:'no_package_json'},
                    {warning:'no_qa_control_section_in_package_json'}
                ]);
            });
        });
       it('packageJson.main must default to index.js', function(){
            return qaControl.loadProject('./test/fixtures/stable-project-with-default-main').then(function(info){
                expect(info['files']).to.have.key('index.js');
                expect(info['files']['index.js'].content).to.contain('StableProject');
                return qaControl.controlInfo(info);
            }).then(function(warns){
                expect(stripNotices(warns)).to.eql([]);
            });
        });
       it('packageJson.main must gracefully fail if file does not exists (#37)', function(){
            return qaControl.loadProject('./test/fixtures/stable-project-with-inexistent-main').then(function(info){
                expect(info['files']).not.to.have.key('bin/nonexistent.js');
                return qaControl.controlInfo(info);
            }).then(function(warns){
                expect(stripScoring(stripNotices(warns))).to.eql([{warning:'packagejson_main_file_1_does_not_exists', params:['bin/nonexistent.js']}]);
            });
        });
    });
    describe('github_repository rule', function(){
        var stableInfo;
        before(function(){
            return qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                stableInfo = info;
            });
        });
        afterEach(function(){
            qaControl.repoIs = null;
        });
        it('skips check when repoIs is not set', function(){
            return qaControl.controlInfo(cloneProject(stableInfo)).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([]);
            });
        });
        it('passes when repoIs matches package.json repository', function(){
            qaControl.repoIs = 'codenautas/stable-project';
            return qaControl.controlInfo(cloneProject(stableInfo)).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([]);
            });
        });
        it('warns when repoIs does not match package.json repository', function(){
            qaControl.repoIs = 'codenautas/other-project';
            return qaControl.controlInfo(cloneProject(stableInfo)).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([
                    {warning:'repository_does_not_match_1', params:['codenautas/other-project']},
                    WARNING_CANT_CONTINUE
                ]);
            });
        });
    });
    describe('integrity tests', function(){
        it('verify that qa-control.js only uses existent warning IDs (#24)', function(){
            return fs.readFile('./bin/qa-control.js', {encoding: 'utf8'}).then(function(content) {
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
                                    console.log("Inexistent warning '"+warn+"' on line "+(ln+1));
                                    ++numWarns;
                                }
                            }
                            if(reIncompleteWarn.test(line)) {
                                console.log("Incomplete warning on line "+(ln+1));
                                ++numWarns;
                            }
                        }
                    }
                }
                if(numWarns) {
                    throw new Error('Tengo '+numWarns+' warnings');
                }
            });
        });
        function hasBOM(content) { return content.charCodeAt(0) === 0xFEFF; }
        it('verify that qa-control\'s core files don\'t have UTF-8 BOM (#33)', function(){
            var basePath='./bin';
            var filesWithBom = [];
            return fs.readdir(basePath).then(function(files) {
                return Promise.all(files.map(function(file){
                    var iFile = Path.normalize(basePath+'/'+file);
                    return Promise.resolve().then(function() {
                        return fs.stat(iFile);
                    }).then(function(stat) {
                        if(stat.isFile() /*&& iFile.match(/(.js)$/)*/) {
                            return fs.readFile(iFile, 'utf8').then(function(content){
                                if(hasBOM(content)) { filesWithBom.push(iFile); }
                            });
                        } else if(stat.isDirectory()) {
                            // solo leemos un nivel (si cambia hay que hacerlo recursivo)
                            return fs.readdir(iFile).then(function(files2) {
                                return Promise.all(files2.map(function(file2) {
                                    var sdFile = Path.normalize(iFile+'/'+file2);
                                    return fs.stat(sdFile).then(function(stat) {
                                        if(stat.isFile()) {
                                            return fs.readFile(sdFile, 'utf8').then(function(content) {
                                                if(hasBOM(content)) { filesWithBom.push(sdFile); }
                                            });
                                        }
                                    });
                                }));
                                
                            });
                        }
                    });                    
                })).then(function() {
                    if(filesWithBom.length) {
                        console.log("FILES with BOM", filesWithBom);
                        throw new Error("ERROR: Have core files with BOM!");
                    }
                });
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
                            return fs.exists(base+'/LEEME.md');
                        }).then(function(readme) {
                            var project = qaControl.definition;
                            var cucardas = qaControl.definition.cucardas;
                            var check = project.rules.cucardas['checks'][0].warnings;
                            if(cucardasOut) {
                                var cucaContent = qaControl.generateCucardas(cucardas,packageJson);
                                // fs.writeFileSync('./'+file+'_cucardas.out', qaControl.fixEOL(cucardasOut));
                                // fs.writeFileSync('./'+file+'_cucardas.log', qaControl.fixEOL(cucaContent));
                                expect(qaControl.fixEOL(cucardasOut)).to.eql(qaControl.fixEOL(cucaContent));
                            }
                            if(warnings) {
                                return qaControl.loadProject(base).then(function(info) {
                                    //console.log("info", info);
                                    return check(info);
                                }).then(function(warns) {
                                    expect(stripScoring(stripNotices(warns))).to.eql(warnings);
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
                params.push('param'+(p+1));
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
                expect(warnStr).to.eql('la version es demasiado vieja\n'
                                      +'valor invalido "param1" para el parametro "param2" en la sección qa-control\n'
                                      +'falta el archivo obligatorio "param1"\n'
                                      +'falta la sección obligatoria "param1" en la sección qa-control\n'
                                      +'falta la sección "qa-control" en package.json y aparenta ser un proyecto codenautas\n'
                                      +'falta la sección multilang en el archivo param1\n'
                                      +'falta el archivo package.json\n'
                                      +'falta la sección qa-control en package.json\n'
                                      +'falta la sección "cucardas" en README.md\n'
                                      +'falta la cucarda oblicatoria param1\n'
                                      +'la cucarda "param1" tiene formato incorrecto\n'
                                      +'la cucarda "param1" no debe usarse en README.md\n'
                                      +'falta la linea obligatoria param1 en el archivo param2\n'
                                      +'param1 no respeta la custombre param2\n'
                                      +'las primeras líneas no coinciden en param1\n'
                                      +'packageJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}/[-a-zA-Z0-9_.]+/\n'
                                      +'se han usado Promise(s) normales en "param1"\n'
                                      +'no existe el archivo "main" (param1) declarado en package.json\n'
                                      +'el archivo "param1" tiene warnings de ESLint\n'
                                      +'README.md no esta sincronizado con "param1" para multilang\n'
                                      +'Falta la sección "repository" en package.json\n'
                                      +'La sección "repository" en package.json es inválida\n'
                                      +'el repositorio no coincide con el esperado "param1"\n'
                                      +'El formato del numero de version es incorrecto en "param1"\n'
                                      +'"use strict" está mal escrito en "param1"\n'
                                      +'Falta la sección "files" en package.json\n'
                                      +'La sección "files" en package.json es inválida\n'
                                      +'Las versiones de ECMAScript utilizadas en package.json son incorrectas\n'
                                      +'Dependencia no recomendada "param1" en package.json\n'
                                      +'falta el archivo de workflow "param1"\n'
                                      +'el archivo de workflow "param1" difiere del template de qa-control\n'
                                      +'qa-control debe estar en devDependencies con la misma versión que qa-control.package-version\n'
                                      +'La versión de qa-control en devDependencies es "param1" pero se esperaba "param2"\n'
                                      +'¡Qué --bail(e)! Podrían haber más problemas, correr de nuevo después de corregir estos\n');
                done();
            }).catch(done);
        });
        it('stringize warnings in lang "en"', function(done){
            qaControl.fixMessages(qaControl.msgs.en).then(function(){
                //console.log(qaControl.msgs.en);
                return qaControl.stringizeWarnings(generateWarningsArray('en'), 'en');
            }).then(function(warnStr){
                //console.log(warnStr);
                expect(warnStr).to.eql('lack of mandatory section "param1" in qa-control section of package.json\n'
                                       +'packageJson.repository must be in format /{[-a-zA-Z0-9_.]+}/[-a-zA-Z0-9_.]+/\n'
                                       +'qa-control must be in devDependencies with the same version as qa-control.package-version\n'
                                       +'qa-control version in devDependencies is "param1" but expected "param2"\n'
                                       +'--bail(ing)! There could be more issues\n' // TODO: esto debería estar abajo
                                       +'deprecated version\n'
                                       +'invalid value param1 in parameter param2\n'
                                       +'lack of mandatory file param1\n'
                                       +'no qa control section in codenautas project\n'
                                       +'no multilang section in param1\n'
                                       +'no package json\n'
                                       +'no qa control section in package json\n'
                                       +'lack of cucarda marker in readme\n'
                                       +'lack of mandatory cucarda param1\n'
                                       +'wrong format in cucarda param1\n'
                                       +'forbidden cucarda param1\n'
                                       +'lack of mandatory line param1 in file param2\n'
                                       +'file param1 does not match custom param2\n'
                                       +'first lines does not match in file param1\n'
                                       +'using normal promise in file param1\n'
                                       +'packagejson main file param1 does not exists\n'
                                       +'eslint warnings in file param1\n'
                                       +'readme multilang not sincronized with file param1\n'
                                       +'lack of repository section in package json\n'
                                       +'invalid repository section in package json\n'
                                       +'repository does not match param1\n'
                                       +'invalid dependency version number format in dep param1\n'
                                       +'wrong use strict spelling in file param1\n'
                                       +'lack of files section in package json\n'
                                       +'invalid files section in package json\n'
                                       +'incorrect ecmascript versions in package json\n'
                                       +'non recomended dependency param1 in package json\n'
                                       +'lack of workflow file param1\n'
                                       +'workflow file param1 differs\n');
                done();
            }).catch(done);
        });
    });
});