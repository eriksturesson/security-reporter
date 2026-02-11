#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const validators_1 = require("./core/validators");
const reporter_1 = require("./core/reporter");
const html_reporter_1 = require("./core/html-reporter");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// FIX #6: Validate input - Valid values
const VALID_PROJECT_TYPES = ["frontend", "backend", "fullstack"];
const VALID_FORMATS = ["terminal", "json", "markdown", "html", "all"];
/**
 * FIX #4: Safe JSON parsing with size limit
 */
const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB
const safeLoadConfig = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_CONFIG_SIZE) {
            console.error(`Config file too large: ${stats.size} bytes (max ${MAX_CONFIG_SIZE})`);
            process.exit(1);
        }
        const content = fs.readFileSync(filePath, "utf-8");
        // Try to parse JSON
        const config = JSON.parse(content);
        // Validate it's an object
        if (typeof config !== "object" || config === null) {
            console.error("Config file must contain a JSON object");
            process.exit(1);
        }
        return config;
    }
    catch (error) {
        console.error(`Failed to load config from ${filePath}:`, error.message);
        process.exit(1);
    }
};
/**
 * Load config from file if exists
 */
const loadConfig = () => {
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
                return safeLoadConfig(fullPath);
            }
            catch (error) {
                console.error(`Error loading config from ${configPath}:`, error);
            }
        }
    }
    return {};
};
// CLI setup
commander_1.program
    .name("security-reporter")
    .description("Security and quality reporter for Node.js projects. Scans for vulnerabilities, secrets, and quality issues.")
    .version("1.0.0")
    .option("-c, --config <path>", "Path to config file")
    .option("-p, --project-type <type>", `Project type: ${VALID_PROJECT_TYPES.join(", ")}`)
    .option("-f, --format <format>", `Output format: ${VALID_FORMATS.join(", ")}`, "json")
    .option("-o, --output <file>", "Output file (for json/markdown format)")
    .option("--strict", "Exit with code 1 on warnings")
    .option("--no-security", "Skip security checks")
    .option("--no-quality", "Skip quality checks")
    .option("--no-docker", "Skip Docker checks")
    .option("--no-tests", "Skip test checks")
    .option("--pdf", "Generate PDF report (requires markdown format)")
    .action(async (options) => {
    try {
        // FIX #6: Validate project type input
        if (options.projectType) {
            if (!VALID_PROJECT_TYPES.includes(options.projectType)) {
                console.error(`\n❌ Invalid project type: ${options.projectType}`);
                console.error(`Valid types: ${VALID_PROJECT_TYPES.join(", ")}\n`);
                process.exit(1);
            }
        }
        // FIX #6: Validate format input
        const format = options.format.toLowerCase();
        if (!VALID_FORMATS.includes(format)) {
            console.error(`\n❌ Invalid format: ${format}`);
            console.error(`Valid formats: ${VALID_FORMATS.join(", ")}\n`);
            process.exit(1);
        }
        // Load config from file or use defaults
        let config = options.config ? safeLoadConfig(options.config) : loadConfig();
        // Override with CLI options
        if (options.projectType) {
            config.projectType = options.projectType;
        }
        if (options.security === false) {
            config.security = { ...config.security, auditLevel: undefined };
        }
        // Run validation
        console.log("🚀 Starting security scan...\n");
        const report = await (0, validators_1.runValidation)(config);
        // FIX #7: Atomic directory creation without race condition
        const reportsDir = path.join(process.cwd(), "reports");
        try {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        catch (err) {
            if (err.code !== "EEXIST") {
                console.warn(`Could not create reports directory: ${err.message}`);
            }
        }
        // Output report based on format
        if (format === "json" || format === "all") {
            const json = (0, reporter_1.reportToJson)(report);
            if (options.output) {
                const outputPath = options.output.endsWith(".json") ? options.output : `${options.output}.json`;
                fs.writeFileSync(outputPath, json);
                console.log(`\n✅ JSON report saved to ${outputPath}`);
            }
            else {
                const defaultJsonPath = path.join(reportsDir, `security-report.json`);
                fs.writeFileSync(defaultJsonPath, json);
                console.log(`\n✅ JSON report saved to ${defaultJsonPath}`);
                // Also generate HTML alongside JSON for default runs
                try {
                    const defaultHtmlPath = path.join(reportsDir, `security-report.html`);
                    const savedPath = (0, html_reporter_1.saveHtmlReport)(report, defaultHtmlPath);
                    console.log(`✅ HTML report saved to ${savedPath}`);
                    // Try to generate PDF from HTML if puppeteer is available
                    try {
                        const { savePdfFromHtml } = await Promise.resolve().then(() => __importStar(require("./core/pdf-reporter")));
                        const pdfPath = path.join(reportsDir, `security-report.pdf`);
                        const savedPdf = await savePdfFromHtml(savedPath, pdfPath);
                        console.log(`✅ PDF report saved to ${savedPdf}`);
                    }
                    catch (pdfErr) {
                        console.log("ℹ️  PDF generation skipped (install 'puppeteer' to enable)");
                    }
                }
                catch (e) {
                    // ignore HTML generation errors here
                }
            }
        }
        if (format === "markdown" || format === "all") {
            const markdown = (0, reporter_1.reportToMarkdown)(report);
            const outputPath = options.output ? options.output : path.join(reportsDir, `security-report.md`);
            const mdPath = outputPath.endsWith(".md") ? outputPath : `${outputPath}.md`;
            fs.writeFileSync(mdPath, markdown);
            console.log(`\n✅ Markdown report saved to ${mdPath}`);
            if (options.pdf) {
                console.log("\n💡 To convert to PDF, install markdown-pdf: npm install -g markdown-pdf");
                console.log(`   Then run: markdown-pdf ${mdPath}`);
            }
        }
        if (format === "html" || format === "all") {
            const outputPath = options.output ? options.output : path.join(reportsDir, `security-report.html`);
            const htmlPath = outputPath.endsWith(".html") ? outputPath : `${outputPath}.html`;
            const savedPath = (0, html_reporter_1.saveHtmlReport)(report, htmlPath);
            console.log(`\n✅ HTML report saved to ${savedPath}`);
            console.log(`   Open in browser: file://${path.resolve(savedPath)}`);
        }
        // Always show terminal report for live feedback
        try {
            (0, reporter_1.reportToTerminal)(report);
        }
        catch (e) {
            // ignore terminal rendering errors
        }
        // Notify about reports directory when files are generated
        if (fs.existsSync(reportsDir)) {
            console.log(`\n✅ Reports generated in ${reportsDir}`);
        }
        if (format === "terminal" || format === "all") {
            (0, reporter_1.reportToTerminal)(report);
        }
        // Exit with appropriate code
        const exitCode = options.strict && report.overallStatus === "warn" ? 1 : (0, reporter_1.getExitCode)(report);
        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    }
    catch (error) {
        console.error("\n❌ Error running security scan:", error.message);
        if (error.stack && process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
});
// Init command to create config file
commander_1.program
    .command("init")
    .description("Create a security-reporter config file")
    .action(() => {
    const configPath = path.join(process.cwd(), ".securityrc.json");
    if (fs.existsSync(configPath)) {
        console.log("⚠️  Config file already exists!");
        return;
    }
    const defaultConfig = {
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
commander_1.program.parse();
//# sourceMappingURL=cli.js.map