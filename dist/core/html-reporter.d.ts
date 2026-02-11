import { ValidationReport } from "../interfaces/Types";
/**
 * Generate beautiful HTML report with security headers
 * FIX #16: Added CSP and other security headers
 */
export declare const reportToHtml: (report: ValidationReport) => string;
/**
 * Save HTML report to file
 */
export declare const saveHtmlReport: (report: ValidationReport, outputPath?: string) => string;
//# sourceMappingURL=html-reporter.d.ts.map