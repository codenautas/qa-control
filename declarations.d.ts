// fs-promise es un paquete legacy con declaraciones de TypeScript incompletas
declare module 'fs-extra';

interface Warning {
    warning: string;
    params?: string[];
    scoring?: Record<string, number>;
}

interface FileInfo {
    content?: string;
}

interface QAControlSection {
    purpose?: string;
    'test-appveyor'?: boolean;
    'run-in'?: string;
    type?: string;
    'package-version'?: string;
    coverage?: number;
    silenced?: string[];
    profile?: 'minimum'|'default';
    multilang?: string;
    gha?: 'skip'|'all'
}

interface PackageJson {
    name: string;
    version: string;
    main?: string;
    repository?: string | { url: string };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    files?: string[];
    'qa-control'?: QAControlSection;
    jshintConfig?: Record<string, unknown>;
    eslintConfig?: Record<string, unknown>;
    scripts?: Record<string, string>;
}

interface ProjectInfo {
    projectDir: string;
    files: Record<string, FileInfo>;
    packageJson: PackageJson;
    scoring?: boolean;
    couldBail?: boolean;
    warningCount?: number;
}

interface QAOptions{
    scoring?: boolean
    bail?: boolean
}

interface QACheck {
    warnings: (info: ProjectInfo) => Warning[] | Promise<Warning[]>;
}

interface QARule {
    checks: QACheck[];
    couldBail?: boolean;
    eclipsers?: string[];
    mandatory?: boolean;
    mustAbort?: true;
}

interface QAFile {
    mandatory?: boolean;
    mandatoryLines?: string[];
    presentIf?: (packageJson: PackageJson) => boolean;
    group?: string;
    /** true: se copia desde bin/init-template/<nombre del archivo>. string: ruta del template relativa a la raíz de qa-control. */
    fixTemplate?: boolean|string;
}

interface QASection {
    mandatory?: boolean;
    values: Record<string, object>;
}

interface QACucarda {
    mandatory?: boolean;
    forbidden?: boolean;
    check?: (packageJson: PackageJson) => boolean | number | undefined | string;
    md?: string;
    imgExample?: string;
    docDescription?: string;
    hideInManual?: boolean;
}

interface QADefinition {
    fileNameMainDoc: string;
    sections: Record<string, QASection>;
    files: Record<string, QAFile>;
    cucardas: Record<string, QACucarda>;
    customs: Record<string, {detect:string, match:string}>;
    eslint_options: any;
    rules: Record<string, QARule>;
}

interface Fixture {
    base: string;
    test?: string;
    title?: string;
    options?:{scoring?:boolean, bail?:boolean};
    skipped?: boolean;
    notices?: boolean;
    expectedParams?: string[];
    change: (info: any) => void;
    expected?: Warning[];
    scoring?: boolean;
}
