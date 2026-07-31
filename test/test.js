"use strict";

var expect = require('expect.js');
var qaControl = require('..');
var fs = require('fs-extra');
var Path = require('path');
var yaml = require('js-yaml');
var OS = require('os');
var qaControlPackageJson = require('../package.json');

function stripScoring(warnArray) {
    for(var w=0; w<warnArray.length; ++w) {
        if('scoring' in warnArray[w]) {
            delete warnArray[w]['scoring'];
        }
    }
    return warnArray;
}

function stripNotices(warnArray) {
    for(var w=0; w<warnArray.length; ++w) {
        if('scoring' in warnArray[w]) {
            if('notice' in warnArray[w]['scoring']) {
                warnArray.splice(w, 1);
            }
        }
    }
    return warnArray;
}

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
    test:'invalid_value_1_in_parameter_2_valid_values_3',
    change:function(info){
        info.packageJson['qa-control']['run-in']='invalid-run-in-for-test';
    },
    expected:[
        {
            warning:'invalid_value_1_in_parameter_2_valid_values_3',
            params:['invalid-run-in-for-test','run-in','server, both, client']
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
    title:'missing applicable cucardas in README.md create warnings (#8)',
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
        { warning:'lack_of_mandatory_cucarda_1',params:['windows']},
        { warning:'lack_of_mandatory_cucarda_1',params:['coverage']},
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
    title:'appveyor.yml must match qa-control template',
    test:'appveyor_yml_differs',
    change:function(info){
        info.files['appveyor.yml'].content = info.files['appveyor.yml'].content + '\n# linea que difiere del template\n';
    },
    expected:[
        { warning:'appveyor_yml_differs' }
    ]
},{
    base:'stable-project',
    title:'appveyor.yml with before_test must validate only the part above',
    test:'appveyor_yml_differs',
    change:function(info){
        info.files['appveyor.yml'].content = info.files['appveyor.yml'].content + '\nbefore_test:\n  - echo hola\n';
    },
    expected:[]
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
        delete info.files['eslint.config.js'];
    },
    expected:[
        { warning:'lack_of_mandatory_file_1',params:['eslint.config.cjs']},
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
            '<!-- cucardas -->'+OS.EOL,
            '<!-- cucardas -->'+OS.EOL+badge+'\n'
        );
        info.files['README.md'].content = info.files['README.md'].content.replace(
            '[![npm-version]',
            badge+OS.EOL+'[![npm-version]'
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
            '<!-- cucardas -->'+OS.EOL,
            '<!-- cucardas -->'+OS.EOL+badge+OS.EOL
        );
        info.files['README.md'].content = info.files['README.md'].content.replace(
            '[![npm-version]',
            badge+OS.EOL+'[![npm-version]'
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
        delete info.files['eslint.config.js'];
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
                expect(Object.keys(info.files)).to.eql(['.gitignore','.jshintrc','LEEME.md','LICENSE','README.md','appveyor.yml','eslint.config.js','package.json','simple.js','stable-project.js']);
                expect(info.files['package.json'].content).to.match(/^{\r?\n\s\s"name": "stable-project"/);
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
                expect(en['invalid_value_1_in_parameter_2_valid_values_3']).to.be('invalid value $1 in parameter $2 valid values $3');
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
                        }).catch(function() {
                            return false;
                        }).then(function(o){
                            warnings=o;
                            return fs.exists(base+'/cucardas.out');
                        }).catch(function() {
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
                                      +'valor invalido "param1" para el parametro "param2" en la sección qa-control. Valores válidos: param3\n'
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
                                      +'el bloque de cucardas difiere del esperado (orden, líneas sobrantes o formato)\n'
                                      +'falta la linea obligatoria param1 en el archivo param2\n'
                                      +'param1 no respeta la custombre param2\n'
                                      +'packageJson.repository no tiene el formato /{[-a-zA-Z0-9_.]+}/[-a-zA-Z0-9_.]+/\n'
                                      +'se han usado Promise(s) normales en "param1"\n'
                                      +'no existe el archivo "main" (param1) declarado en package.json\n'
                                      +'el archivo "param1" tiene warnings de ESLint\n'
                                      +'no se pudo correr ESLint, verifique la extensión del archivo de configuración\n'
                                      +'README.md no esta sincronizado con "param1" para multilang\n'
                                      +'Falta la sección "repository" en package.json\n'
                                      +'La sección "repository" en package.json es inválida\n'
                                      +'el repositorio no coincide con el esperado "param1"\n'
                                      +'El formato del numero de version es incorrecto en "param1"\n'
                                      +'"use strict" está mal escrito en "param1"\n'
                                      +'Falta la sección "files" en package.json\n'
                                      +'La sección "files" en package.json es inválida\n'
                                      +'El archivo "param1" en la sección "files" de package.json es un archivo .dot\n'
                                      +'Las versiones de ECMAScript utilizadas en package.json son incorrectas\n'
                                      +'Dependencia no recomendada "param1" en package.json\n'
                                      +'falta el archivo de workflow "param1"\n'
                                      +'el archivo de workflow "param1" difiere del template de qa-control\n'
                                      +'el archivo appveyor.yml difiere del template de qa-control\n'
                                      +'qa-control debe estar en devDependencies con la misma versión que qa-control.package-version\n'
                                      +'La versión de qa-control en devDependencies es "param1" pero se esperaba "param2"\n'
                                      +'Falta el script "test-ci" en package.json\n'
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
                                       +'lack of test-ci script in package.json\n'
                                       +'could not run ESLint, check the configuration file extension\n'
                                       +'--bail(ing)! There could be more issues\n' // TODO: esto debería estar abajo
                                       +'deprecated version\n'
                                       +'invalid value param1 in parameter param2 valid values param3\n'
                                       +'lack of mandatory file param1\n'
                                       +'no qa control section in codenautas project\n'
                                       +'no multilang section in param1\n'
                                       +'no package json\n'
                                       +'no qa control section in package json\n'
                                       +'lack of cucarda marker in readme\n'
                                       +'lack of mandatory cucarda param1\n'
                                       +'wrong format in cucarda param1\n'
                                       +'forbidden cucarda param1\n'
                                       +'cucardas block differs\n'
                                       +'lack of mandatory line param1 in file param2\n'
                                       +'file param1 does not match custom param2\n'
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
                                       +'dot file param1 in files section\n'
                                       +'incorrect ecmascript versions in package json\n'
                                       +'non recomended dependency param1 in package json\n'
                                       +'lack of workflow file param1\n'
                                       +'workflow file param1 differs\n'
                                       +'appveyor yml differs\n');
                done();
            }).catch(done);
        });
    });
});

