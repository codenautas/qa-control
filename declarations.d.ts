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

interface ProjectInfo {
    projectDir: string;
    files: Record<string, FileInfo>;
    packageJson: any;
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
    presentIf?: (packageJson: any) => boolean;
}

interface QASection {
    mandatory?: boolean;
    values: Record<string, object>;
}

interface QACucarda {
    mandatory?: boolean;
    forbidden?: boolean;
    check?: (packageJson: any) => boolean;
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
    customs: any;
    jshint_options: any;
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
