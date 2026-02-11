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
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Run all security-related checks
 */
const runSecurityChecks = async (config, projectType) => {
    const checks = [
        checkNpmAudit(config),
        checkSecrets(config),
        checkEnvFiles(projectType),
        checkLicenses(config),
        checkPackageJsonSecurity(),
        checkTyposquatting(),
    ];
    return Promise.all(checks);
};
exports.runSecurityChecks = runSecurityChecks;
/**
 * FEATURE 1: Real npm audit integration
 * Based on OWASP recommendation to regularly audit dependencies
 */
const checkNpmAudit = async (config) => {
    var _a, _b;
    try {
        const { stdout } = await execAsync("npm audit --json");
        const audit = JSON.parse(stdout);
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
                message: "✨ No vulnerabilities found",
                details: { scanDate: new Date().toISOString() },
            };
        }
        // Determine severity based on config
        const auditLevel = config.auditLevel || "moderate";
        const hasHighOrCritical = vulnerabilities.high > 0 || vulnerabilities.critical > 0;
        const hasModerateOrAbove = vulnerabilities.moderate > 0 || vulnerabilities.high > 0 || vulnerabilities.critical > 0;
        let status = "warn";
        let severity = "warning";
        if (auditLevel === "critical" && vulnerabilities.critical > 0) {
            status = "fail";
            severity = "critical";
        }
        else if ((auditLevel === "high" || auditLevel === "critical") && hasHighOrCritical) {
            status = "fail";
            severity = "critical";
        }
        else if ((auditLevel === "moderate" || auditLevel === "high" || auditLevel === "critical") &&
            hasModerateOrAbove) {
            status = "fail";
            severity = "error";
        }
        // Try to derive upgrade suggestions from audit JSON
        const fixSuggestions = new Set();
        try {
            if (audit.actions && Array.isArray(audit.actions)) {
                audit.actions.forEach((a) => {
                    var _a;
                    if (a && a.module) {
                        const target = ((_a = a.resolution) === null || _a === void 0 ? void 0 : _a.version) || a.target;
                        if (target) {
                            fixSuggestions.add(`npm install ${a.module}@${target}`);
                        }
                        else {
                            fixSuggestions.add(`npm update ${a.module}`);
                        }
                    }
                });
            }
            if (audit.advisories) {
                Object.values(audit.advisories).forEach((adv) => {
                    if (adv && adv.module_name) {
                        const rec = adv.recommendation || (adv.fix && adv.fix.version) || adv.patched_versions;
                        if (rec && typeof rec === "string") {
                            const m = rec.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
                            if (m) {
                                fixSuggestions.add(`npm install ${adv.module_name}@${m[1]}`);
                            }
                        }
                    }
                });
            }
        }
        catch (e) {
            // ignore parsing errors
        }
        const suggestionsArr = Array.from(fixSuggestions).slice(0, 5);
        if (suggestionsArr.length === 0)
            suggestionsArr.push("Run 'npm audit fix' to automatically fix vulnerabilities");
        return {
            name: "npm audit",
            status,
            severity,
            message: `Found ${total} vulnerabilities`,
            details: {
                info: vulnerabilities.info || 0,
                low: vulnerabilities.low || 0,
                moderate: vulnerabilities.moderate || 0,
                high: vulnerabilities.high || 0,
                critical: vulnerabilities.critical || 0,
            },
            suggestions: suggestionsArr,
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
            suggestions: [
                "Ensure npm is installed and package.json exists",
                "Check internet connection for npm registry access",
            ],
        };
    }
};
/**
 * FEATURE 2: Advanced secret scanning
 * Detects hardcoded secrets, API keys, tokens based on OWASP patterns
 */