describe('qa-control --fix', function(){
    var qaWorkflowsDir = Path.join(__dirname, '../.github/workflows');
    // Las carpetas/archivos de prueba cuelgan de la raíz prefijados con "local-"
    // (ignorados por .gitignore). No se borran en afterEach: si un test falla,
    // queda lo generado para poder inspeccionarlo.
    var localBase = Path.join(__dirname, '..', 'local-test-fix-mode');
    describe('compareOrFixContent (without fix mode)', function(){
        var noWritePath = Path.join(localBase, 'must-not-be-written.txt');
        beforeEach(function(){
            qaControl.fixMode = false;
            qaControl.verbose = false;
            fs.ensureDirSync(localBase);
            fs.removeSync(noWritePath);
        });
        it('returns true when obtained and expected are equal', function(){
            expect(qaControl.compareOrFixContent('hello\n', 'hello\n', noWritePath, 'eq')).to.be(true);
            expect(fs.existsSync(noWritePath)).to.be(false);
        });
        it('returns true when they differ only in EOL', function(){
            expect(qaControl.compareOrFixContent('a\r\nb\r\n', 'a\nb\n', noWritePath, 'eol')).to.be(true);
            expect(fs.existsSync(noWritePath)).to.be(false);
        });
        it('returns false and does not write when content differs', function(){
            expect(qaControl.compareOrFixContent('obtained content', 'expected content', noWritePath, 'diff')).to.be(false);
            expect(fs.existsSync(noWritePath)).to.be(false);
        });
    });
    describe('controlProject in fix mode', function(){
        var tempDir;
        function prepare(name){
            tempDir = Path.join(localBase, name);
            fs.removeSync(tempDir);
            fs.copySync(Path.join(__dirname, 'fixtures', 'with-wrong-qa-control-version'), tempDir);
        }
        afterEach(function(){
            qaControl.fixMode = false;
        });
        function sameAsTemplate(fileName){
            var projContent = fs.readFileSync(Path.join(tempDir, '.github/workflows', fileName), 'utf8');
            var qaContent = fs.readFileSync(Path.join(qaWorkflowsDir, fileName), 'utf8');
            return qaControl.fixEOL(projContent) === qaControl.fixEOL(qaContent);
        }
        it('fixes differing workflow files and creates missing ones', function(){
            prepare('fixes-differing-and-missing');
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                expect(sameAsTemplate('build-and-test.yml')).to.be(true);
                expect(sameAsTemplate('qa-control.yml')).to.be(true);
                expect(fs.existsSync(Path.join(tempDir, '.github/workflows/publish.yml'))).to.be(true);
                expect(sameAsTemplate('publish.yml')).to.be(true);
            });
        });
        it('leaves no workflow warnings after fixing', function(){
            prepare('no-warnings-after-fix');
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                return qaControl.controlProject(tempDir, {});
            }).then(function(warnings){
                var workflowWarnings = warnings.filter(function(w){
                    return w.warning === 'workflow_file_1_differs' || w.warning === 'lack_of_workflow_file_1';
                });
                expect(workflowWarnings).to.eql([]);
            });
        });
        it('fixes a broken cucarda in the main doc and syncs README in the same run', function(){
            prepare('fixes-cucardas');
            var leemePath = Path.join(tempDir, 'LEEME.md');
            var readmePath = Path.join(tempDir, 'README.md');
            // rompo el formato de la cucarda npm-version solo en el documento principal
            var broken = fs.readFileSync(leemePath, 'utf8').replace('npm/v/stable-project.svg', 'npm/v/stable-project-BROKEN.svg');
            fs.writeFileSync(leemePath, broken, 'utf8');
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                // la regla cucardas corrige LEEME.md antes de que multilang regenere README.md
                expect(fs.readFileSync(leemePath, 'utf8')).to.contain('npm/v/stable-project.svg');
                expect(fs.readFileSync(leemePath, 'utf8')).to.not.contain('BROKEN');
                expect(fs.readFileSync(readmePath, 'utf8')).to.contain('npm/v/stable-project.svg');
                expect(fs.readFileSync(readmePath, 'utf8')).to.not.contain('BROKEN');
                return qaControl.controlProject(tempDir, {});
            }).then(function(warnings){
                var cucardaWarnings = warnings.filter(function(w){
                    return w.warning === 'wrong_format_in_cucarda_1' ||
                        w.warning === 'lack_of_mandatory_cucarda_1' ||
                        w.warning === 'forbidden_cucarda_1' ||
                        w.warning === 'lack_of_cucarda_marker_in_readme';
                });
                expect(cucardaWarnings).to.eql([]);
            });
        });
        it('fixes appveyor.yml preserving the before_test section', function(){
            prepare('fixes-appveyor-before-test');
            var appveyorPath = Path.join(tempDir, 'appveyor.yml');
            var qaAppveyor = fs.readFileSync(Path.join(__dirname, '..', 'appveyor.yml'), 'utf8');
            // rompo la parte de arriba y agrego un before_test que debe preservarse
            var broken = qaAppveyor.replace('build: off', 'build: on') + '\nbefore_test:\n  - echo hola\n';
            fs.writeFileSync(appveyorPath, broken, 'utf8');
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                var fixed = fs.readFileSync(appveyorPath, 'utf8');
                var match = /^before_test\s*:/m.exec(fixed);
                expect(match).to.not.be(null);
                var above = fixed.slice(0, match.index);
                expect(qaControl.fixEOL(above)).to.eql(qaControl.fixEOL(qaAppveyor));
                expect(fixed).to.contain('echo hola');
            });
        });
        it('creates appveyor.yml from the qa-control template when missing', function(){
            prepare('creates-appveyor');
            fs.removeSync(Path.join(tempDir, 'appveyor.yml'));
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                var created = fs.readFileSync(Path.join(tempDir, 'appveyor.yml'), 'utf8');
                var qaAppveyor = fs.readFileSync(Path.join(__dirname, '..', 'appveyor.yml'), 'utf8');
                expect(qaControl.fixEOL(created)).to.eql(qaControl.fixEOL(qaAppveyor));
                return qaControl.controlProject(tempDir, {});
            }).then(function(warnings){
                var appveyorWarnings = warnings.filter(function(w){
                    return w.warning === 'appveyor_yml_differs' ||
                        w.warning === 'lack_of_mandatory_file_1' && w.params && w.params[0] === 'appveyor.yml';
                });
                expect(appveyorWarnings).to.eql([]);
            });
        });
        it('creates eslint.config.cjs from the qa-control template when missing', function(){
            prepare('creates-eslint-config');
            fs.removeSync(Path.join(tempDir, 'eslint.config.js'));
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                var created = fs.readFileSync(Path.join(tempDir, 'eslint.config.cjs'), 'utf8');
                var qaTemplate = fs.readFileSync(Path.join(__dirname, '..', 'bin/init-template/eslint.config.cjs'), 'utf8');
                expect(qaControl.fixEOL(created)).to.eql(qaControl.fixEOL(qaTemplate));
                return qaControl.controlProject(tempDir, {});
            }).then(function(warnings){
                var lintConfigWarnings = warnings.filter(function(w){
                    return w.warning === 'lack_of_mandatory_file_1' && w.params && w.params[0] === 'eslint.config.js';
                });
                expect(lintConfigWarnings).to.eql([]);
            });
        });
    });
});

