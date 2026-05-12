// fs-promise es un paquete legacy con declaraciones de TypeScript incompletas
declare module 'fs-promise';

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
    profile?: string;
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
}

interface ProjectInfo {
    projectDir: string;
    files: Record<string, FileInfo>;
    packageJson: PackageJson;
    scoring?: boolean;
}

interface QACheck {
    warnings: (info: ProjectInfo) => Warning[];
}

interface QARule {
    checks: QACheck[];
    shouldAbort?: boolean;
    eclipsers?: string[];
    mandatory?: boolean;
}

interface QAFile {
    mandatory?: boolean;
    mandatoryLines?: string[];
    presentIf?: (packageJson: PackageJson) => boolean;
}

interface QASection {
    mandatory?: boolean;
    values: Record<string, object>;
}

interface QACucarda {
    mandatory?: boolean;
    forbidden?: boolean;
    check?: (packageJson: PackageJson) => boolean | number | undefined;
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
    firstLines?: Record<string, Record<string, string>>;
}

interface Fixture {
    base: string;
    test?: string;
    title?: string;
    scoring?: boolean;
    skipped?: boolean;
    notices?: boolean;
    expectedParams?: string[];
    change: (info: any) => void;
    expected?: Warning[];
}