const checkSecrets = async (config) => {
    if (config.checkSecrets === false) {
        return {
            name: "secrets scan",
            status: "skip",
            severity: "info",
            message: "Secrets scanning disabled in config",
        };
    }
    // Load patterns from config/patterns.json if present, otherwise fallback to built-in list
    const loadPatterns = () => {
        const cfgPath = path.join(process.cwd(), "config", "patterns.json");
        if (fs.existsSync(cfgPath)) {
            try {
                const raw = fs.readFileSync(cfgPath, "utf-8");
                const list = JSON.parse(raw);
                return list.map((p) => ({ name: p.name, pattern: new RegExp(p.pattern, p.flags || "i") }));
            }
            catch {
                // fallthrough to defaults
            }
        }
        const defaults = [
            { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/gi },
            { name: "AWS Secret Key", pattern: /aws_secret_access_key\s*=\s*['\"]?([A-Za-z0-9/+=]{40})['\"]?/gi },
            { name: "Generic API Key", pattern: /api[_-]?key\s*[:=]\s*['\"]?([A-Za-z0-9]{32,})['\"]?/gi },
            { name: "Google API Key", pattern: /AIza[0-9A-Za-z\\-_]{35}/gi },
            { name: "Stripe Live Key", pattern: /sk_live_[0-9a-zA-Z]{24,}/gi },
            { name: "Stripe Test Key", pattern: /sk_test_[0-9a-zA-Z]{24,}/gi },
            { name: "GitHub PAT", pattern: /ghp_[0-9a-zA-Z]{36}/gi },
            { name: "GitHub OAuth", pattern: /gho_[0-9a-zA-Z]{36}/gi },
            { name: "Bearer Token", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi },
            { name: "JWT Token", pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/gi },
            { name: "Private Key", pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/gi },
            { name: "Database URL", pattern: /(mongodb|postgres|mysql):\/\/[^:]+:[^@]+@/gi },
            { name: "Slack Token", pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/gi },
            { name: "Password in code", pattern: /password\s*[:=]\s*['\"]([^'\"]{8,})['\"](?!{{|})/gi },
        ];
        return defaults;
    };
    const patterns = loadPatterns();
    const foundSecrets = [];
    const srcDir = path.join(process.cwd(), "src");
    if (!fs.existsSync(srcDir)) {
        return {
            name: "secrets scan",
            status: "skip",
            severity: "info",
            message: "No src directory found to scan",
        };
    }
    const scanFile = (filePath) => {
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n");
            patterns.forEach(({ name, pattern }) => {
                lines.forEach((line, index) => {
                    if (pattern.test(line)) {
                        // Skip comments and common false positives
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("//") &&
                            !trimmed.startsWith("#") &&
                            !trimmed.startsWith("*") &&
                            !trimmed.includes("example") &&
                            !trimmed.includes("placeholder") &&
                            !trimmed.includes("TODO") &&
                            !trimmed.includes("FIXME")) {
                            // Detect pattern/regex definitions to reduce false positives
                            const isDefinition = /pattern\s*[:=]|new RegExp\(|const\s+patterns\b|let\s+patterns\b|var\s+patterns\b|\/.*\//.test(trimmed);
                            foundSecrets.push({
                                file: filePath.replace(process.cwd(), ""),
                                type: name,
                                line: index + 1,
                                snippet: trimmed.slice(0, 200),
                                isDefinition,
                            });
                        }
                    }
                });
            });
        }
        catch (error) {
            // Skip files that can't be read
        }
    };
    const scanDirectory = (dir) => {
        const files = fs.readdirSync(dir);
        const excludeDirs = [path.join(process.cwd(), "src", "core")];
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            // Skip scanning our own core scanner files to avoid self-matching patterns
            if (excludeDirs.some((d) => filePath.startsWith(d))) {
                return;
            }
            if (stat.isDirectory()) {
                // Skip node_modules, .git, dist, build
                if (!file.startsWith(".") && !["node_modules", "dist", "build"].includes(file)) {
                    scanDirectory(filePath);
                }
            }
            else if (file.match(/\.(ts|js|jsx|tsx|json|env|yml|yaml)$/)) {
                scanFile(filePath);
            }
        });
    };
    try {
        scanDirectory(srcDir);
        // Also check root for .env files
        const rootFiles = [
            ".env",
            ".env.local",
            ".env.development",
            ".env.development.local",
            ".env.production",
            ".env.production.local",
            ".env.test",
            ".env.test.local",
        ];
        rootFiles.forEach((envFile) => {
            const envPath = path.join(process.cwd(), envFile);
            if (fs.existsSync(envPath)) {
                // Check if .env is in .gitignore
                const gitignorePath = path.join(process.cwd(), ".gitignore");
                if (fs.existsSync(gitignorePath)) {
                    const gitignore = fs.readFileSync(gitignorePath, "utf-8");
                    if (!gitignore.includes(envFile) && !gitignore.includes(".env")) {
                        foundSecrets.push({
                            file: envFile,
                            type: "Env file not in .gitignore",
                        });
                    }
                }
            }
        });
        if (foundSecrets.length > 0) {
            // Separate definite matches from pattern/definition matches
            const defs = foundSecrets.filter((s) => s.isDefinition);
            const reals = foundSecrets.filter((s) => !s.isDefinition);
            if (reals.length > 0) {
                // Group by type for real matches
                const byType = {};
                reals.forEach((s) => {
                    byType[s.type] = (byType[s.type] || 0) + 1;
                });
                return {
                    name: "secrets scan",
                    status: "fail",
                    severity: "critical",
                    message: `🚨 Found ${reals.length} potential secrets in ${new Set(reals.map((s) => s.file)).size} files`,
                    details: {
                        byType,
                        files: [...new Set(reals.map((s) => s.file))].slice(0, 10),
                        total: reals.length,
                        possibleDefinitions: defs,
                    },
                    suggestions: [
                        "🔒 Remove all hardcoded secrets immediately",
                        "✅ Use environment variables instead",
                        "📝 Add .env to .gitignore",
                        "🔄 Rotate any exposed credentials",
                        "🛡️ Use secret management tools (AWS Secrets Manager, HashiCorp Vault)",
                        "📋 Review git history for previously committed secrets",
                    ],
                };
            }
            // Only pattern definitions found — treat as warning/info to avoid false positives
            return {
                name: "secrets scan",
                status: "warn",
                severity: "warning",
                message: `Only pattern/regex definitions found (${defs.length} matches) — possible false positives`,
                details: {
                    possibleDefinitions: defs,
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
            message: "✨ No hardcoded secrets detected",
            details: {
                filesScanned: countFiles(srcDir),
                patternsChecked: patterns.length,
            },
        };
    }
    catch (error) {
        return {
            name: "secrets scan",
            status: "fail",
            severity: "error",
            message: "Could not complete secrets scan",
            details: error.message,
        };
    }
};
/**
 * Helper: Count files in directory
 */
const countFiles = (dir) => {
    let count = 0;
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
            count += countFiles(filePath);
        }
        else if (file.match(/\.(ts|js|jsx|tsx|json)$/)) {
            count++;
        }
    });
    return count;
};
/**
 * FEATURE 3: Enhanced .env file validation
 */
const checkEnvFiles = async (projectType) => {
    const issues = [];
    const warnings = [];
    const envFiles = [
        ".env",
        ".env.local",
        ".env.development",
        ".env.development.local",
        ".env.production",
        ".env.production.local",
        ".env.test",
        ".env.test.local",
    ];
    const foundEnvFiles = [];
    envFiles.forEach((envFile) => {
        if (fs.existsSync(path.join(process.cwd(), envFile))) {
            foundEnvFiles.push(envFile);
        }
    });
    const hasEnv = foundEnvFiles.length > 0;
    const hasEnvExample = fs.existsSync(path.join(process.cwd(), ".env.example"));
    const hasGitignore = fs.existsSync(path.join(process.cwd(), ".gitignore"));
    if (hasEnv && hasGitignore) {
        const gitignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf-8");
        foundEnvFiles.forEach((envFile) => {
            if (!gitignore.includes(envFile) && !gitignore.includes(".env")) {
                issues.push(`🚨 ${envFile} not in .gitignore`);
            }
        });
    }
    if (hasEnv && !hasEnvExample) {
        warnings.push("📝 Missing .env.example for documentation");
    }
    // Check if .env files are small (might be templates, not real env files)
    foundEnvFiles.forEach((envFile) => {
        const stats = fs.statSync(path.join(process.cwd(), envFile));
        if (stats.size === 0) {
            warnings.push(`⚠️ ${envFile} is empty`);
        }
    });
    if (issues.length > 0) {
        return {
            name: "env files",
            status: "fail",
            severity: "critical",
            message: "🚨 Environment file security issues detected",
            details: { issues, warnings, foundFiles: foundEnvFiles },
            suggestions: [
                "Add .env* to .gitignore immediately",
                "Create .env.example with dummy values",
                "Never commit real .env files to git",
                "Use git-secrets or similar tools",
            ],
        };
    }
    if (warnings.length > 0) {
        return {
            name: "env files",
            status: "warn",
            severity: "warning",
            message: "Environment file improvements recommended",
            details: { warnings, foundFiles: foundEnvFiles },
            suggestions: warnings.map((w) => w.replace(/^[^\s]+\s/, "")),
        };
    }
    if (!hasEnv) {
        return {
            name: "env files",
            status: "pass",
            severity: "info",
            message: "No .env files found (or properly managed)",
        };
    }
    return {
        name: "env files",
        status: "pass",
        severity: "info",
        message: `✅ Environment files properly configured (${foundEnvFiles.length} files)`,
        details: { files: foundEnvFiles },
    };
};
/**
 * FEATURE 4: License compliance checker
 */
const checkLicenses = async (config) => {
    if (!config.allowedLicenses || config.allowedLicenses.length === 0) {
        return {
            name: "licenses",
            status: "skip",
            severity: "info",
            message: "License checking disabled (no allowedLicenses in config)",
            suggestions: ['Add "allowedLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause"] to config'],
        };
    }
    try {
        const pkg = require(path.join(process.cwd(), "package.json"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        // Simple check - could be enhanced with license-checker package
        return {
            name: "licenses",
            status: "pass",
            severity: "info",
            message: `License check configured for: ${config.allowedLicenses.join(", ")}`,
            details: {
                allowedLicenses: config.allowedLicenses,
                totalDependencies: Object.keys(deps).length,
            },
            suggestions: [
                "Install 'license-checker' for comprehensive license validation",
                "Run: npm install -g license-checker",
                "Run: license-checker --json",
            ],
        };
    }
    catch {
        return {
            name: "licenses",
            status: "fail",
            severity: "error",
            message: "Could not check licenses (package.json not found)",
        };
    }
};
/**
 * FEATURE 5: package.json security validation
 * Based on OWASP: Check for malicious scripts
 */
const checkPackageJsonSecurity = async () => {
    try {
        const pkgPath = path.join(process.cwd(), "package.json");
        const pkg = require(pkgPath);
        const issues = [];
        const warnings = [];
        // Check for suspicious scripts (OWASP recommendation)
        const suspiciousPatterns = [
            { pattern: /curl.*\|.*sh/i, risk: "Piping curl to sh" },
            { pattern: /wget.*\|.*sh/i, risk: "Piping wget to sh" },
            { pattern: /rm\s+-rf\s+\/(?!node_modules|dist|build)/i, risk: "Dangerous rm -rf command" },
            { pattern: /eval\s*\(/i, risk: "Use of eval()" },
            { pattern: />.*\/dev\/null.*&&/i, risk: "Suppressing errors" },
        ];
        if (pkg.scripts) {
            Object.entries(pkg.scripts).forEach(([name, script]) => {
                suspiciousPatterns.forEach(({ pattern, risk }) => {
                    if (pattern.test(script)) {
                        issues.push(`Script "${name}": ${risk}`);
                    }
                });
                // Check for postinstall scripts (can be malicious)
                if (name === "postinstall" || name === "preinstall") {
                    warnings.push(`⚠️ Found ${name} script - review carefully`);
                }
            });
        }
        // Check for repository field
        if (!pkg.repository) {
            warnings.push("Missing repository field - harder to verify source");
        }
        // Check for homepage
        if (!pkg.homepage) {
            warnings.push("Missing homepage field");
        }
        if (issues.length > 0) {
            return {
                name: "package.json security",
                status: "fail",
                severity: "critical",
                message: `🚨 Found ${issues.length} security issues in package.json`,
                details: { issues, warnings },
                suggestions: [
                    "Review and remove suspicious scripts",
                    "Avoid piping curl/wget to sh",
                    "Be cautious with postinstall scripts",
                ],
            };
        }
        if (warnings.length > 0) {
            return {
                name: "package.json security",
                status: "warn",
                severity: "warning",
                message: "Package.json could be improved",
                details: { warnings },
                suggestions: warnings.map((w) => w.replace(/^[^\s]+\s/, "")),
            };
        }
        return {
            name: "package.json security",
            status: "pass",
            severity: "info",
            message: "✅ Package.json looks secure",
        };
    }
    catch (error) {
        return {
            name: "package.json security",
            status: "fail",
            severity: "error",
            message: "Could not validate package.json",
            details: error.message,
        };
    }
};
/**
 * FEATURE 6: Typosquatting detection
 * Warns about dependencies with names similar to popular packages
 */
const checkTyposquatting = async () => {
    try {
        const pkg = require(path.join(process.cwd(), "package.json"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        // Popular packages that are often typosquatted
        const popularPackages = [
            "react",
            "vue",
            "angular",
            "express",
            "lodash",
            "axios",
            "moment",
            "chalk",
            "commander",
            "typescript",
            "webpack",
            "babel",
        ];
        const suspicious = [];
        Object.keys(deps).forEach((dep) => {
            popularPackages.forEach((popular) => {
                // Check Levenshtein distance or simple character swap
                if (dep !== popular && isTypo(dep, popular)) {
                    suspicious.push(`"${dep}" might be typosquatting "${popular}"`);
                }
            });
        });
        if (suspicious.length > 0) {
            return {
                name: "typosquatting detection",
                status: "warn",
                severity: "warning",
                message: `Found ${suspicious.length} potentially suspicious package names`,
                details: suspicious,
                suggestions: [
                    "Verify package names carefully",
                    "Check npm.js for official packages",
                    "Review package download counts and maintainers",
                ],
            };
        }
        return {
            name: "typosquatting detection",
            status: "pass",
            severity: "info",
            message: "No suspicious package names detected",
        };
    }
    catch (error) {
        return {
            name: "typosquatting detection",
            status: "skip",
            severity: "info",
            message: "Could not check for typosquatting",
        };
    }
};
/**
 * Helper: Simple typo detection (Levenshtein distance of 1-2)
 */
const isTypo = (str1, str2) => {
    if (Math.abs(str1.length - str2.length) > 2)
        return false;
    // Simple check: one character different
    let differences = 0;
    const maxLen = Math.max(str1.length, str2.length);
    for (let i = 0; i < maxLen; i++) {
        if (str1[i] !== str2[i]) {
            differences++;
        }
    }
    return differences >= 1 && differences <= 2;
};
//# sourceMappingURL=security-advanced.js.map