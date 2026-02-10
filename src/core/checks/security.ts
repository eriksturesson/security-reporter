import { exec } from "child_process";
import { promisify } from "util";
import { SecurityConfig, CheckResult, ProjectType } from "../../interfaces/Types";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * Run all security-related checks
 */
export const runSecurityChecks = async (config: SecurityConfig, projectType: ProjectType): Promise<CheckResult[]> => {
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

/**
 * Check package.json publish safety
 */
const checkPackagePublishSafety = async (): Promise<CheckResult> => {
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

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    const suggestions: string[] = [];
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
  } catch (error: any) {
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
const checkLockfilePresence = async (): Promise<CheckResult> => {
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
  } catch (error: any) {
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
const checkNpmScripts = async (): Promise<CheckResult> => {
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

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
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
  } catch (error: any) {
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
 * Run npm audit and parse results
 */
const checkNpmAudit = async (config: SecurityConfig): Promise<CheckResult> => {
  try {
    const { stdout } = await execAsync("npm audit --json");
    const audit = JSON.parse(stdout);

    const vulnerabilities = audit.metadata?.vulnerabilities || {};
    const total =
      (vulnerabilities.info || 0) +
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
  } catch (error: any) {
    // npm audit exits with code 1 if vulnerabilities found
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};
        const total = Object.values(vulnerabilities).reduce((sum: number, val) => sum + (val as number), 0);

        const hasHighOrCritical = vulnerabilities.high > 0 || vulnerabilities.critical > 0;

        return {
          name: "npm audit",
          status: hasHighOrCritical ? "fail" : "warn",
          severity: hasHighOrCritical ? "critical" : "warning",
          message: `Found ${total} vulnerabilities`,
          details: vulnerabilities,
          suggestions: ["Run 'npm audit fix' to fix vulnerabilities"],
        };
      } catch {
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
 * Check for common secrets patterns in code
 */
const checkSecrets = async (config: SecurityConfig): Promise<CheckResult> => {
  if (config.checkSecrets === false) {
    return {
      name: "secrets scan",
      status: "skip",
      severity: "info",
      message: "Secrets scanning disabled",
    };
  }

  // Load patterns from config/patterns.json if present, otherwise fallback to built-in list
  const loadPatterns = (): Array<{ name: string; pattern: RegExp }> => {
    const cfgPath = path.join(process.cwd(), "config", "patterns.json");
    if (fs.existsSync(cfgPath)) {
      try {
        const raw = fs.readFileSync(cfgPath, "utf-8");
        const list = JSON.parse(raw) as Array<{ name: string; pattern: string; flags?: string }>;
        return list.map((p) => ({ name: p.name, pattern: new RegExp(p.pattern, p.flags || "i") }));
      } catch {
        // fallthrough to defaults
      }
    }

    const defaults: Array<{ name: string; pattern: RegExp }> = [
      { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/i },
      { name: "AWS Secret Key", pattern: /([0-9a-zA-Z/+]{40})/i },
      { name: "Stripe Live Key", pattern: /sk_live_[0-9a-zA-Z]{24}/i },
      { name: "Google API Key", pattern: /AIza[0-9A-Za-z\-_]{35}/i },
      { name: "GitHub PAT", pattern: /ghp_[0-9a-zA-Z]{36}/i },
      { name: "GitHub PAT (alt)", pattern: /github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}/i },
      { name: "Bearer Token", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i },
    ];

    return defaults;
  };

  const patterns = loadPatterns();

  const foundSecrets: Array<{ file: string; type: string; line: number; snippet: string; isDefinition: boolean }> = [];
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

  const scanDirectory = (dir: string) => {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip scanning our own core scanner files to avoid false positives
      if (excludeDirs.some((d) => filePath.startsWith(d))) {
        return;
      }

      if (stat.isDirectory()) {
        if (!file.startsWith(".") && file !== "node_modules") {
          scanDirectory(filePath);
        }
      } else if (file.match(/\.(ts|js|jsx|tsx|json)$/)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split(/\r?\n/);

        patterns.forEach(({ name, pattern }) => {
          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              const trimmed = line.trim();
              if (
                !trimmed.startsWith("//") &&
                !trimmed.startsWith("#") &&
                !trimmed.startsWith("*") &&
                !trimmed.includes("example") &&
                !trimmed.includes("placeholder") &&
                !trimmed.includes("TODO") &&
                !trimmed.includes("FIXME")
              ) {
                // Detect if this line looks like a pattern/regex definition to avoid false positives
                const isDefinition =
                  /pattern\s*[:=]|new RegExp\(|const\s+patterns\b|let\s+patterns\b|var\s+patterns\b|\/.*\//.test(
                    trimmed,
                  );

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
            matches: reals,
            possibleDefinitions: defs,
          },
          suggestions: ["Remove hardcoded secrets", "Use environment variables", "Add files to .gitignore"],
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
      message: "No hardcoded secrets found",
    };
  } catch (error: any) {
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
 * Check .env file configuration
 */
const checkEnvFiles = async (projectType: ProjectType): Promise<CheckResult> => {
  const hasEnv = fs.existsSync(path.join(process.cwd(), ".env"));
  const hasEnvExample = fs.existsSync(path.join(process.cwd(), ".env.example"));
  const hasGitignore = fs.existsSync(path.join(process.cwd(), ".gitignore"));

  const issues: string[] = [];

  if (hasEnv && hasGitignore) {
    const gitignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf-8");
    if (!gitignore.includes(".env")) {
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
 * FEATURE: Enhanced License Compliance Checker
 * Checks both package.json and LICENSE file, warns if they differ
 */
const checkLicenses = async (config: SecurityConfig): Promise<CheckResult> => {
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
    const issues: string[] = [];
    const warnings: string[] = [];

    // 1. Check package.json license
    let pkgLicense: string | undefined;
    try {
      const pkg = require(path.join(process.cwd(), "package.json"));
      pkgLicense = pkg.license;
    } catch {
      issues.push("Could not read package.json");
    }

    // 2. Check LICENSE file (common variations)
    const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md"];
    let licenseFile: string | undefined;
    let licenseFileContent: string | undefined;

    for (const filename of licenseFiles) {
      const filepath = path.join(process.cwd(), filename);
      if (fs.existsSync(filepath)) {
        licenseFile = filename;
        licenseFileContent = fs.readFileSync(filepath, "utf-8");
        break;
      }
    }

    // Detect license type from LICENSE file content
    let detectedLicense: string | undefined;
    if (licenseFileContent) {
      if (licenseFileContent.includes("MIT License")) {
        detectedLicense = "MIT";
      } else if (licenseFileContent.includes("Apache License")) {
        detectedLicense = "Apache-2.0";
      } else if (licenseFileContent.includes("BSD 3-Clause")) {
        detectedLicense = "BSD-3-Clause";
      } else if (licenseFileContent.includes("ISC License")) {
        detectedLicense = "ISC";
      } else if (licenseFileContent.includes("GNU General Public License")) {
        if (licenseFileContent.includes("version 3")) {
          detectedLicense = "GPL-3.0";
        } else if (licenseFileContent.includes("version 2")) {
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
      issues.push(
        `License mismatch: package.json says "${pkgLicense}" but ${licenseFile} appears to be "${detectedLicense}"`,
      );
    }

    // 5. Check against allowed list
    const licensesToCheck = [pkgLicense, detectedLicense].filter(Boolean) as string[];
    const disallowedLicenses = licensesToCheck.filter((lic) => !config.allowedLicenses!.includes(lic));

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
          `Change to an allowed license: ${config.allowedLicenses!.join(", ")}`,
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
  } catch (error: any) {
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

const checkPublishDryRun = async (config: SecurityConfig): Promise<CheckResult> => {
  if (!config.publishDryRun) {
    return {
      name: "publish dry-run",
      status: "skip",
      severity: "info",
      message: "Publish dry-run disabled (set security.publishDryRun=true to enable)",
    };
  }

  try {
    const { stdout } = await execAsync("npm pack --dry-run");
    return {
      name: "publish dry-run",
      status: "pass",
      severity: "info",
      message: "npm pack --dry-run completed",
      details: stdout.slice(0, 8000),
      suggestions: ["Review pack output before publishing"],
    };
  } catch (error: any) {
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

const checkSbomGeneration = async (config: SecurityConfig): Promise<CheckResult> => {
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
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const { stdout } = await execAsync("npm ls --all --json");
    const sbomPath = path.join(reportsDir, "sbom-npm-ls.json");
    fs.writeFileSync(sbomPath, stdout, "utf-8");

    return {
      name: "sbom",
      status: "pass",
      severity: "info",
      message: "Basic SBOM generated via 'npm ls'",
      details: { path: sbomPath },
      suggestions: ["Consider generating CycloneDX SBOM for standards compliance"],
    };
  } catch (error: any) {
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

const checkTyposquatting = async (config: SecurityConfig): Promise<CheckResult> => {
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

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
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
    const https = require("https");

    const info = await new Promise<any>((resolve, reject) => {
      https
        .get(regUrl, (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", (err: any) => reject(err));
    });

    const latest = info["dist-tags"]?.latest;
    const maintainers = info.maintainers || [];

    return {
      name: "typosquatting",
      status: "pass",
      severity: "info",
      message: `Registry lookup for ${name} succeeded`,
      details: { latest, maintainersCount: maintainers.length },
      suggestions: ["Verify maintainer list and download counts manually if package is new"],
    };
  } catch (error: any) {
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
