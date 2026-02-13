# Changelog

All notable changes to this project will be documented in this file.

## [1.0.8] - 2026-02-13

### Fix

- Now `npm audit` should work as part of the script

## [1.0.7] - 2026-02-12

### Changed

- Improve root detection and logging (work in progress): the tool now attempts to detect the true project root more robustly (supports `INIT_CWD`, walks up from `cwd`, and accepts `SECURITY_REPORT_ROOT` environment override). This should help when running from other repositories where `.env` or `package.json` previously were not discovered. Validation of this behavior across all external consumer repos is still in progress.

## [1.0.9] - 2026-02-13

### Fixed

- PDF report generation: PDFs are now always produced. Previously PDFs were only created if Puppeteer was installed optionally; the PDF generator is now bundled with this package.

- npm audit: Execution and parsing fixed since the last release. The report now surfaces detected vulnerabilities and additionally recommends running `npm audit fix` to attempt automated remediation.

## [1.0.7] - 2026-02-12

## [1.0.6] - 2026-02-12

### Fixed

- Removed `README_PUBLIC.md`
- Removed `FEATURE.md`
- Removed `COMPLETE_SETUP_GUIDE.md`
- Updated `README.md` (shortened/public notes moved)
- Renamed npm script: `security-report` → `security-reporter`

## [1.0.5] - 2026-02-12

### Fixed

- Fixed a recursion bug in `getProjectRoot()`.

## [1.0.4] - 2026-02-11

### Fixed

- Restored and removed debug instrumentation added during troubleshooting (console output and test log files).
- Fixed a recursion bug in `getProjectRoot()` so the project root now falls back to `process.cwd()` when `INIT_CWD` is missing.
- Removed temporary “simple grep” fallback for AKIA detection and returned to using configurable patterns.
- Restored strict test assertion in `test/security.test.ts` to require that secrets are detected in relevant tests.
- Now copies `config/patterns.json` in the test setup and sets `INIT_CWD` in tests for deterministic pattern loading.

## [1.0.3] - 2026-02-11

### Changed

- Improved .env file and .gitignore detection with support for modern variants and wildcards.
- Fixed npm audit execution for stability across all platforms (no ENOENT on Windows/npm v10+).
- Clearer and more robust output in secrets scanning and environment validation.

### Changed

- Bump version: `1.0.3` → `1.0.4`.

## [1.0.2] - 2026-02-11

### Changed

- Corrected and reset the changelog so it reflects the security-reporter and not another package.
- Clarified README with quickstart and script examples for npx and npm run security-reporter.

## [1.0.1] - 2026-02-11

### Changed

- Improved env file detection, gitignore matching, and npm audit execution
  - Updated npm audit execution to use px with shell support for better cross-platform compatibility and to avoid ENOENT issues.
  - Extended SpawnOptions to support shell, timeout, and maxBuffer cleanly.
  - Refactored env file checks:
    - Added full list of standard .env\* variants (.env.local, .env.development, .env.production, .env.test, and their .local versions).
    - Improved .gitignore parsing: trims whitespace, ignores comments, and supports wildcard patterns like .env\*.
    - Ensures that all existing env files are correctly ignored.
    - Robust detection of missing .env.example when .env exists.
  - Prevents false positives from strict string matching.
  - General cleanup and improved reliability of env file scanning.
- README and changelog corrected for security-reporter.
- `dist/` is no longer ignored for npm publishing.

## [1.0.0] - 2026-02-11

### Added

- First public version of security-reporter.
- CLI for security and quality reporting of Node.js projects.
- Support for report formats: terminal, JSON, HTML, Markdown, PDF.
- Scanning of vulnerabilities, secrets, dependencies, licenses, Docker, tests, and build.
- Basic CI/CD workflows and documentation.

---

Further changes will be recorded here following Keep a Changelog conventions.

## [1.0.9] - 2026-02-13

### Added

- PDF report generation: create a printable, shareable PDF alongside the existing JSON and HTML reports.

### Changed

- Removed `puppeteer` as an optional runtime dependency. The PDF generator no longer requires users to install `puppeteer` separately — the package now uses a lighter built-in path for PDF creation.
- Updated documentation (README) to highlight the new PDF output and simplified install instructions for beginners.

---
