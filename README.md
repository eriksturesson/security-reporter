# Security Reporter — Quick Install & Run

Security Reporter is a local CLI tool that scans a repository for common security and quality issues and writes human- and machine-readable reports to `reports/`.

Quick facts:

- Runs entirely locally by default; network checks are opt‑in.
- Reports are written to the `reports/` directory (gitignored by default).
- The project is currently `private` to prevent accidental publishing.

Install (local/test):

```bash
# Install dev dependency
npm install --save-dev .

# Or run directly with npx from the repo root
npx ./dist/cli.js
```

Run the scan:

```bash
npm run report
# or
security-reporter
```

Output:

- `reports/security-report.json` (JSON report)
- `reports/security-report.html` (human-readable HTML)
- `reports/sbom-npm-ls.json` (optional, when enabled)

Security notes (short):

- The package is marked `private: true` to avoid accidental publish to npm.
- Install-time lifecycle scripts were removed to reduce risk; review `package.json` for any remaining scripts.
- If you must publish this package to npm, follow the public checklist in `README_PUBLIC.md` and remove `private` only when ready.

Want a public-ready guide or contribution guidelines? See `README_PUBLIC.md`, `CONTRIBUTING.md`, and `SECURITY.md`.

License: MIT © Erik Sturesson

# 🛡️ Security Reporter

> Security and quality reporter for Node.js projects

