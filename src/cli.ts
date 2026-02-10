#!/usr/bin/env node

import { program } from "commander";
import { runValidation } from "./core/validators";
import { reportToTerminal, reportToJson, reportToMarkdown, getExitCode } from "./core/reporter";
import { reportToHtml, saveHtmlReport } from "./core/html-reporter";
import { GuardianConfig } from "./interfaces/Types";
import * as fs from "fs";
import * as path from "path";

// Load config from file if exists
const loadConfig = (): GuardianConfig => {
  const configPaths = [
    ".securityrc.json",
    ".securityrc",
    "security-reporter.config.json",
    "security-reporter.config.js",
  ];

  for (const configPath of configPaths) {
    const fullPath = path.join(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      try {
        if (configPath.endsWith(".js")) {
          return require(fullPath);
        }
        return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error);
      }
    }
  }

  return {};
};

// CLI setup
program
  .name("security-reporter")
  .description(
    "Security and quality reporter for Node.js projects. Scans for vulnerabilities, secrets, and quality issues.",
  )
  .version("1.0.0")
  .option("-c, --config <path>", "Path to config file")
  .option("-p, --project-type <type>", "Project type: frontend, backend, fullstack")
  .option("-f, --format <format>", "Output format: terminal, json, markdown, html, all", "json")
  .option("-o, --output <file>", "Output file (for json/markdown format)")
  .option("--strict", "Exit with code 1 on warnings")
  .option("--no-security", "Skip security checks")
  .option("--no-quality", "Skip quality checks")
  .option("--no-docker", "Skip Docker checks")
  .option("--no-tests", "Skip test checks")
  .option("--pdf", "Generate PDF report (requires markdown format)")
  .action(async (options) => {
    try {
      // Load config from file or use defaults
      let config: GuardianConfig = options.config ? JSON.parse(fs.readFileSync(options.config, "utf-8")) : loadConfig();

      // Override with CLI options
      if (options.projectType) {
        config.projectType = options.projectType;
      }

      if (options.security === false) {
        config.security = { ...config.security, auditLevel: undefined };
      }

      // Run validation
      console.log("🚀 Starting security scan...\n");
      const report = await runValidation(config);

      // Output report based on format
      const format = options.format.toLowerCase();

      // Ensure reports directory exists for default outputs
      const reportsDir = path.join(process.cwd(), "reports");
      if (!fs.existsSync(reportsDir)) {
        try {
          fs.mkdirSync(reportsDir, { recursive: true });
        } catch (err) {
          // ignore - will fallback to CWD writes
        }
      }

      if (format === "json" || format === "all") {
        const json = reportToJson(report);

        if (options.output) {
          const outputPath = options.output.endsWith(".json") ? options.output : `${options.output}.json`;
          fs.writeFileSync(outputPath, json);
          console.log(`\n✅ JSON report saved to ${outputPath}`);
        } else {
          // Default to saving JSON to reports/security-report.json for machine-readable output
          const defaultJsonPath = path.join(reportsDir, `security-report.json`);
          fs.writeFileSync(defaultJsonPath, json);
          console.log(`\n✅ JSON report saved to ${defaultJsonPath}`);

          // Also generate HTML alongside JSON for default runs
          try {
            const defaultHtmlPath = path.join(reportsDir, `security-report.html`);
            const savedPath = saveHtmlReport(report, defaultHtmlPath);
            console.log(`✅ HTML report saved to ${savedPath}`);

            // Try to generate PDF from HTML if puppeteer is available
            try {
              // dynamic import to avoid hard dependency
              const { savePdfFromHtml } = await import("./core/pdf-reporter");
              const pdfPath = path.join(reportsDir, `security-report.pdf`);
              const savedPdf = await savePdfFromHtml(savedPath, pdfPath);
              console.log(`✅ PDF report saved to ${savedPdf}`);
            } catch (pdfErr) {
              console.log("ℹ️  PDF generation skipped (install 'puppeteer' to enable)");
            }
          } catch (e) {
            // ignore HTML generation errors here
          }
        }
      }

      if (format === "markdown" || format === "all") {
        const markdown = reportToMarkdown(report);

        const outputPath = options.output ? options.output : path.join(reportsDir, `security-report.md`);
        const mdPath = outputPath.endsWith(".md") ? outputPath : `${outputPath}.md`;

        fs.writeFileSync(mdPath, markdown);
        console.log(`\n✅ Markdown report saved to ${mdPath}`);

        // PDF generation hint
        if (options.pdf) {
          console.log("\n💡 To convert to PDF, install markdown-pdf: npm install -g markdown-pdf");
          console.log(`   Then run: markdown-pdf ${mdPath}`);
        }
      }

      if (format === "html" || format === "all") {
        const outputPath = options.output ? options.output : path.join(reportsDir, `security-report.html`);
        const htmlPath = outputPath.endsWith(".html") ? outputPath : `${outputPath}.html`;

        const savedPath = saveHtmlReport(report, htmlPath);
        console.log(`\n✅ HTML report saved to ${savedPath}`);
        console.log(`   Open in browser: file://${path.resolve(savedPath)}`);
      }

      // Always show terminal report for live feedback
      try {
        reportToTerminal(report);
      } catch (e) {
        // ignore terminal rendering errors
      }

      // Notify about reports directory when files are generated
      if (fs.existsSync(reportsDir)) {
        console.log(`\n✅ Specific reports generated to ${reportsDir}`);
      }

      if (format === "terminal" || format === "all") {
        reportToTerminal(report);
      }

      // Exit with appropriate code
      const exitCode = options.strict && report.overallStatus === "warn" ? 1 : getExitCode(report);

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error: any) {
      console.error("\n❌ Error running security scan:", error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Init command to create config file
program
  .command("init")
  .description("Create a security-reporter config file")
  .action(() => {
    const configPath = path.join(process.cwd(), ".securityrc.json");

    if (fs.existsSync(configPath)) {
      console.log("⚠️  Config file already exists!");
      return;
    }

    const defaultConfig: GuardianConfig = {
      projectType: "backend",
      security: {
        auditLevel: "moderate",
        checkSecrets: true,
        allowedLicenses: ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"],
      },
      quality: {
        checkUnused: true,
        checkDuplicates: true,
        checkOutdated: true,
        allowUnused: ["@types/*", "typescript", "ts-node", "prettier", "eslint"],
      },
      docker: {
        checkEnvInBuild: true,
        requiredEnvVars: ["NODE_ENV"],
      },
      tests: {
        run: false,
      },
      reporting: {
        format: "terminal",
        verbose: false,
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log("✅ Created .securityrc.json");
    console.log("\n💡 Edit the file to customize your security checks");
    console.log("\n📚 Reference: https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html");
  });

program.parse();
