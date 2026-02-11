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
exports.runSecurityChecks = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Run all security-related checks
 */
const runSecurityChecks = async (config, projectType) => {
    const checks = [
        checkNpmAudit(config),
        checkSecrets(config),
        checkEnvFiles(projectType),
        checkLicenses(config),
        checkPackagePublishSafety(),
        checkLockfilePresence(),
        checkNpmScripts(),
        checkPublishDryRun(config),
        checkSbomGeneration(config),
        checkTyposquatting(config),
    ];
    return Promise.all(checks);
};
exports.runSecurityChecks = runSecurityChecks;
/**
 * Check package.json publish safety
 */
const checkPackagePublishSafety = async () => {
    try {
        const pkgPath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(pkgPath)) {
            return {
                name: "publish safety",
                status: "skip",
                severity: "info",
                message: "No package.json found",
            };
        }
        const pkgContent = fs.readFileSync(pkgPath, "utf-8");
        const pkg = safeParseJSON(pkgContent, "package.json");
        const suggestions = [];
        if (pkg.private === true) {
            return {
                name: "publish safety",
                status: "pass",
                severity: "info",
                message: "Package is marked private",
            };
        }
        if (!pkg.files || (Array.isArray(pkg.files) && pkg.files.length === 0)) {
            suggestions.push("Add a 'files' allowlist in package.json to control published files");
        }
        if (!pkg.name) {
            suggestions.push("Set a package name in package.json before publishing");
        }
        suggestions.push("Run 'npm publish --dry-run' before releasing to verify package contents");
        return {
            name: "publish safety",
            status: suggestions.length > 0 ? "warn" : "pass",
            severity: suggestions.length > 0 ? "warning" : "info",
            message: suggestions.length > 0 ? "Publish safety checks recommend changes" : "Publish settings look good",
            details: {
                name: pkg.name,
                private: pkg.private,
                files: pkg.files,
            },
            suggestions,
        };
    }
    catch (error) {
        return {
            name: "publish safety",
            status: "fail",
            severity: "error",
            message: "Could not evaluate publish safety",
            details: error.message,
        };
    }
};
/**
 * Check for presence of lockfile
 */
const checkLockfilePresence = async () => {
    try {
        const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
        const found = lockFiles.filter((f) => fs.existsSync(path.join(process.cwd(), f)));
        if (found.length === 0) {
            return {
                name: "lockfile",
                status: "warn",
                severity: "warning",
                message: "No lockfile found",
                details: { checked: lockFiles },
                suggestions: [
                    "Commit a lockfile (package-lock.json/yarn.lock/pnpm-lock.yaml)",
                    "Use 'npm ci' in CI for reproducible installs",
                ],
            };
        }
        return {
            name: "lockfile",
            status: "pass",
            severity: "info",
            message: `Lockfile present: ${found.join(", ")}`,
            details: { found },
        };
    }
    catch (error) {
        return {
            name: "lockfile",
            status: "fail",
            severity: "error",
            message: "Could not check lockfile",
            details: error.message,
        };
    }
};
/**
 * Check for risky npm lifecycle scripts
 */
const checkNpmScripts = async () => {
    try {
        const pkgPath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(pkgPath)) {
            return {
                name: "npm scripts",
                status: "skip",
                severity: "info",
                message: "No package.json found",
            };
        }
        const pkgContent = fs.readFileSync(pkgPath, "utf-8");
        const pkg = safeParseJSON(pkgContent, "package.json");
        const scripts = pkg.scripts || {};
        const risky = ["preinstall", "install", "postinstall", "prepare"].filter((s) => scripts[s]);
        if (risky.length > 0) {
            return {
                name: "npm scripts",
                status: "warn",
                severity: "warning",
                message: `Found lifecycle scripts: ${risky.join(", ")}`,
                details: { scripts: risky },
                suggestions: [
                    "Avoid running untrusted scripts during install",
                    "Consider using --ignore-scripts in CI or allowlist scripts",
                    "Review script contents for unexpected network or file operations",
                ],
            };
        }
        return {
            name: "npm scripts",
            status: "pass",
            severity: "info",
            message: "No risky lifecycle scripts detected",
        };
    }
    catch (error) {
        return {
            name: "npm scripts",
            status: "fail",
            severity: "error",
            message: "Could not inspect npm scripts",
            details: error.message,
        };
    }
};
/**
 * FIX #1: Run npm audit with spawn instead of exec for security
 * FIXED: Command injection vulnerability
 */
