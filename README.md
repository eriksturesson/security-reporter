# License: MIT © Erik Sturesson

# 🛡️ Security Reporter

> Security and quality reporter for Node.js projects

**Quickstart:**
Add `/reports` to your `.gitignore`

Run:

```bash
npx security-reporter
```

Or add to your `package.json`:

```json
{
  "scripts": {
    "security-reporter": "security-reporter"
  }
}
```

![npm version](https://img.shields.io/npm/v/security-reporter)
![npm downloads (monthly)](https://img.shields.io/npm/dm/security-reporter)
![npm license](https://img.shields.io/npm/l/security-reporter)

Security Reporter is a local CLI tool that scans a repository for common security and quality issues and writes human- and machine-readable reports to `reports/`.

Quick facts:

- Runs entirely locally by default; network checks are opt‑in.
- Reports are written to the `reports/` directory. Add `/reports` to your `.gitignore` to avoid committing generated reports and SBOMs.
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

Security Reporter is a comprehensive security and quality scanning tool for Node.js projects. It performs security audits, scans for secrets, validates dependencies, and generates detailed reports in multiple formats (terminal, JSON, Markdown, PDF).

**⚠️ Privacy Promise:** This tool NEVER saves, stores, or transmits your `.env` files or secrets. All scanning is done locally, and sensitive data stays in your repository.

**📋 Important:** This is a reporting tool. It identifies security and quality issues but does not automatically fix them. You remain in full control of your codebase.

**📚 Inspired by:** [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

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
