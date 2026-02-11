# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-02-11

### Changed

- Förbättrad .env-fil- och .gitignore-detektering med stöd för moderna varianter och wildcards.
- Fixade npm audit-körning för stabilitet på alla plattformar (ingen ENOENT på Windows/npm v10+).
- Tydligare och robustare output i secrets scan och miljövalidering.

## [1.0.4] - 2026-02-11

### Fixed

- Återställt och tagit bort debug-instrumentering som lagts till under felsökning (konsolutskrifter och test-loggfiler).
- Fixade en rekursionsbugg i `getProjectRoot()` så projektrot nu faller tillbaka till `process.cwd()` när `INIT_CWD` saknas.
- Tog bort temporär "simple grep" fallback för AKIA-detektering och förlitade oss på konfigurerbara mönster igen.
- Återställde strikt testassertion i `test/security.test.ts` för att kräva att hemligheter detekteras i relevanta tester.
- Kopierar nu `config/patterns.json` i testuppsättningen och sätter `INIT_CWD` i testen för deterministisk mönsterinläsning.

### Changed

- Bump version: `1.0.3` -> `1.0.4`

## [1.0.2] - 2026-02-11

### Changed

- Rättade och nollställde changelog så den speglar security-reporter och inte ett annat paket.
- Förtydligade README med snabbstart och script-exempel för npx och npm run security-reporter.

## [1.0.1] - 2026-02-11

### Changed

- Improve env file detection, gitignore matching and npm audit execution
  - Updated npm audit execution to use px with shell support for better cross-platform compatibility and to avoid ENOENT issues.
  - Extended SpawnOptions to support shell, timeout and maxBuffer cleanly.
  - Refactored env file checks:
    - Added full list of standard .env\* variants (.env.local, .env.development, .env.production, .env.test, och deras .local-versioner).
    - Förbättrad .gitignore-parsing: trims whitespace, ignorerar kommentarer, och stöd för wildcard-mönster som .env\*.
    - Säkerställer att alla befintliga env-filer ignoreras korrekt.
    - Robust detektion av saknad .env.example när .env finns.
  - Förhindrar falska positiva vid strikt strängmatchning.
  - Allmän städning och förbättrad tillförlitlighet för env-filskanning.
- README och changelog rättade för security-reporter.
- dist/ ignoreras ej längre för npm publicering.

## [1.0.0] - 2026-02-11

### Added

- Första publika versionen av security-reporter.
- CLI för säkerhets- och kvalitetsrapportering av Node.js-projekt.
- Stöd för rapportformat: terminal, JSON, HTML, Markdown, PDF.
- Skanning av sårbarheter, hemligheter, beroenden, licenser, Docker, test och bygg.
- Grundläggande CI/CD-workflows och dokumentation.

---

Further changes will be recorded here following Keep a Changelog conventions.