const checkNpmAudit = async (config) => {
    var _a, _b;
    try {
        const result = await spawnCommand("npx", ["npm", "audit", "--json"], {
            shell: true,
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024,
        });
        const audit = JSON.parse(result.stdout);
        const vulnerabilities = ((_a = audit.metadata) === null || _a === void 0 ? void 0 : _a.vulnerabilities) || {};
        const total = (vulnerabilities.info || 0) +
            (vulnerabilities.low || 0) +
            (vulnerabilities.moderate || 0) +
            (vulnerabilities.high || 0) +
            (vulnerabilities.critical || 0);
        if (total === 0) {
            return {
                name: "npm audit",
                status: "pass",
                severity: "info",
                message: "No vulnerabilities found",
            };
        }
        const hasHighOrCritical = vulnerabilities.high > 0 || vulnerabilities.critical > 0;
        return {
            name: "npm audit",
            status: hasHighOrCritical ? "fail" : "warn",
            severity: hasHighOrCritical ? "critical" : "warning",
            message: `Found ${total} vulnerabilities`,
            details: vulnerabilities,
            suggestions: ["Run 'npm audit fix' to fix vulnerabilities"],
        };
    }
    catch (error) {
        // npm audit exits with code 1 if vulnerabilities found
        if (error.stdout) {
            try {
                const audit = JSON.parse(error.stdout);
                const vulnerabilities = ((_b = audit.metadata) === null || _b === void 0 ? void 0 : _b.vulnerabilities) || {};
                const total = Object.values(vulnerabilities).reduce((sum, val) => sum + val, 0);
                const hasHighOrCritical = vulnerabilities.high > 0 || vulnerabilities.critical > 0;
                return {
                    name: "npm audit",
                    status: hasHighOrCritical ? "fail" : "warn",
                    severity: hasHighOrCritical ? "critical" : "warning",
                    message: `Found ${total} vulnerabilities`,
                    details: vulnerabilities,
                    suggestions: ["Run 'npm audit fix' to fix vulnerabilities"],
                };
            }
            catch {
                // Could not parse
            }
        }
        return {
            name: "npm audit",
            status: "fail",
            severity: "error",
            message: "Could not run npm audit",
            details: error.message,
        };
    }
};
/**
 * FIX #3: Check for common secrets patterns with SAFE regex patterns
 * FIXED: ReDoS vulnerability by limiting length and using safer patterns
 */
