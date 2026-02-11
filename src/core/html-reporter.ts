import { ValidationReport, CheckResult } from "../interfaces/Types";
import * as fs from "fs";
import * as path from "path";

/**
 * FIX #9: HTML escape function to prevent XSS
 * FIXED: Cross-Site Scripting vulnerability in HTML reports
 */
const escapeHtml = (unsafe: string): string => {
  if (typeof unsafe !== "string") {
    return String(unsafe);
  }

  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Generate beautiful HTML report with security headers
 * FIX #16: Added CSP and other security headers
 */
export const reportToHtml = (report: ValidationReport): string => {
  const criticalChecks = report.checks.filter((c) => c.severity === "critical" && c.status === "fail");
  const errorChecks = report.checks.filter((c) => c.severity === "error" && c.status === "fail");
  const warningChecks = report.checks.filter((c) => c.status === "warn");
  const passedChecks = report.checks.filter((c) => c.status === "pass");
  const skippedChecks = report.checks.filter((c) => c.status === "skip");

  const overallColor =
    report.overallStatus === "pass" ? "#10b981" : report.overallStatus === "warn" ? "#f59e0b" : "#ef4444";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:;">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta name="referrer" content="no-referrer">
    <title>Security Report - ${escapeHtml(new Date(report.timestamp).toLocaleDateString())}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f9fafb;
            padding: 2rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 2rem;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .meta {
            display: flex;
            gap: 2rem;
            margin-top: 1.5rem;
            flex-wrap: wrap;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
            background: #f9fafb;
        }
        
        .summary-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border-left: 4px solid #e5e7eb;
        }
        
        .summary-card.critical { border-left-color: #ef4444; }
        .summary-card.warning { border-left-color: #f59e0b; }
        .summary-card.success { border-left-color: #10b981; }
        .summary-card.info { border-left-color: #3b82f6; }
        .summary-card.skipped { border-left-color: #9ca3af; }
        
        .summary-card-title {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .summary-card-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
        }
        
        .overall-status {
            padding: 2rem;
            text-align: center;
            background: white;
            border-top: 1px solid #e5e7eb;
        }
        
        .overall-status h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: ${overallColor};
        }
        
        .checks-section {
            padding: 2rem;
        }
        
        .checks-group {
            margin-bottom: 3rem;
        }
        
        .checks-group h3 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .check-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid #e5e7eb;
        }
        
        .check-card.critical { border-left-color: #ef4444; background: #fef2f2; }
        .check-card.error { border-left-color: #f97316; background: #fff7ed; }
        .check-card.warning { border-left-color: #f59e0b; background: #fffbeb; }
        .check-card.pass { border-left-color: #10b981; background: #f0fdf4; }
        .check-card.skipped { border-left-color: #9ca3af; background: #f8fafc; }
        
        .check-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 1rem;
        }
        
        .check-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1f2937;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge.critical { background: #fee2e2; color: #991b1b; }
        .badge.error { background: #ffedd5; color: #9a3412; }
        .badge.warning { background: #fef3c7; color: #92400e; }
        .badge.info { background: #dbeafe; color: #1e40af; }
        .badge.skipped { background: #eef2f7; color: #374151; }
        
        .check-message {
            color: #4b5563;
            margin-bottom: 1rem;
        }
        
        .check-details {
            background: rgba(255, 255, 255, 0.5);
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
        }
        
        .check-details pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .suggestions {
            margin-top: 1rem;
        }
        
        .suggestions-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .suggestions ul {
            list-style: none;
            padding-left: 0;
        }
        
        .suggestions li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        
        .suggestions li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #6b7280;
        }
        
        footer {
            background: #f9fafb;
            padding: 2rem;
            text-align: center;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 9999px;
            overflow: hidden;
            margin: 1rem 0;
        }
        
        .progress-fill {
            height: 100%;
            background: ${overallColor};
            transition: width 0.3s ease;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>
                <span>🛡️</span>
                <span>Security Reporter</span>
            </h1>
            <p class="subtitle">Comprehensive Security &amp; Quality Analysis</p>
            <div class="meta">
                <div class="meta-item">
                    <span>📅</span>
                    <span>${escapeHtml(new Date(report.timestamp).toLocaleString())}</span>
                </div>
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>${escapeHtml(String(report.executionTime))}ms execution time</span>
                </div>
                <div class="meta-item">
                    <span>📊</span>
                    <span>${escapeHtml(report.projectType)} project</span>
                </div>
            </div>
        </header>

        <div class="summary">
            <div class="summary-card info">
                <div class="summary-card-title">Total Checks</div>
                <div class="summary-card-value">${report.summary.total}</div>
            </div>
            <div class="summary-card success">
                <div class="summary-card-title">Passed</div>
                <div class="summary-card-value">${report.summary.passed}</div>
            </div>
            <div class="summary-card warning">
                <div class="summary-card-title">Warnings</div>
                <div class="summary-card-value">${report.summary.warnings}</div>
            </div>
            <div class="summary-card critical">
                <div class="summary-card-title">Failed</div>
                <div class="summary-card-value">${report.summary.failed}</div>
            </div>
        </div>

        <div class="overall-status">
            <h2>Overall Status: ${escapeHtml(report.overallStatus.toUpperCase())}</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(report.summary.passed / report.summary.total) * 100}%"></div>
            </div>
        </div>

        <div class="checks-section">
            ${
              criticalChecks.length > 0
                ? `
            <div class="checks-group">
                <h3>🔴 Critical Issues</h3>
                ${criticalChecks.map((check) => renderCheckCard(check, "critical")).join("")}
            </div>
            `
                : ""
            }

            ${
              errorChecks.length > 0
                ? `
            <div class="checks-group">
                <h3>🟠 Errors</h3>
                ${errorChecks.map((check) => renderCheckCard(check, "error")).join("")}
            </div>
            `
                : ""
            }

            ${
              warningChecks.length > 0
                ? `
            <div class="checks-group">
                <h3>⚠️ Warnings</h3>
                ${warningChecks.map((check) => renderCheckCard(check, "warning")).join("")}
            </div>
            `
                : ""
            }

            ${
              passedChecks.length > 0
                ? `
            <div class="checks-group">
                <h3>✅ Passed Checks</h3>
                ${passedChecks.map((check) => renderCheckCard(check, "pass")).join("")}
            </div>
            `
                : ""
            }
            ${
              skippedChecks.length > 0
                ? `
            <div class="checks-group">
                <h3>⭐️ Skipped</h3>
                ${skippedChecks.map((check) => renderCheckCard(check, "skipped")).join("")}
            </div>
            `
                : ""
            }
        </div>

        <footer>
            <p>Generated by <strong>security-reporter</strong></p>
            <p>Based on <a href="https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html" target="_blank" rel="noopener noreferrer">OWASP NPM Security Best Practices</a></p>
        </footer>
    </div>
</body>
</html>`;

  return html;
};

/**
 * Helper: Render individual check card with XSS protection
 * FIX #9: All user data is escaped
 */
const renderCheckCard = (check: CheckResult, type: string): string => {
  const detailsHtml = check.details
    ? `
    <div class="check-details">
      <pre>${escapeHtml(typeof check.details === "string" ? check.details : JSON.stringify(check.details, null, 2))}</pre>
    </div>
  `
    : "";

  const suggestionsHtml =
    check.suggestions && check.suggestions.length > 0
      ? `
    <div class="suggestions">
      <div class="suggestions-title">💡 Suggestions</div>
      <ul>
        ${check.suggestions.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ul>
    </div>
  `
      : "";

  return `
    <div class="check-card ${escapeHtml(type)}">
      <div class="check-header">
        <div class="check-name">${escapeHtml(check.name)}</div>
        <span class="badge ${escapeHtml(check.severity)}">${escapeHtml(check.severity)}</span>
      </div>
      <div class="check-message">${escapeHtml(check.message)}</div>
      ${detailsHtml}
      ${suggestionsHtml}
    </div>
  `;
};

/**
 * Save HTML report to file
 */
export const saveHtmlReport = (report: ValidationReport, outputPath?: string): string => {
  const html = reportToHtml(report);
  const defaultPath = path.join(
    process.cwd(),
    `security-report-${new Date(report.timestamp).toISOString().split("T")[0]}.html`,
  );

  const finalPath = outputPath || defaultPath;
  fs.writeFileSync(finalPath, html, "utf-8");

  return finalPath;
};
