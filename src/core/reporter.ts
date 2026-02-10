import { ValidationReport, CheckResult, CheckStatus } from "../interfaces/Types";

/**
 * Format and display validation report in terminal with beautiful output
 */
export const reportToTerminal = (report: ValidationReport): void => {
  const professional =
    process.env.SECURITY_REPORT_PROFESSIONAL === "1" || process.env.SECURITY_REPORT_PROFESSIONAL === "true";
  const showDetails =
    process.env.SECURITY_REPORT_SHOW_DETAILS === "1" || process.env.SECURITY_REPORT_SHOW_DETAILS === "true";

  const iconOrText = (icon: string, text: string) => (professional ? text : icon);

  const width = 80;
  const line = "═".repeat(width);
  const thinLine = "─".repeat(width);

  // Header
  console.log("\n" + line);
  console.log(centerText("🛡️  SECURITY REPORTER", width));
  console.log(centerText(`Security & Quality Report`, width));
  console.log(line);
  console.log(`📊 Project Type: ${report.projectType}`);
  console.log(`⏱️  Execution Time: ${report.executionTime}ms`);
  console.log(`📅 ${report.timestamp.toLocaleString()}`);
  console.log(line + "\n");

  // Group checks by severity/status
  const critical = report.checks.filter((c) => c.severity === "critical" && c.status === "fail");
  const errors = report.checks.filter((c) => c.severity === "error" && c.status === "fail");
  const warnings = report.checks.filter((c) => c.status === "warn");
  const passed = report.checks.filter((c) => c.status === "pass");
  const skipped = report.checks.filter((c) => c.status === "skip");

  // Critical issues (show first and prominent)
  if (critical.length > 0) {
    console.log(`${professional ? "CRITICAL SECURITY ISSUES" : "🔴 CRITICAL SECURITY ISSUES"}\n`);
    critical.forEach((check) => displayCheckDetailed(check, { professional, showDetails }));
    console.log("");
  }

  // Errors
  if (errors.length > 0) {
    console.log(`${professional ? "ERRORS" : "❌ ERRORS"}\n`);
    errors.forEach((check) => displayCheckDetailed(check, { professional, showDetails }));
    console.log("");
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(`${professional ? "WARNINGS" : "⚠️  WARNINGS"}\n`);
    warnings.forEach((check) => displayCheckCompact(check, { professional, showDetails }));
    console.log("");
  }

  // Passed checks (compact summary)
  if (passed.length > 0) {
    console.log("✅ PASSED CHECKS\n");
    // Dynamically compute columns to fit the terminal width and render as table-like rows
    const items = passed.map((c) => `${getStatusIcon(c.status)} ${c.name}`);
    const indent = 2; // left padding
    const available = Math.max(20, width - indent - 2);
    const maxLen = items.reduce((m, it) => Math.max(m, it.length), 0);
    const colWidth = Math.max(10, maxLen + 4);
    const cols = Math.max(1, Math.floor(available / colWidth));
    const rows = Math.ceil(items.length / cols);

    for (let r = 0; r < rows; r++) {
      const rowItems: string[] = [];
      for (let c = 0; c < cols; c++) {
        const idx = c * rows + r; // column-major arrangement for balanced columns
        if (idx < items.length) {
          rowItems.push(items[idx].padEnd(colWidth));
        }
      }
      console.log(`  ${rowItems.join("")}`.trimRight());
    }

    console.log("");
  }

  // Skipped checks (show what was skipped and why)
  if (skipped.length > 0) {
    console.log(`${professional ? `SKIPPED (${skipped.length} checks)` : `⏭️  SKIPPED (${skipped.length} checks)`}\n`);
    skipped.forEach((check) => {
      if (professional) {
        console.log(`  SKIPPED: ${check.name}: ${check.message}`);
      } else {
        console.log(`  ⏭️  ${check.name}: ${check.message}`);
      }
      // Show suggestions for skipped checks too (only in detailed mode)
      if ((!professional || showDetails) && check.suggestions && check.suggestions.length > 0) {
        check.suggestions.forEach((suggestion) => {
          console.log(`     ${professional ? "-" : "💡"} ${suggestion}`);
        });
      }
    });
    console.log("");
  }

  // Summary box
  console.log(thinLine);
  console.log(centerText("📊 SUMMARY", width));
  console.log(thinLine);

  // Build summary items and include additional metrics when available
  const secretsCheck = report.checks.find((c) => c.name.toLowerCase().includes("secrets"));
  const patternsChecked =
    secretsCheck && typeof secretsCheck.details === "object"
      ? secretsCheck.details.patternsChecked || secretsCheck.details.filesScanned || undefined
      : undefined;
  const filesScanned =
    secretsCheck && typeof secretsCheck.details === "object" ? secretsCheck.details.filesScanned : undefined;

  const summaryItems: Array<{ label: string; value: string }> = [
    { label: "Total checks", value: String(report.summary.total) },
    { label: "Passed", value: String(report.summary.passed) },
    { label: "Warnings", value: String(report.summary.warnings) },
    { label: "Failed", value: String(report.summary.failed) },
    { label: "Skipped", value: String(report.summary.skipped) },
  ];

  if (typeof filesScanned === "number") {
    summaryItems.push({ label: "Files scanned", value: String(filesScanned) });
  }
  if (typeof patternsChecked === "number") {
    summaryItems.push({ label: "Patterns checked", value: String(patternsChecked) });
  }

  // Render two columns per row to use horizontal space better
  const colWidth = Math.floor((width - 6) / 2); // leave small margins
  for (let i = 0; i < summaryItems.length; i += 2) {
    const left = summaryItems[i];
    const right = summaryItems[i + 1];
    const leftText = `${left.label}: ${left.value}`.padEnd(colWidth);
    const rightText = right ? `${right.label}: ${right.value}` : "";
    const lineOut = `  ${leftText}${rightText}`.trimRight();
    console.log(lineOut);
  }

  console.log(line);

  // Overall status
  // Overall status (simpler text in professional mode)
  if (professional) {
    const text =
      report.overallStatus === "fail"
        ? "OVERALL STATUS: FAILED - Action Required"
        : report.overallStatus === "warn"
          ? "OVERALL STATUS: WARNING - Review Recommended"
          : "OVERALL STATUS: PASSED - All Good";
    console.log(`\n${centerText(text, width)}\n`);
  } else {
    const statusDisplay = getOverallStatusDisplay(report.overallStatus);
    console.log(`\n${centerText(statusDisplay.text, width)}\n`);
  }

  // Action items if there are issues
  if (critical.length > 0 || errors.length > 0) {
    console.log(`${professional ? "RECOMMENDED ACTIONS:" : "🔧 RECOMMENDED ACTIONS:"}\n`);
    const actions = new Set<string>();

    [...critical, ...errors].forEach((check) => {
      if (check.suggestions) {
        check.suggestions.forEach((s) => actions.add(s));
      }
    });

    Array.from(actions)
      .slice(0, 5)
      .forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });

    console.log("");
  }

  // CI/CD hint
  if (!professional) {
    if (report.overallStatus === "fail") {
      console.log("💡 Tip: Fix critical and error issues before deploying to production\n");
    } else if (report.overallStatus === "warn") {
      console.log("💡 Tip: Consider addressing warnings to improve code quality\n");
    }
  }
};