const checkSecrets = async (config) => {
    if (config.checkSecrets === false) {
        return {
            name: "secrets scan",
            status: "skip",
            severity: "info",
            message: "Secrets scanning disabled",
        };
    }
    // FIX #3: Safe regex patterns with length limits to prevent ReDoS
    const loadPatterns = () => {
        const cfgPath = path.join(process.cwd(), "config", "patterns.json");
        if (fs.existsSync(cfgPath)) {
            try {
                const raw = fs.readFileSync(cfgPath, "utf-8");
                const list = safeParseJSON(raw, "patterns.json");
                return list.map((p) => ({ name: p.name, pattern: new RegExp(p.pattern, p.flags || "i") }));
            }
            catch {
                // fallthrough to defaults
            }
        }
        // SAFE patterns with length limits to prevent ReDoS
        const defaults = [
            { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/i },
            { name: "AWS Secret Key", pattern: /aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i },
            { name: "Stripe Live Key", pattern: /sk_live_[0-9a-zA-Z]{24,99}/i },
            { name: "Google API Key", pattern: /AIza[0-9A-Za-z\-_]{35}/i },
            { name: "GitHub PAT", pattern: /ghp_[0-9a-zA-Z]{36}/i },
            { name: "GitHub PAT (alt)", pattern: /github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}/i },
            // FIXED: Limited length to prevent ReDoS
            { name: "Bearer Token", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]{10,500}/i },
            { name: "JWT Token", pattern: /eyJ[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500}/i },
        ];
        return defaults;
    };
    const patterns = loadPatterns();
    const foundSecrets = [];
    const srcDir = path.join(process.cwd(), "src");
    const excludeDirs = [path.join(process.cwd(), "src", "core")];
    if (!fs.existsSync(srcDir)) {
        return {
            name: "secrets scan",
            status: "skip",
            severity: "info",
            message: "No src directory found",
        };
    }
    // FIX #2: Safe directory scanning with path traversal protection
    const scanDirectory = (dir) => {
        const normalizedDir = path.resolve(dir);
        const projectRoot = path.resolve(process.cwd());
        // FIX: Verify we're within project root
        if (!normalizedDir.startsWith(projectRoot)) {
            console.warn(`[Security] Attempted to scan outside project: ${dir}`);
            return;
        }
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch (err) {
            // Skip inaccessible directories
            return;
        }
        entries.forEach((entry) => {
            const filePath = path.join(dir, entry.name);
            const resolvedPath = path.resolve(filePath);
            // FIX: Skip symlinks to prevent traversal attacks
            if (entry.isSymbolicLink()) {
                return;
            }
            // FIX: Double-check resolved path is still within project
            if (!resolvedPath.startsWith(projectRoot)) {
                console.warn(`[Security] Skipping file outside project: ${filePath}`);
                return;
            }
            // Skip scanning our own core scanner files to avoid false positives
            if (excludeDirs.some((d) => filePath.startsWith(d))) {
                return;
            }
            if (entry.isDirectory()) {
                if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                    scanDirectory(filePath);
                }
            }
            else if (entry.name.match(/\.(ts|js|jsx|tsx|json)$/)) {
                scanFile(filePath, patterns, foundSecrets);
            }
        });
    };
    try {
        scanDirectory(srcDir);
        if (foundSecrets.length > 0) {
            const defs = foundSecrets.filter((s) => s.isDefinition);
            const reals = foundSecrets.filter((s) => !s.isDefinition);
            if (reals.length > 0) {
                return {
                    name: "secrets scan",
                    status: "fail",
                    severity: "critical",
                    message: `Found potential secrets in ${reals.length} locations (plus ${defs.length} possible pattern definitions)`,
                    details: {
                        matches: reals.slice(0, 10), // Limit output
                        possibleDefinitions: defs.slice(0, 5),
                        totalMatches: reals.length,
                        totalDefinitions: defs.length,
                    },
                    suggestions: ["Remove hardcoded secrets", "Use environment variables", "Add files to .gitignore"],
                };
            }
            // Only pattern definitions found
            return {
                name: "secrets scan",
                status: "warn",
                severity: "warning",
                message: `Only pattern/regex definitions found (${defs.length} matches) — possible false positives`,
                details: {
                    possibleDefinitions: defs.slice(0, 5),
                    total: defs.length,
                },
                suggestions: [
                    "Move pattern/regex definitions to a separate config file (e.g. config/patterns.json)",
                    "Or annotate pattern definition lines with a comment like // security-reporter:ignore",
                ],
            };
        }
        return {
            name: "secrets scan",
            status: "pass",
            severity: "info",
            message: "No hardcoded secrets found",
            details: {
                filesScanned: countFilesInDir(srcDir),
                patternsChecked: patterns.length,
            },
        };
    }
    catch (error) {
        return {
            name: "secrets scan",
            status: "fail",
            severity: "error",
            message: "Could not scan for secrets",
            details: error.message,
        };
    }
};
/**
 * Helper: Scan individual file for secrets with size limit
 * FIX #15: Prevent memory issues by limiting file size
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const scanFile = (filePath, patterns, foundSecrets) => {
    try {
        const stats = fs.statSync(filePath);
        // FIX: Skip files that are too large
        if (stats.size > MAX_FILE_SIZE) {
            console.warn(`[Security] Skipping large file: ${filePath} (${stats.size} bytes)`);
            return;
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split(/\r?\n/);
        patterns.forEach(({ name, pattern }) => {
            lines.forEach((line, index) => {
                // Reset regex lastIndex to prevent issues with global flag
                pattern.lastIndex = 0;
                if (pattern.test(line)) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("//") &&
                        !trimmed.startsWith("#") &&
                        !trimmed.startsWith("*") &&
                        !trimmed.includes("example") &&
                        !trimmed.includes("placeholder") &&
                        !trimmed.includes("TODO") &&
                        !trimmed.includes("FIXME")) {
                        // Detect if this line looks like a pattern/regex definition to avoid false positives
                        const isDefinition = /pattern\s*[:=]|new RegExp\(|const\s+patterns\b|let\s+patterns\b|var\s+patterns\b|\/.*\//.test(trimmed);
                        foundSecrets.push({
                            file: filePath.replace(process.cwd(), ""),
                            type: name,
                            line: index + 1,
                            snippet: line.trim().slice(0, 200),
                            isDefinition,
                        });
                    }
                }
            });
        });
    }
    catch (err) {
        // Skip files that can't be read
    }
};
/**
 * Helper: Count files in directory
 */
