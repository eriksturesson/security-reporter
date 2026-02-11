import { ValidationReport } from "../interfaces/Types";
/**
 * Format and display validation report in terminal with beautiful output
 */
export declare const reportToTerminal: (report: ValidationReport) => void;
/**
 * Export report as JSON
 */
export declare const reportToJson: (report: ValidationReport) => string;
/**
 * Export report as Markdown
 */
export declare const reportToMarkdown: (report: ValidationReport) => string;
/**
 * Get exit code based on report
 */
export declare const getExitCode: (report: ValidationReport) => number;
//# sourceMappingURL=reporter.d.ts.map