describe('qa-control coverage (group A)', function(){
    describe('main()', function(){
        var realWrite;
        beforeEach(function(){
            realWrite = process.stdout.write;
            process.stdout.write = function(){ return true; };
        });
        afterEach(function(){
            process.stdout.write = realWrite;
        });
        it('lists available languages with listLangs', function(){
            var captured = '';
            process.stdout.write = function(chunk){ captured += chunk; return true; };
            return qaControl.main({listLangs:true}).then(function(){
                process.stdout.write = realWrite;
                expect(captured).to.match(/\ben\b/);
                expect(captured).to.match(/\bes\b/);
            });
        });
        it('controls a project and returns the warnings string', function(){
            return qaControl.main({projectDir:'test/fixtures/stable-project-last-version'}).then(function(warnString){
                process.stdout.write = realWrite;
                expect(warnString).to.eql('');
            }).then(function(){
                return fs.unlink('test/fixtures/stable-project-last-version/cucardas.log').catch(function(err){
                    if(err.code !== 'ENOENT') { throw err; }
                });
            });
        });
    });
    describe('rule: files_in_package_json', function(){
        it('reports an invalid files section covering its different reasons', function(){
            var check = qaControl.definition.rules.files_in_package_json.checks[0].warnings;
            var info = /** @type {any} */ ({
                projectDir: 'test/fixtures/stable-project-last-version',
                files: {},
                packageJson: { files: ['package.json', '.gitignore', 'simple.js', 'nonexistent.txt'] }
            });
            expect(stripScoring(check(info))).to.eql([
                {warning:'dot_file_1_in_files_section', params:['.gitignore']},
                {warning:'invalid_files_section_in_package_json'}
            ]);
        });
    });
    describe('rule: qa_control_dev_dependency', function(){
        var check = qaControl.definition.rules.qa_control_dev_dependency.checks[0].warnings;
        /* eslint-disable-next-line global-require */
        var toolVersion = require('../package.json').version;
        it('warns when qa-control is missing in devDependencies', function(){
            var info = /** @type {any} */ ({ packageJson: { 'qa-control': { gha:'ci' }, devDependencies: {} } });
            expect(stripScoring(check(info))).to.eql([{warning:'lack_of_qa_control_in_dev_dependencies'}]);
        });
        it('warns when the qa-control devDependency version does not match', function(){
            var info = /** @type {any} */ ({ packageJson: { 'qa-control': { gha:'ci' }, devDependencies: { 'qa-control':'0.0.1' } } });
            expect(stripScoring(check(info))).to.eql([
                {warning:'qa_control_version_mismatch_in_dev_dependencies_1_expected_2', params:['0.0.1', '^'+toolVersion]}
            ]);
        });
        it('accepts a matching qa-control devDependency version', function(){
            var info = /** @type {any} */ ({ packageJson: { 'qa-control': { gha:'ci' }, devDependencies: { 'qa-control':'^'+toolVersion } } });
            expect(stripScoring(check(info))).to.eql([]);
        });
    });
    describe('rule: use_strict', function(){
        it('skips js files without loaded content', function(){
            var check = qaControl.definition.rules.use_strict.checks[0].warnings;
            var info = /** @type {any} */ ({ files: { 'x.js': {} } });
            expect(check(info)).to.eql([]);
        });
    });
    describe('generateCucardas', function(){
        it('generates cucardas for a prerelease (beta) version', function(){
            var packageJson = {
                name: 'qa-control',
                version: '1.0.0-beta.1',
                repository: 'codenautas/qa-control',
                'qa-control': {}
            };
            var out = qaControl.generateCucardas(qaControl.definition.cucardas, packageJson);
            expect(out).to.be.a('string');
            expect(out.length > 0).to.be(true);
        });
    });
});

