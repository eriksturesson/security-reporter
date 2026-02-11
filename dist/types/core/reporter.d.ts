import type { Report } from "../interfaces/Types";
export declare function runAllChecks(): Promise<Report>;
export declare function formatJSON(report: Report): string;
export declare function formatMarkdown(report: Report): string;
export declare function formatConsole(report: Report): void;
declare const _default: {
    runAllChecks: typeof runAllChecks;
    formatJSON: typeof formatJSON;
    formatMarkdown: typeof formatMarkdown;
    formatConsole: typeof formatConsole;
};
export default _default;
//# sourceMappingURL=reporter.d.ts.map