const countFilesInDir = (dir) => {
    let count = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach((entry) => {
            if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
                count += countFilesInDir(path.join(dir, entry.name));
            }
            else if (entry.isFile() && entry.name.match(/\.(ts|js|jsx|tsx|json)$/)) {
                count++;
            }
        });
    }
    catch (err) {
        // Ignore errors
    }
    return count;
};
/**
 * Check .env file configuration
 */
const checkEnvFiles = async (projectType) => {
    const hasEnv = fs.existsSync(path.join(process.cwd(), ".env"));
    const hasEnvExample = fs.existsSync(path.join(process.cwd(), ".env.example"));
    const hasGitignore = fs.existsSync(path.join(process.cwd(), ".gitignore"));
    const issues = [];
    if (hasEnv && hasGitignore) {
        const gitignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf-8");
        const gitignoreLines = gitignore
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"));
        const isEnvIgnored = gitignoreLines.some((line) => line === ".env" || line.startsWith(".env"));
        if (!isEnvIgnored) {
            issues.push(".env file not in .gitignore");
        }
    }
    if (hasEnv && !hasEnvExample) {
        issues.push("Missing .env.example file for documentation");
    }
    if (issues.length > 0) {
        return {
            name: "env files",
            status: "warn",
            severity: "warning",
            message: "Environment file issues detected",
            details: issues,
            suggestions: ["Add .env to .gitignore", "Create .env.example with dummy values"],
        };
    }
    return {
        name: "env files",
        status: "pass",
        severity: "info",
        message: "Environment files properly configured",
    };
};
/**
 * Enhanced License Compliance Checker
 */
