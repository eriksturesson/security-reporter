# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-08-08

### Fixed

- **Secret scanning, unused-dependency detection, and circular-dependency detection now cover the whole project instead of only a `src/` folder.** Previously these checks silently skipped everything when a project used `app/`, `lib/`, a flat layout, or a monorepo `packages/*/src` structure — the most common cause of "checks don't seem to run in my other repos". The secrets scanner also dropped a leftover self-exclusion of a `src/core` folder that only made sense when scanning security-reporter's own repo.
- **Docker checks now actually check the filesystem.** `hasDockerfile` was previously hardcoded to `false`, so Docker checks always silently skipped even when a Dockerfile existed. They now detect `Dockerfile`/`.dockerignore`, flag hardcoded-looking secrets in `ENV`/`ARG` instructions, and verify `.dockerignore` covers `node_modules`/`.env`/`.git`.
- **Quality checks (unused/duplicate/outdated/peer dependencies) were placeholders that always reported "pass" without doing any work.** They're now real, backed by `depcheck` for unused-dependency analysis and `npm ls`/`npm outdated` (via `spawn`, not `exec`) for the rest.
- Fixed an inconsistency where some checks resolved the project root via `process.cwd()` and others via `INIT_CWD`, which could disagree depending on how the tool was invoked (global install, `npx`, or as a local devDependency). All checks now share one `getProjectRoot()` resolver, with a new `SECURITY_REPORT_ROOT` environment variable to override it explicitly when needed.
- `--pdf` no longer only works with `--format markdown` (and no longer points at the unrelated, uninstalled `markdown-pdf` package). PDF generation is now decoupled from the chosen output format.
- `security-reporter --version` reported a hardcoded `1.0.0` no matter which version was actually installed. It now reads the real version from the package.
- `npm run build` didn't clean `dist/` first, so stale output from old tsconfig layouts (`dist/test/`, `dist/types/`) kept shipping in every published tarball. `build` now cleans `dist/` before compiling.

### Added

- **Cross-repo scan history.** Every scan is recorded locally under `~/.security-reporter/history` (aggregate counts only — never file contents, paths, or secret values). Run `security-reporter dashboard` (alias: `history`) to see every project scanned on this machine, its last status, and how it's trending. Each scan also prints a one-line trend (`+2 failed, -1 warnings since last scan on ...`) compared to its previous run. Opt out per-run with `--no-history`, or relocate the store with the `SECURITY_REPORTER_HOME` environment variable.
- Real circular-dependency detection: builds an import graph from relative `import`/`require` specifiers across the project and reports actual cycles, instead of a placeholder that only suggested installing `madge`.

### Removed

- Deleted `src/core/security-advanced.ts` and `src/core/quality-advanced.ts` — an earlier, unused implementation (nothing imported them) that duplicated logic now implemented in `src/core/checks/*`, including some of the same command-injection and path-traversal issues already fixed there.
- Removed a stray debug script (`test-npm-audit.js`) from the repo root that wasn't wired into any npm script.

### Testing

- Added coverage for the new/previously-untested code: the shared file-walker's path-traversal and symlink protections, Docker checks (Dockerfile/`.dockerignore` detection, secret-shaped `ENV`/`ARG` detection), and the history/dashboard module (including that only aggregate counts — never check names, messages, or file paths — are ever written to the local history store).

## [1.0.9] - 2026-02-13

### Fixed

- PDF report generation: PDFs are now always produced. Previously PDFs were only created if Puppeteer was installed optionally; the PDF generator is now bundled with this package.

- npm audit: Execution and parsing fixed since the last release. The report now surfaces detected vulnerabilities and additionally recommends running `npm audit fix` to attempt automated remediation.

## [1.0.8] - 2026-02-13

### Fix

- Now `npm audit` should work as part of the script

## [1.0.7] - 2026-02-12

### Changed

- Improve root detection and logging (work in progress): the tool now attempts to detect the true project root more robustly (supports `INIT_CWD`, walks up from `cwd`, and accepts `SECURITY_REPORT_ROOT` environment override). This should help when running from other repositories where `.env` or `package.json` previously were not discovered. Validation of this behavior across all external consumer repos is still in progress.

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
