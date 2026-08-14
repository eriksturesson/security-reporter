# security-reporter — operating manual for agents

CLI (+ importable library) that scans a Node.js project for security and
quality issues and produces reports (terminal, JSON, Markdown, HTML, PDF).
Run it from any project root; it scans that whole project (not just `src/`
— also works with `app/`, `lib/`, flat repos, and monorepos).

**This is a published npm package** — see "Publishing" at the bottom before
touching version/release anything.

## What it actually checks

Four check groups, run in parallel by `runValidation()` in
`src/core/validators.ts` and combined into one `ValidationReport`:

- **`src/core/checks/security.ts`** — `npm audit` (via safe spawn, not
  `exec`), hardcoded-secret scanning (`config/patterns.json`, ReDoS-safe
  length-bounded regexes), `.env`/`.gitignore` hygiene, license compliance,
  package "publish safety" (`files` allowlist, risky lifecycle scripts),
  lockfile presence, and opt-in-only network checks (publish dry-run, SBOM
  via `npm ls`, typosquatting lookup against the npm registry).
- **`src/core/checks/quality.ts`** — unused deps (`depcheck`), outdated/
  duplicate deps (`npm ls`/`npm outdated` via spawn), circular-import
  detection (own import-graph walker in `src/core/utils/imports.ts`).
- **`src/core/checks/docker.ts`** — Dockerfile/`.dockerignore` presence,
  secret-shaped `ENV`/`ARG` values, `.dockerignore` coverage.
- **`src/core/checks/tests.ts`** — whether the *scanned* project's own test
  script actually runs.

Also: **cross-repo scan history** (`src/core/history.ts`) — every run
appends aggregate counts only (never file paths, contents, or secrets) to
`~/.security-reporter/history/`, so `security-reporter dashboard` (alias
`history`) can list every project scanned on this machine with its trend.
Override the store location with `SECURITY_REPORTER_HOME`, opt out per-run
with `--no-history`. Other env vars: `SECURITY_REPORT_ROOT` (override
detected project root), `DEBUG` (print stack traces on CLI error),
`SECURITY_REPORT_PROFESSIONAL` (drop emoji from `dashboard` output).

## Tech stack

- TypeScript, `strict: true`, compiled with plain `tsc` (no bundler) to
  CommonJS in `dist/`
- CLI via `commander`; terminal color via `chalk`
- `depcheck` for unused-dependency analysis; `puppeteer` to render the PDF
  report from the HTML report
- Tests: Vitest (config file is `Vitest.config.ts` — capital V)
- No linter configured — `npm run lint` is a no-op placeholder
- `engines.node >=16`; CI runs Node 18

## Layout

```
src/cli.ts                 CLI entry (commander setup, option parsing, config file loading)
src/index.ts                library entry point (what `import "security-reporter"` exposes)
src/core/validators.ts      runValidation() — orchestrates all four check groups in parallel
src/core/checks/            one file per check group: security.ts, quality.ts, docker.ts, tests.ts
src/core/reporter.ts        terminal / JSON / Markdown output
src/core/html-reporter.ts   HTML report — escapes all user-controlled content, sets CSP headers
src/core/pdf-reporter.ts    renders the HTML report to PDF via puppeteer
src/core/history.ts         cross-repo scan history (~/.security-reporter/history)
src/core/utils/             spawnCommand (safe spawn, never exec), fs-scanner (path-traversal /
                             symlink-safe walker), safeParseJSON, project-root resolution, import-graph helpers
src/interfaces/Types.ts     all shared types (GuardianConfig, CheckResult, ValidationReport, ...)
config/patterns.json        default secret-detection regex patterns (project can override)
test/                       Vitest tests — security.test.ts, docker.test.ts, fs-scanner.test.ts,
                             history.test.ts are the substantive ones; test.ts and test.spec.ts are
                             trivial leftover smoke tests, not real coverage
dist/                       compiled output — committed to git (not gitignored) and what actually
                             ships to npm; never hand-edit, always regenerate via `npm run build`
.github/workflows/ci.yml    npm ci --ignore-scripts, npm audit --audit-level=high, build, test, report
.github/workflows/release.yml   on GitHub release: build, test, CycloneDX SBOM (Syft), npm publish
```

## Build / test / lint

From `package.json` `scripts` (verify there before trusting this if it's
been a while):