const checkLicenses = async (config) => {
    if (!config.allowedLicenses || config.allowedLicenses.length === 0) {
        return {
            name: "licenses",
            status: "skip",
            severity: "info",
            message: "License checking disabled (no allowedLicenses configured)",
            suggestions: [
                'Add "allowedLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause"] to .securityrc.json',
                "Run: security-reporter init to create config",
            ],
        };
    }
    try {
        const issues = [];
        const warnings = [];
        // 1. Check package.json license
        let pkgLicense;
        try {
            const pkgContent = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8");
            const pkg = safeParseJSON(pkgContent, "package.json");
            pkgLicense = pkg.license;
        }
        catch {
            issues.push("Could not read package.json");
        }
        // 2. Check LICENSE file (common variations)
        const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md"];
        let licenseFile;
        let licenseFileContent;
        for (const filename of licenseFiles) {
            const filepath = path.join(process.cwd(), filename);
            if (fs.existsSync(filepath)) {
                licenseFile = filename;
                licenseFileContent = fs.readFileSync(filepath, "utf-8");
                break;
            }
        }
        // Detect license type from LICENSE file content
        let detectedLicense;
        if (licenseFileContent) {
            if (licenseFileContent.includes("MIT License")) {
                detectedLicense = "MIT";
            }
            else if (licenseFileContent.includes("Apache License")) {
                detectedLicense = "Apache-2.0";
            }
            else if (licenseFileContent.includes("BSD 3-Clause")) {
                detectedLicense = "BSD-3-Clause";
            }
            else if (licenseFileContent.includes("ISC License")) {
                detectedLicense = "ISC";
            }
            else if (licenseFileContent.includes("GNU General Public License")) {
                if (licenseFileContent.includes("version 3")) {
                    detectedLicense = "GPL-3.0";
                }
                else if (licenseFileContent.includes("version 2")) {
                    detectedLicense = "GPL-2.0";
                }
            }
        }
        // 3. Validate and compare
        if (!pkgLicense && !licenseFile) {
            return {
                name: "licenses",
                status: "fail",
                severity: "error",
                message: "⚠️ No license found in package.json or LICENSE file",
                suggestions: [
                    "Add license field to package.json",
                    "Create a LICENSE file",
                    "Choose from: MIT, Apache-2.0, BSD-3-Clause, ISC",
                    "See: https://choosealicense.com/",
                ],
            };
        }
        if (!pkgLicense) {
            warnings.push("Missing license field in package.json");
        }
        if (!licenseFile) {
            warnings.push("Missing LICENSE file in repository");
        }
        // 4. Check if they differ
        if (pkgLicense && detectedLicense && pkgLicense !== detectedLicense) {
            issues.push(`License mismatch: package.json says "${pkgLicense}" but ${licenseFile} appears to be "${detectedLicense}"`);
        }
        // 5. Check against allowed list
        const licensesToCheck = [pkgLicense, detectedLicense].filter(Boolean);
        const disallowedLicenses = licensesToCheck.filter((lic) => !config.allowedLicenses.includes(lic));
        if (disallowedLicenses.length > 0) {
            return {
                name: "licenses",
                status: "fail",
                severity: "critical",
                message: `🚨 Disallowed license(s) found: ${disallowedLicenses.join(", ")}`,
                details: {
                    packageJson: pkgLicense,
                    licenseFile: detectedLicense,
                    allowed: config.allowedLicenses,
                    disallowed: disallowedLicenses,
                },
                suggestions: [
                    `Change to an allowed license: ${config.allowedLicenses.join(", ")}`,
                    "Update both package.json and LICENSE file",
                    "Consult legal team if needed",
                ],
            };
        }
        // 6. Report results
        if (issues.length > 0) {
            return {
                name: "licenses",
                status: "fail",
                severity: "error",
                message: "License compliance issues detected",
                details: {
                    issues,
                    warnings,
                    packageJson: pkgLicense,
                    licenseFile: detectedLicense,
                },
                suggestions: [
                    "Ensure package.json and LICENSE file match",
                    "Use the same license identifier in both",
                    "Regenerate LICENSE file if needed",
                ],
            };
        }
        if (warnings.length > 0) {
            return {
                name: "licenses",
                status: "warn",
                severity: "warning",
                message: "License configuration could be improved",
                details: {
                    warnings,
                    packageJson: pkgLicense,
                    licenseFile: licenseFile ? `${licenseFile} (${detectedLicense})` : undefined,
                },
                suggestions: warnings.map((w) => `Fix: ${w}`),
            };
        }
        return {
            name: "licenses",
            status: "pass",
            severity: "info",
            message: `✅ License: ${pkgLicense || detectedLicense} (allowed)`,
            details: {
                packageJson: pkgLicense,
                licenseFile: licenseFile ? `${licenseFile} (${detectedLicense})` : undefined,
                allowed: config.allowedLicenses,
            },
        };
    }
    catch (error) {
        return {
            name: "licenses",
            status: "fail",
            severity: "error",
            message: "Could not check licenses",
            details: error.message,
        };
    }
};
// --- Additional optional checks ---
const checkPublishDryRun = async (config) => {
    if (!config.publishDryRun) {
        return {
            name: "publish dry-run",
            status: "skip",
            severity: "info",
            message: "Publish dry-run disabled (set security.publishDryRun=true to enable)",
        };
    }
    try {
        const result = await spawnCommand("npm", ["pack", "--dry-run"], {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024,
        });
        return {
            name: "publish dry-run",
            status: "pass",
            severity: "info",
            message: "npm pack --dry-run completed",
            details: result.stdout.slice(0, 8000),
            suggestions: ["Review pack output before publishing"],
        };
    }
    catch (error) {
        return {
            name: "publish dry-run",
            status: "warn",
            severity: "warning",
            message: "Publish dry-run failed or returned warnings",
            details: error.stdout || error.message,
            suggestions: ["Run 'npm pack --dry-run' locally to inspect package contents"],
        };
    }
};
const checkSbomGeneration = async (config) => {
    if (!config.generateSbom) {
        return {
            name: "sbom",
            status: "skip",
            severity: "info",
            message: "SBOM generation disabled (set security.generateSbom=true to enable)",
        };
    }
    try {
        const reportsDir = path.join(process.cwd(), "reports");
        // FIX #7: Atomic directory creation without race condition
        try {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        catch (err) {
            if (err.code !== "EEXIST") {
                throw err;
            }
        }
        const result = await spawnCommand("npm", ["ls", "--all", "--json"], {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024,
        });
        const sbomPath = path.join(reportsDir, "sbom-npm-ls.json");
        fs.writeFileSync(sbomPath, result.stdout, "utf-8");
        return {
            name: "sbom",
            status: "pass",
            severity: "info",
            message: "Basic SBOM generated via 'npm ls'",
            details: { path: sbomPath },
            suggestions: ["Consider generating CycloneDX SBOM for standards compliance"],
        };
    }
    catch (error) {
        return {
            name: "sbom",
            status: "warn",
            severity: "warning",
            message: "Could not generate SBOM via 'npm ls'",
            details: error.stdout || error.message,
            suggestions: ["Install CycloneDX tooling or run 'npm ls --all --json' manually"],
        };
    }
};
/**
 * FIX #5: Use native fetch API with proper error handling
 * FIXED: HTTPS without certificate validation
 */
const checkTyposquatting = async (config) => {
    var _a;
    if (!config.checkRegistry) {
        return {
            name: "typosquatting",
            status: "skip",
            severity: "info",
            message: "Registry checks disabled (set security.checkRegistry=true to enable)",
        };
    }
    try {
        const pkgPath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(pkgPath)) {
            return {
                name: "typosquatting",
                status: "skip",
                severity: "info",
                message: "No package.json found",
            };
        }
        const pkgContent = fs.readFileSync(pkgPath, "utf-8");
        const pkg = safeParseJSON(pkgContent, "package.json");
        const name = pkg.name;
        if (!name) {
            return {
                name: "typosquatting",
                status: "warn",
                severity: "warning",
                message: "Package name missing in package.json",
            };
        }
        const regUrl = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
        // FIX: Use fetch with proper timeout and headers
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(regUrl, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "security-reporter/1.0.0",
                },
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`Registry returned ${response.status}`);
            }
            const info = (await response.json());
            const latest = (_a = info["dist-tags"]) === null || _a === void 0 ? void 0 : _a.latest;
            const maintainers = info.maintainers || [];
            return {
                name: "typosquatting",
                status: "pass",
                severity: "info",
                message: `Registry lookup for ${name} succeeded`,
                details: { latest, maintainersCount: maintainers.length },
                suggestions: ["Verify maintainer list and download counts manually if package is new"],
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch (error) {
        return {
            name: "typosquatting",
            status: "warn",
            severity: "warning",
            message: "Could not query npm registry",
            details: error.message,
            suggestions: ["Run registry checks locally or enable network access"],
        };
    }
};
// ============================================================================
// UTILITY FUNCTIONS - Security Helpers
// ============================================================================
/**
 * FIX #4: Safe JSON parsing with validation
 * FIXED: Unsafe JSON.parse() from untrusted sources
 */