[![npm version](https://img.shields.io/npm/v/security-reporter.svg)](https://www.npmjs.com/package/security-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Security Reporter is a comprehensive security and quality scanning tool for Node.js projects. It performs security audits, scans for secrets, validates dependencies, and generates detailed reports in multiple formats (terminal, JSON, Markdown, PDF).

**⚠️ Privacy Promise:** This tool NEVER saves, stores, or transmits your `.env` files or secrets. All scanning is done locally, and sensitive data stays in your repository.

**📋 Important:** This is a reporting tool. It identifies security and quality issues but does not automatically fix them. You remain in full control of your codebase.

**📚 Based on:** [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

## ✨ Features

- 🔒 **Security Checks**
  - npm audit for vulnerabilities
  - Secret scanning in source code
  - .env file validation
  - License compliance checking

- 📦 **Quality Checks**
  - Unused dependencies detection
  - Duplicate dependencies
  - Outdated packages
  - Missing peer dependencies

- 🐳 **Docker Validation**
  - Environment variable security
  - .dockerignore configuration
  - Build argument validation

- 🧪 **Test Verification**
  - Test setup validation
  - Build script checking

- 📊 **Smart Reporting**
  - Terminal output with colors and emojis
  - JSON export for CI/CD
  - Executive summary
  - Actionable suggestions

## 📦 Installation

```bash
# Global installation (recommended)
npm install -g security-reporter

# Or use in project
npm install --save-dev security-reporter

# Or run directly with npx
npx security-reporter
```

## 🚀 Quick Start

```bash
# Run security scan
security-reporter

# Or use the short alias
sr

# Initialize config file
security-reporter init

# Generate Markdown report
security-reporter --format markdown --output security-report.md

# Generate JSON for CI/CD
security-reporter --format json --output report.json

# Strict mode (warnings fail CI)
security-reporter --strict
```

## ⚙️ Configuration

Create a `.guardianrc.json` file in your project root:

```json
{
  "projectType": "backend",
  "security": {
    "auditLevel": "moderate",
    "checkSecrets": true,
    "allowedLicenses": ["MIT", "Apache-2.0"]
  },
  "quality": {
    "checkUnused": true,
    "checkDuplicates": true,
    "checkOutdated": true,
    "allowUnused": ["@types/*"]
  },
  "docker": {
    "checkEnvInBuild": true,
    "requiredEnvVars": ["NODE_ENV"]
  },
  "tests": {
    "run": false
  }
}
```

### Project Types

- `backend` - Node.js backend projects (Express, Fastify, NestJS, etc.)
- `frontend` - Frontend projects (React, Vue, Angular, etc.)
- `fullstack` - Full-stack projects with both frontend and backend

Different project types have slightly different validation rules.

## 📋 Usage Examples

### Basic Usage

```bash
# Run all checks
repo-guardian

# Skip specific check categories
repo-guardian --no-docker --no-tests

# Specify project type
repo-guardian --project-type frontend
```

### CI/CD Integration

**GitHub Actions:**

```yaml
name: Code Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npx repo-guardian --strict --format json --output report.json
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: validation-report
          path: report.json
```

**GitLab CI:**

```yaml
validate:
  stage: test
  script:
    - npm install
    - npx repo-guardian --strict
  artifacts:
    when: always
    reports:
      junit: report.json
```

### Package.json Scripts

```json
{
  "scripts": {
    "validate": "repo-guardian",
    "validate:ci": "repo-guardian --strict --format json",
    "precommit": "repo-guardian --no-tests"
  }
}
```

### Programmatic Usage

```typescript
import { runValidation, reportToTerminal } from "repo-guardian";

const config = {
  projectType: "backend",
  security: {
    auditLevel: "high",
    checkSecrets: true,
  },
};

const report = await runValidation(config);
reportToTerminal(report);

if (report.overallStatus === "fail") {
  process.exit(1);
}
```

## 🔍 What Gets Checked?

### Security

- ✅ npm vulnerabilities (via `npm audit`)
- ✅ Hardcoded secrets (API keys, tokens, passwords)
- ✅ .env file exposure
- ✅ License compliance
- ✅ Outdated security patches

### Quality

- ✅ Unused dependencies
- ✅ Duplicate packages
- ✅ Outdated dependencies
- ✅ Missing peer dependencies
- ✅ Package size optimization

### Docker (if Dockerfile present)

- ✅ .env not copied into image
- ✅ Secrets not hardcoded
- ✅ .dockerignore configuration
- ✅ Build argument validation

### Tests & Build

- ✅ Test script configured
- ✅ Test files present
- ✅ Build script works
- ✅ TypeScript compilation

## 📊 Example Output

```
======================================================================
🛡️  Repo Guardian - Validation Report
======================================================================
Project Type: backend
Timestamp: 2025-01-15T10:30:00.000Z
Execution Time: 1234ms
======================================================================

❌ FAILED CHECKS:

  ❌ npm audit [🔴 CRITICAL]
     Found 3 vulnerabilities
     - high: 2
     - critical: 1
     💡 Suggestions:
        • Run 'npm audit fix' to fix vulnerabilities

⚠️  WARNINGS:

  ⚠️  unused dependencies [🟡 WARNING]
     Found 2 potentially unused dependencies
     - lodash
     - moment
     💡 Suggestions:
        • Review and remove unused dependencies

✅ PASSED CHECKS:

  ✓ secrets scan: No hardcoded secrets found
  ✓ env files: Environment files properly configured
  ✓ peer dependencies: All peer dependencies satisfied

======================================================================
SUMMARY:
  Total Checks: 12
  ✅ Passed: 8
  ⚠️  Warnings: 3
  ❌ Failed: 1
  ⏭️  Skipped: 0
======================================================================

Overall Status: ❌ FAIL
```

## 🎯 Use Cases

### For Developers

Run before committing to catch issues early:

```bash
# Add to pre-commit hook
npx repo-guardian --no-tests
```

### For Teams

Ensure consistent quality across all repos:

```bash
# Same config in all projects
repo-guardian init
# Customize .securityrc.json once, copy everywhere
```

### For CI/CD

Automated validation on every push:

```bash
repo-guardian --strict --format json
```

### For Managers

Get a quick overview of code quality:

```bash
repo-guardian --format json | jq '.summary'
```

## 🔧 Advanced Configuration

### Custom Audit Level

```json
{
  "security": {
    "auditLevel": "critical" // Only fail on critical vulnerabilities
  }
}
```

### Allow Specific Unused Packages

```json
{
  "quality": {
    "allowUnused": [
      "@types/*", // Type definitions
      "husky", // Git hooks
      "prettier" // Code formatter
    ]
  }
}
```

### Docker Security

```json
{
  "docker": {
    "checkEnvInBuild": true,
    "requiredEnvVars": ["NODE_ENV", "PORT", "DATABASE_URL"]
  }
}
```

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📝 License

MIT © Erik Sturesson

## 🔗 Links

- [GitHub Repository](https://github.com/eriksturesson/repo-guardian)
- [npm Package](https://www.npmjs.com/package/repo-guardian)
- [Issue Tracker](https://github.com/eriksturesson/repo-guardian/issues)

## Reports and Secure Sharing

By default `security-reporter` writes generated artifacts to a local `reports/` directory in the project root. This folder is added to `.gitignore` by default to avoid accidentally committing potentially sensitive information (vulnerability details, file paths, or traces of secrets).

Recommended handling of `reports/`:

- Keep `reports/` in `.gitignore` (default behavior).
- If you need to share a report, publish it as a CI artifact (GitHub Actions / GitLab artifacts) or upload it to a secured storage (private S3/Blob storage) and share a link.
- Avoid committing reports to the repo history — use release artifacts or encrypted storage when long-term archiving is required.

Opt-in features and how to enable them (OWASP-aligned):

- `publishDryRun` (boolean) — run `npm pack --dry-run` to validate what would be published. Enable via `.securityrc.json` under `security.publishDryRun`.
- `generateSbom` (boolean) — generate a basic SBOM via `npm ls --all --json` and write it to `reports/sbom-npm-ls.json`. Enable via `security.generateSbom`.
- `checkRegistry` (boolean) — optionally query the npm registry for the package name to surface maintainer/download metadata. Enable via `security.checkRegistry`.

Example `.securityrc.json` snippet to opt-in:

```json
{
  "security": {
    "auditLevel": "moderate",
    "checkSecrets": true,
    "publishDryRun": false,
    "generateSbom": false,
    "checkRegistry": false
  }
}
```

OWASP alignment

- This tool is designed to follow the OWASP NPM Security Cheat Sheet guidance: avoid pushing secrets, use lockfiles, run SCA scans, produce SBOMs, and validate publish contents before release. The checks implemented map to the condensed OWASP checklist (publish safety, lockfile, script safety, SCA/audit, SBOM guidance, registry checks).

If you want, I can also add a small GitHub Actions workflow template that runs the report on push and uploads `reports/security-report.json` as an artifact (recommended for secure sharing).

## 💬 Feedback

Found a bug? Have a suggestion? [Open an issue](https://github.com/eriksturesson/repo-guardian/issues)!
