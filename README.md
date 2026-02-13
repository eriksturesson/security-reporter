# License: MIT © Erik Sturesson

# 🛡️ Security Reporter

> Security and quality reporter for Node.js projects

Security and quality reporting for Node.js projects — local scans that produce terminal output and shareable artifacts.

**IMPORTANT:** Add `/reports` to your project's `.gitignore` to avoid committing generated reports (e.g. `reports/security-report.json`, `reports/security-report.pdf`).

![npm version](https://img.shields.io/npm/v/security-reporter)
![npm downloads (monthly)](https://img.shields.io/npm/dm/security-reporter)
![npm license](https://img.shields.io/npm/l/security-reporter)

Install

```bash
# Global (run `security-reporter` directly)
npm install -g security-reporter

# Or add to your project
npm install --save-dev security-reporter

# Or run once with npx
npx security-reporter
```

Quickstart

1. From your project root run a scan:

```bash
# Run once
npx security-reporter

# Or via package.json script
npm run report
```

2. Open generated reports in `reports/`:

- `reports/security-report.json` — machine-readable JSON
- `reports/security-report.html` — human-friendly HTML
- `reports/security-report.pdf` — printable PDF

Highlights

- Local scans: `npm audit`, secret scanning, dependency and license checks
- Outputs: terminal, JSON, HTML and PDF
- Scans run locally by default; no data is transmitted externally. `.env` and other potential secrets are scanned locally and masked in reports.

  Note: optional registry/network checks are disabled by default. Some underlying tools (for example `npm audit`) may contact the npm registry when run.

See the full changelog for recent changes and release notes: [CHANGELOG.md](CHANGELOG.md).

CI example

```yaml
steps:
  - run: npm ci
  - run: npx security-reporter
  - upload: reports/
```

See the full changelog in [CHANGELOG.md](CHANGELOG.md).