describe('qa-control coverage (group B: verbose branches)', function(){
    var realLog, realErr, realWrite;
    beforeEach(function(){
        qaControl.verbose = true;
        qaControl.fixMode = false;
        realLog = console.log;
        realErr = console.error;
        realWrite = process.stdout.write;
        console.log = function(){};
        console.error = function(){};
        process.stdout.write = function(){ return true; };
    });
    afterEach(function(){
        console.log = realLog;
        console.error = realErr;
        process.stdout.write = realWrite;
        qaControl.verbose = false;
    });
    it('stringizeWarnings prefixes WARNING in verbose mode', function(){
        return qaControl.stringizeWarnings([{warning:'no_package_json'}], 'en').then(function(str){
            expect(str.indexOf('WARNING: ')).to.be(0);
        });
    });
    it('compareOrFixContent dumps obtained/expected files in verbose mode', function(){
        var id = 'group-b-verbose-dump';
        fs.removeSync('local-'+id+'.obtained.txt');
        fs.removeSync('local-'+id+'.expected.txt');
        var result = qaControl.compareOrFixContent('aaa', 'bbb', null, id, 'msg');
        expect(result).to.be(false);
        expect(fs.existsSync('local-'+id+'.obtained.txt')).to.be(true);
        expect(fs.existsSync('local-'+id+'.expected.txt')).to.be(true);
    });
    it('use_strict logs violation details in verbose mode', function(){
        var check = qaControl.definition.rules.use_strict.checks[0].warnings;
        var info = /** @type {any} */ ({ files: { 'a.js': { content: 'function f() {\n    "use spirit";\n}\n' } } });
        expect(stripScoring(check(info))).to.eql([{warning:'wrong_use_strict_spelling_in_file_1', params:['a.js']}]);
    });
    it('files_in_package_json logs invalid detail in verbose mode', function(){
        var check = qaControl.definition.rules.files_in_package_json.checks[0].warnings;
        var info = /** @type {any} */ ({ projectDir:'test/fixtures/stable-project-last-version', files:{}, packageJson:{ files:['nonexistent.txt'] } });
        expect(stripScoring(check(info))).to.eql([{warning:'invalid_files_section_in_package_json'}]);
    });
    it('eslint logs details in verbose mode', function(){
        var check = qaControl.definition.rules.eslint.checks[0].warnings;
        return qaControl.loadProject('test/fixtures/eslint-real-check').then(function(info){
            return check(info);
        }).then(function(warns){
            warns = stripScoring(warns);
            var hasEslint = warns.some(function(w){ return w.warning==='eslint_warnings_in_file_1' && w.params[0]==='with-warning.js'; });
            expect(hasEslint).to.be(true);
        });
    });
});