- `npm run build` — cleans `dist/`, then `tsc -p tsconfig.json`
- `npm test` — runs `vitest`, **which defaults to watch mode outside CI**
  (no `CI` env var is set in an interactive/agent shell) — it will hang
  waiting for file changes instead of exiting. Use `npx vitest run` for a
  single pass, or `npx vitest run test/<file>` for one file. This is what
  CI and every past session in this repo actually invoke.
- `npm run report` / `npm start` / `npm run security-reporter` — all run
  the built CLI (`node ./dist/cli.js`) against whatever directory you run
  them from
- `npm run dev` — `ts-node src/cli.ts`, runs from TS source without a build
- `npm run lint` — placeholder only, does not lint anything
- `npm run clean` — removes `dist/`

## Code conventions observed

- Strict TypeScript, CommonJS, 2-space indent, double quotes, semicolons.
- Exported functions are `const fn = async (...) => {...}` arrow style,
  not `function` declarations.
- Every check returns a `CheckResult` (`{ name, status, severity, message,
  details?, suggestions? }`) instead of throwing — errors inside a check
  are caught and turned into a `fail`/`warn` result, never an unhandled
  rejection.
- Child processes always go through `spawnCommand()`
  (`src/core/utils/process.ts`), which uses `spawn()` with an argument
  array — never `exec()`/a shell string — specifically to prevent command
  injection. `test/security.test.ts` has a test
  (`should not use child_process.exec anywhere`) that greps the source to
  enforce this; don't reintroduce `exec`.
- JSON read from disk always goes through `safeParseJSON()` (size-capped)
  rather than a bare `JSON.parse()`.
- Regexes that scan arbitrary file content are deliberately length-bounded
  (e.g. `{10,500}`) to avoid ReDoS.
- Filesystem walking always goes through `walkProjectFiles()`
  (`src/core/utils/fs-scanner.ts`), which never follows symlinks and
  verifies every resolved path stays under the scanned root.
- User-controlled strings are HTML-escaped before going into the HTML
  report; dedicated XSS tests assert this and check for CSP/
  `X-Content-Type-Options`/`X-Frame-Options` headers in the output.
- Comments tagged `FIX #<N>:` mark spots patched during a past
  security-hardening pass — `test/security.test.ts` groups tests under
  matching `describe("Fix #N: ...")` blocks, and `CHANGELOG.md` has more
  context. Don't casually remove these protections without understanding
  what they're guarding against.
- Network access is opt-in and off by default everywhere (`checkRegistry`,
  `generateSbom`, etc.) — nothing calls out to the network unless a config
  flag explicitly enables it.

## Verifying a change works

- `npm run build && npx vitest run` — build must produce no `tsc` errors,
  then the full suite must pass. Don't rely on `npm test` alone (see watch
  mode caveat above).
- `npm pack --dry-run` — genuinely read-only, previews exactly what would
  ship in the published tarball (respects `files` in package.json). Good
  check after touching `package.json`, `dist/`, or `.gitignore`.
- To exercise the CLI against a real target: `npm run build && node
  dist/cli.js --format json --no-history`, run from some other project
  directory (or a scratch fixture dir) — `--no-history` keeps manual
  testing out of `~/.security-reporter/history`. Reports land in that
  target's `reports/` folder (gitignored there).
- `node dist/cli.js --version` / `--help` is a quick way to confirm a
  rebuild actually picked up your changes — the version is read live from
  `package.json` at runtime, not hardcoded.
- CI (`.github/workflows/ci.yml`) is the ground truth for "passing":
  `npm ci --ignore-scripts`, `npm audit --audit-level=high`,
  `npm run build`, `npm test`, `npm run report`.

## Publishing — published npm package, treat as high-risk

`package.json` has `bin` (`security-reporter` and `sr`), a `files`
allowlist, and `main`/`types`/`exports` — this is a real, installable
package, not just an app. It's live on the npm registry as
**`security-reporter`**. `npm publish` has been run directly from this
machine in the past (not only through `release.yml`'s automated publish
step on GitHub release), so this isn't a hypothetical.

**Never run `npm publish`, bump `npm version`, or push/create a
`release`-triggering GitHub release without Erik's explicit go-ahead in
that conversation.** `npm pack --dry-run` is safe and read-only — it does
not publish anything — and is fine to run freely to sanity-check package
contents.