const MAX_JSON_SIZE = 1024 * 1024; // 1MB
const safeParseJSON = (content, source) => {
    // Check size
    if (content.length > MAX_JSON_SIZE) {
        throw new Error(`${source} is too large (${content.length} bytes, max ${MAX_JSON_SIZE})`);
    }
    try {
        const parsed = JSON.parse(content);
        // Validate it's an object
        if (typeof parsed !== "object" || parsed === null) {
            throw new Error(`${source} must contain a JSON object`);
        }
        return parsed;
    }
    catch (error) {
        throw new Error(`Failed to parse ${source}: ${error.message}`);
    }
};
const spawnCommand = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        const { timeout = 30000, maxBuffer = 10 * 1024 * 1024 } = options;
        const proc = (0, child_process_1.spawn)(command, args, {
            cwd: process.cwd(),
            env: process.env,
        });
        let stdout = "";
        let stderr = "";
        let killed = false;
        // Set timeout
        const timer = setTimeout(() => {
            killed = true;
            proc.kill();
            reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
        proc.stdout.on("data", (data) => {
            stdout += data.toString();
            if (stdout.length > maxBuffer) {
                killed = true;
                proc.kill();
                reject(new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`));
            }
        });
        proc.stderr.on("data", (data) => {
            stderr += data.toString();
            if (stderr.length > maxBuffer) {
                killed = true;
                proc.kill();
                reject(new Error(`Error output exceeded maxBuffer (${maxBuffer} bytes)`));
            }
        });
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (!killed) {
                if (code === 0 || code === 1) {
                    // npm audit returns 1 if vulnerabilities found
                    resolve({ stdout, stderr, code: code || 0 });
                }
                else {
                    const error = new Error(`Command failed with exit code ${code}`);
                    error.stdout = stdout;
                    error.stderr = stderr;
                    error.code = code;
                    reject(error);
                }
            }
        });
        proc.on("error", (err) => {
            clearTimeout(timer);
            if (!killed) {
                reject(err);
            }
        });
    });
};
//# sourceMappingURL=security.js.map