describe('qa-control eslint rule (real ESLint runs)', function(){
    it('reports the same warnings a real ESLint run would report', function(){
        var check = qaControl.definition.rules.eslint.checks[0].warnings;
        return qaControl.loadProject('test/fixtures/eslint-real-check').then(function(info){
            return check(info);
        }).then(function(warns){
            expect(stripScoring(warns)).to.eql([
                {warning:'eslint_warnings_in_file_1', params:['with-warning.js']}
            ]);
        });
    });
    it('does not warn about files without ESLint issues', function(){
        var check = qaControl.definition.rules.eslint.checks[0].warnings;
        return qaControl.loadProject('test/fixtures/stable-project').then(function(info){
            return check(info);
        }).then(function(warns){
            expect(stripScoring(warns)).to.eql([]);
        });
    });
    it('skips linting entirely under the minimum profile', function(){
        var check = qaControl.definition.rules.eslint.checks[0].warnings;
        return qaControl.loadProject('test/fixtures/eslint-real-check').then(function(info){
            info.packageJson['qa-control'].profile = 'minimum';
            return check(info);
        }).then(function(warns){
            expect(stripScoring(warns)).to.eql([]);
        });
    });
});

describe('qa-control --codes and --silence-all', function(){
    var localBase = Path.join(__dirname, '..', 'local-test-fix-mode');
    function prepare(name, base){
        var tempDir = Path.join(localBase, name);
        fs.removeSync(tempDir);
        fs.copySync(Path.join(__dirname, 'fixtures', base), tempDir);
        return tempDir;
    }
    describe('--codes', function(){
        afterEach(function(){ qaControl.codes = false; });
        it('prefixes each warning with its internal code', function(){
            qaControl.codes = true;
            qaControl.verbose = false;
            return qaControl.stringizeWarnings([
                {warning:'no_package_json'},
                {warning:'lack_of_mandatory_file_1', params:['LICENSE']}
            ], 'es').then(function(str){
                expect(str).to.eql(
                    'no_package_json: falta el archivo package.json\n'+
                    'lack_of_mandatory_file_1: falta el archivo obligatorio "LICENSE"\n'
                );
            });
        });
        it('does not prefix codes when the flag is off', function(){
            qaControl.codes = false;
            qaControl.verbose = false;
            return qaControl.stringizeWarnings([{warning:'no_package_json'}], 'es').then(function(str){
                expect(str).to.eql('falta el archivo package.json\n');
            });
        });
    });
    describe('a silenced warning does not trigger cant_continue (#root-fix)', function(){
        it('continues past an early warning when it is silenced and reaches later rules', function(){
            return qaControl.loadProject('test/fixtures/stable-project-v0.3.0').then(function(info){
                var clone = cloneProject(info);
                delete clone.files['LICENSE'];                        // warning temprano
                clone.packageJson.dependencies['lodash'] = '4.17.1';  // warning tardío
                clone.packageJson['qa-control'].silenced = ['lack_of_mandatory_file_1'];
                return qaControl.controlInfo(clone);
            }).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([
                    {warning:'non_recomended_dependency_1_in_package_json', params:['lodash']}
                ]);
            });
        });
        it('still aborts with cant_continue when the early warning is active', function(){
            return qaControl.loadProject('test/fixtures/stable-project-v0.3.0').then(function(info){
                var clone = cloneProject(info);
                delete clone.files['LICENSE'];
                clone.packageJson.dependencies['lodash'] = '4.17.1';
                return qaControl.controlInfo(clone);
            }).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([
                    {warning:'lack_of_mandatory_file_1', params:['LICENSE']},
                    WARNING_CANT_CONTINUE
                ]);
            });
        });
    });
    describe('cucardas when repo name differs from package name (#cucardas)', function(){
        it('flags only the repo-name badges when invalid_repository is silenced (no eclipsing)', function(){
            return qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                var clone = cloneProject(info);
                clone.packageJson.repository = 'codenautas/otro-nombre';      // repo-name != name (a propósito)
                clone.packageJson['qa-control'].silenced = ['invalid_repository_section_in_package_json'];
                return qaControl.controlInfo(clone);
            }).then(function(warns){
                // las cucardas de github/coveralls/appveyor usan el repo-name y quedan mal;
                // las de npm (npm-version, downloads, security) usan el name y siguen bien
                expect(stripNotices(stripScoring(warns))).to.eql([
                    {warning:'wrong_format_in_cucarda_1', params:['linux']},
                    {warning:'wrong_format_in_cucarda_1', params:['windows']},
                    {warning:'wrong_format_in_cucarda_1', params:['coverage']},
                    {warning:'wrong_format_in_cucarda_1', params:['qa-control']}
                ]);
            });
        });
        it('eclipses cucardas when invalid_repository is active', function(){
            return qaControl.loadProject('./test/fixtures/stable-project').then(function(info){
                var clone = cloneProject(info);
                clone.packageJson.repository = 'codenautas/otro-nombre';
                return qaControl.controlInfo(clone);
            }).then(function(warns){
                expect(stripNotices(stripScoring(warns))).to.eql([
                    {warning:'invalid_repository_section_in_package_json'},
                    WARNING_CANT_CONTINUE
                ]);
            });
        });
    });
    describe('--silence-all', function(){
        it('adds active warning codes to qa-control.silenced creating the array', function(){
            var tempDir = prepare('silence-all-lodash', 'stable-project-v0.3.0');
            var pkgPath = Path.join(tempDir, 'package.json');
            var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.dependencies['lodash'] = '4.17.1';
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
            return qaControl.controlProject(tempDir, {silenceAll:true}).then(function(){
                var after = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                expect(after['qa-control'].silenced).to.eql(['non_recomended_dependency_1_in_package_json']);
                // una corrida normal posterior ya no debe reportar el warning silenciado
                return qaControl.controlProject(tempDir, {});
            }).then(function(warns){
                var remaining = warns.filter(function(w){ return w.warning === 'non_recomended_dependency_1_in_package_json'; });
                expect(remaining).to.eql([]);
            });
        });
        it('excludes the cant_continue and bailing meta warnings', function(){
            var tempDir = prepare('silence-all-meta', 'stable-project-v0.3.0');
            fs.removeSync(Path.join(tempDir, 'LICENSE'));
            return qaControl.controlProject(tempDir, {silenceAll:true}).then(function(){
                var silenced = JSON.parse(fs.readFileSync(Path.join(tempDir, 'package.json'), 'utf8'))['qa-control'].silenced || [];
                expect(silenced).to.contain('lack_of_mandatory_file_1');
                expect(silenced.indexOf('cant_continue')).to.be(-1);
                expect(silenced.indexOf('bailing_could_be_more')).to.be(-1);
            });
        });
    });
    describe('--fix adds the qa-control section', function(){
        function prepareWithoutSection(name){
            var tempDir = prepare(name, 'stable-project-v0.3.0');
            var pkgPath = Path.join(tempDir, 'package.json');
            var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            delete pkg['qa-control'];
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
            return tempDir;
        }
        it('creates the section with the mandatory defaults', function(){
            var tempDir = prepareWithoutSection('fixes-missing-qa-control-section');
            var pkgPath = Path.join(tempDir, 'package.json');
            return qaControl.controlProject(tempDir, {fix:true}).then(function(){
                var qac = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))['qa-control'];
                expect(qac['run-in']).to.eql('server');
                expect(qac.type).to.eql('lib');
                expect(qac['package-version']).to.eql(qaControlPackageJson.version);
            });
        });
        it('does not abort anymore, so later rules are reached', function(){
            var tempDir = prepareWithoutSection('fixes-section-reaches-later-rules');
            fs.removeSync(Path.join(tempDir, 'LICENSE'));
            return qaControl.controlProject(tempDir, {fix:true}).then(function(warns){
                var codes = warns.map(function(w){ return w.warning; });
                expect(codes.indexOf('no_qa_control_section_in_codenautas_project')).to.be(-1);
                expect(codes).to.contain('lack_of_mandatory_file_1');
            });
        });
        it('keeps reporting the warning when --fix is off', function(){
            var tempDir = prepareWithoutSection('reports-missing-qa-control-section');
            var pkgPath = Path.join(tempDir, 'package.json');
            var before = fs.readFileSync(pkgPath, 'utf8');
            return qaControl.controlProject(tempDir, {}).then(function(warns){
                var codes = warns.map(function(w){ return w.warning; });
                // el fixture menciona a codenautas, por eso la variante del warning
                expect(codes).to.contain('no_qa_control_section_in_codenautas_project');
                expect(fs.readFileSync(pkgPath, 'utf8')).to.eql(before);
            });
        });
    });
});
