// fs-promise es un paquete legacy con declaraciones de TypeScript incompletas
declare module 'fs-promise';

interface QADefinition {
    fileNameMainDoc: string;
    sections: any;
    files: any;
    cucardas: any;
    customs: any;
    jshint_options: any;
    eslint_options: any;
    rules: any;
    firstLines?: any;
}

interface WarningExpected {
    warning: string;
    params?: string[];
    scoring?: object;
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
    expected?: WarningExpected[];
}