/**
 * Display check with full details (for critical/errors)
 */
const displayCheckDetailed = (
  check: CheckResult,
  options?: { professional?: boolean; showDetails?: boolean },
): void => {
  const professional = options?.professional ?? false;
  const showDetails = options?.showDetails ?? false;

  if (professional && !showDetails) {
    // Minimal single-line summary for managers
    console.log(`  [${check.severity.toUpperCase()}] ${check.name}: ${check.message}`);
    return;
  }

  const icon = professional ? "" : getSeverityIcon(check.severity);
  const badge = professional ? `[${check.severity.toUpperCase()}]` : getSeverityBadge(check.severity);

  console.log(`  ${icon} ${check.name.toUpperCase()} ${badge}`.trim());
  console.log(`     ├─ Status: ${check.status.toUpperCase()}`);
  console.log(`     ├─ Message: ${check.message}`);

  if (check.details && (!professional || showDetails)) {
    console.log(`     └─ Details:`);
    if (Array.isArray(check.details)) {
      check.details.slice(0, 3).forEach((detail, i) => {
        const prefix = i === check.details.length - 1 ? "        └─" : "        ├─";
        console.log(`${prefix} ${detail}`);
      });
      if (check.details.length > 3) {
        console.log(`        └─ ... and ${check.details.length - 3} more`);
      }
    } else if (typeof check.details === "object") {
      Object.entries(check.details)
        .slice(0, 3)
        .forEach(([key, value]) => {
          console.log(`        ├─ ${key}: ${value}`);
        });
    } else {
      console.log(`        └─ ${check.details}`);
    }
  }

  if (check.suggestions && check.suggestions.length > 0 && (!professional || showDetails)) {
    console.log(`     ${professional ? "Suggestions:" : "💡 Suggestions:"}`);
    check.suggestions.slice(0, 2).forEach((suggestion) => {
      console.log(`        • ${suggestion}`);
    });
  }

  console.log("");
};

/**
 * Display check compactly (for warnings)
 */
const displayCheckCompact = (check: CheckResult, options?: { professional?: boolean; showDetails?: boolean }): void => {
  const professional = options?.professional ?? false;
  const showDetails = options?.showDetails ?? false;
  const icon = professional ? "" : getStatusIcon(check.status);
  console.log(`  ${icon} ${check.name}: ${check.message}`.trim());

  if (check.suggestions && check.suggestions.length > 0 && (!professional || showDetails)) {
    console.log(`     ${professional ? "-" : "💡"} ${check.suggestions[0]}`);
  }
};

/**
 * Center text within a given width
 */
const centerText = (text: string, width: number): string => {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(padding) + text;
};

/**
 * Get icon for check status
 */
const getStatusIcon = (status: CheckStatus): string => {
  switch (status) {
    case "pass":
      return "✅";
    case "warn":
      return "⚠️ ";
    case "fail":
      return "❌";
    case "skip":
      return "⏭️ ";
    default:
      return "❓";
  }
};

/**
 * Get icon for severity
 */
const getSeverityIcon = (severity: string): string => {
  switch (severity) {
    case "critical":
      return "🔴";
    case "error":
      return "🟠";
    case "warning":
      return "🟡";
    case "info":
      return "🔵";
    default:
      return "⚪";
  }
};

/**
 * Get severity badge
 */
const getSeverityBadge = (severity: string): string => {
  switch (severity) {
    case "critical":
      return "[🔴 CRITICAL]";
    case "error":
      return "[🟠 ERROR]";
    case "warning":
      return "[🟡 WARNING]";
    case "info":
      return "[🔵 INFO]";
    default:
      return "";
  }
};

/**
 * Get overall status display
 */
const getOverallStatusDisplay = (status: CheckStatus): { text: string; color: string } => {
  switch (status) {
    case "fail":
      return { text: "❌ OVERALL STATUS: FAILED - Action Required", color: "red" };
    case "warn":
      return { text: "⚠️  OVERALL STATUS: WARNING - Review Recommended", color: "yellow" };
    case "pass":
      return { text: "✅ OVERALL STATUS: PASSED - All Good!", color: "green" };
    default:
      return { text: "⏭️  OVERALL STATUS: SKIPPED", color: "gray" };
  }
};

/**
 * Export report as JSON
 */
export const reportToJson = (report: ValidationReport): string => {
  return JSON.stringify(report, null, 2);
};

/**
 * Export report as Markdown
 */
export const reportToMarkdown = (report: ValidationReport): string => {
  let md = "# 🛡️ Security Report\n\n";

  md += `**Generated:** ${report.timestamp.toISOString()}\n`;
  md += `**Project Type:** ${report.projectType}\n`;
  md += `**Execution Time:** ${report.executionTime}ms\n\n`;

  md += "## 📊 Summary\n\n";
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Checks | ${report.summary.total} |\n`;
  md += `| ✅ Passed | ${report.summary.passed} |\n`;
  md += `| ⚠️ Warnings | ${report.summary.warnings} |\n`;
  md += `| ❌ Failed | ${report.summary.failed} |\n`;
  md += `| ⏭️ Skipped | ${report.summary.skipped} |\n\n`;

  // Group by status
  const failed = report.checks.filter((c) => c.status === "fail");
  const warnings = report.checks.filter((c) => c.status === "warn");
  const passed = report.checks.filter((c) => c.status === "pass");

  if (failed.length > 0) {
    md += "## ❌ Failed Checks\n\n";
    failed.forEach((check) => {
      md += `### ${check.name} [${check.severity.toUpperCase()}]\n\n`;
      md += `**Message:** ${check.message}\n\n`;
      if (check.details) {
        md += `**Details:**\n`;
        if (Array.isArray(check.details)) {
          check.details.forEach((d) => (md += `- ${d}\n`));
        } else {
          md += `\`\`\`\n${JSON.stringify(check.details, null, 2)}\n\`\`\`\n`;
        }
        md += "\n";
      }
      if (check.suggestions) {
        md += `**Suggestions:**\n`;
        check.suggestions.forEach((s) => (md += `- ${s}\n`));
        md += "\n";
      }
    });
  }

  if (warnings.length > 0) {
    md += "## ⚠️ Warnings\n\n";
    warnings.forEach((check) => {
      md += `- **${check.name}:** ${check.message}\n`;
    });
    md += "\n";
  }

  if (passed.length > 0) {
    md += "## ✅ Passed Checks\n\n";
    passed.forEach((check) => {
      md += `- ${check.name}\n`;
    });
    md += "\n";
  }

  md += `## Overall Status: ${getOverallStatusText(report.overallStatus)}\n\n`;

  md += "---\n";
  md += `*Report generated by [security-reporter](https://github.com/eriksturesson/security-reporter)*\n`;

  return md;
};

const getOverallStatusText = (status: CheckStatus): string => {
  switch (status) {
    case "fail":
      return "❌ FAILED";
    case "warn":
      return "⚠️ WARNING";
    case "pass":
      return "✅ PASSED";
    default:
      return "⏭️ SKIPPED";
  }
};

/**
 * Get exit code based on report
 */
export const getExitCode = (report: ValidationReport): number => {
  if (report.overallStatus === "fail") return 1;
  if (report.overallStatus === "warn") return 0; // Warnings don't fail CI by default
  return 0;
};
