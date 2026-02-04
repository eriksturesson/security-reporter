# 🛡️ Security Reporter - Complete Project Summary

## 📋 Namnbeslut & Konfiguration

**Valt paketnamn:** `security-reporter`

**NPM-script:** `npm run security-report` (med bindestreck för läsbarhet)

**CLI aliases:**

- `security-reporter` (huvudkommando)
- `sr` (kort version)

**Alternativa namn som övervägdes:**

- `code-security`, `code-reporter`, `dev-check`, `secure-coding`
- `repo-secure`, `security-report`, `security-check`

## 🎯 Vad är detta?

Security Reporter är ett **säkerhets- och kvalitetsrapporteringsverktyg** för Node.js-projekt. Det kombinerar flera olika säkerhetskontroller och kvalitetscheckar i ett enda kommando och genererar detaljerade rapporter.

### ⚠️ Viktiga principer

1. **Privacy First:** Vi sparar ALDRIG `.env` eller andra känsliga filer
2. **Rapportering, inte automatisk fix:** Verktyget identifierar problem, men åtgärdar dem inte automatiskt
3. **Lokal scanning:** Allt sker lokalt i ditt repo, ingen data skickas någonstans
4. **OWASP-baserad:** Följer [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

## 🔍 Funktioner

### Säkerhet 🔒

- ✅ **npm audit** - Inkluderat i standardchecks (OWASP-rekommenderat)
- ✅ **Secret scanning** - Hittar hårdkodade API-nycklar, tokens, lösenord
- ✅ **.env validering** - Ser till att .env inte exponeras eller kopieras
- ✅ **License checking** - Validerar att licenses är OK

### Kvalitet 📦

- ✅ **Unused dependencies** - Hittar oanvända paket
- ✅ **Duplicate dependencies** - Upptäcker dubbletter
- ✅ **Outdated packages** - Kollar föråldrade paket
- ✅ **Peer dependencies** - Validerar saknade peer deps

### Docker 🐳

- ✅ **Environment variables** - Kollar att .env inte kopieras in i image
- ✅ **Secrets** - Upptäcker hårdkodade secrets i Dockerfile
- ✅ **.dockerignore** - Validerar konfiguration

### Tester & Build 🧪

- ✅ **Test setup** - Kollar att tester finns
- ✅ **Build validation** - Verifierar att build fungerar

## 📊 Rapportformat

### 1. Console/Terminal (default)

Snygg, färglagd output med emojis och tydlig struktur:

```
════════════════════════════════════════════════════════════════════════════════
                         🛡️  SECURITY REPORTER
                       Security & Quality Report
════════════════════════════════════════════════════════════════════════════════
📊 Project Type: backend
⏱️  Execution Time: 1234ms
📅 2/4/2025, 10:30:00 AM
════════════════════════════════════════════════════════════════════════════════

🔴 CRITICAL SECURITY ISSUES

  🔴 NPM AUDIT [🔴 CRITICAL]
     ├─ Status: FAIL
     ├─ Message: Found 3 vulnerabilities
     └─ Details:
        ├─ high: 2
        └─ critical: 1
     💡 Suggestions:
        • Run 'npm audit fix'

⚠️  WARNINGS

  ⚠️  unused dependencies: Found 2 unused: lodash, moment
     💡 Review and remove unused dependencies

✅ PASSED CHECKS

  ✅ secrets scan
  ✅ env files
  ✅ peer dependencies

────────────────────────────────────────────────────────────────────────────────
                                 📊 SUMMARY
────────────────────────────────────────────────────────────────────────────────
  📋  Total Checks          13
  ✅  Passed                8
  ⚠️   Warnings              3
  ❌  Failed                1
  ⏭️   Skipped               1
════════════════════════════════════════════════════════════════════════════════

                   ❌ OVERALL STATUS: FAILED - Action Required

🔧 RECOMMENDED ACTIONS:

  1. Run 'npm audit fix'
  2. Review and remove unused dependencies

💡 Tip: Fix critical and error issues before deploying to production
```

### 2. Markdown (.md)

Perfekt för dokumentation och delning:

```markdown
# 🛡️ Security Report

**Generated:** 2025-02-04T09:30:00.000Z
**Project Type:** backend
**Execution Time:** 1234ms

## 📊 Summary

| Metric       | Count |
| ------------ | ----- |
| Total Checks | 13    |
| ✅ Passed    | 8     |
| ⚠️ Warnings  | 3     |
| ❌ Failed    | 1     |

## ❌ Failed Checks

### npm audit [CRITICAL]

**Message:** Found 3 vulnerabilities

**Details:**

- high: 2
- critical: 1

**Suggestions:**

- Run 'npm audit fix'

## Overall Status: ❌ FAILED
```

### 3. JSON

För CI/CD och automatisering:

```json
{
  "timestamp": "2025-02-04T09:30:00.000Z",
  "projectType": "backend",
  "overallStatus": "fail",
  "summary": {
    "total": 13,
    "passed": 8,
    "warnings": 3,
    "failed": 1
  },
  "checks": [...]
}
```

### 4. PDF (via Markdown)

Generera professionella PDF-rapporter:

```bash
security-reporter --format markdown --pdf
```

## 🚀 Användning

### Installation

```bash
# Globalt
npm install -g security-reporter

# I projekt
npm install --save-dev security-reporter

# Direkt med npx
npx security-reporter
```

### Grundläggande kommandon

```bash
# Kör alla checks (console output)
security-reporter

# Eller kort version
sr

# Generera config
security-reporter init

# Markdown-rapport
security-reporter --format markdown --output security-report.md

# JSON för CI/CD
security-reporter --format json --output report.json

# Alla format på en gång
security-reporter --format all

# Strict mode (warnings = failure)
security-reporter --strict
```

### I package.json

```json
{
  "scripts": {
    "security-report": "security-reporter",
    "security-report:md": "security-reporter --format markdown",
    "security-report:ci": "security-reporter --strict --format json",
    "precommit": "security-reporter --no-tests"
  }
}
```

## ⚙️ Konfiguration

Skapa `.securityrc.json`:

```json
{
  "projectType": "backend",
  "security": {
    "auditLevel": "moderate",
    "checkSecrets": true,
    "allowedLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"]
  },
  "quality": {
    "checkUnused": true,
    "checkDuplicates": true,
    "checkOutdated": true,
    "allowUnused": ["@types/*", "typescript", "prettier", "eslint"]
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

## 📁 Projektstruktur

```
security-reporter/
├── src/
│   ├── core/
│   │   ├── validator.ts       # Huvudvalidering
│   │   ├── reporter.ts        # Rapportformatering (Console, Markdown, JSON)
│   │   └── checks/
│   │       ├── security.ts    # Säkerhetscheckar (npm audit, secrets, etc)
│   │       ├── quality.ts     # Kvalitetscheckar (unused deps, etc)
│   │       ├── docker.ts      # Docker-säkerhet
│   │       └── tests.ts       # Test & build validering
│   ├── interfaces/
│   │   └── Types.ts           # TypeScript types
│   ├── cli.ts                 # CLI entry point
│   └── index.ts               # Public API
├── dist/                      # Kompilerad kod
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## 🎨 Design Philosophy

- ✅ **Functional programming** - Inga classes
- ✅ **TypeScript** - Strict mode
- ✅ **Modern ES2019+** - async/await
- ✅ **Privacy-focused** - Aldrig spara känslig data
- ✅ **OWASP-based** - Följer best practices
- ✅ **Beautiful output** - Emojis, färger, tydlig struktur

## 🔒 Säkerhet & Sekretess

### Vi sparar ALDRIG:

- ❌ .env-filer
- ❌ API-nycklar eller tokens
- ❌ Lösenord eller secrets
- ❌ Känslig projektinformation

### Vad vi gör:

- ✅ Scannrar lokalt i ditt repo
- ✅ Rapporterar fynd till konsolen/fil
- ✅ Ger förslag på åtgärder
- ✅ Låter dig behålla full kontroll

### Vad vi INTE gör:

- ❌ Skickar data till externa servrar
- ❌ Sparar rapporter automatiskt
- ❌ Ändrar din kod automatiskt
- ❌ Kräver internet-anslutning (förutom npm audit)

## 📦 Publicering

### Första gången

```bash
# 1. Logga in på npm
npm login

# 2. Bygg projektet
npm run build

# 3. Testa
npm test

# 4. Publicera
npm publish
```

### Uppdateringar

```bash
# Version bump
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Bygg och publicera
npm run build
npm publish
```

## 🎯 Användningsfall

### Före commit

```bash
npm run security-report
```

### I CI/CD (GitHub Actions)

```yaml
- name: Security Scan
  run: npx security-reporter --strict --format json
```

### För dokumentation

```bash
security-reporter --format markdown --output docs/security-report.md
```

### För chefer/stakeholders

```bash
security-reporter --format markdown --pdf
```

## 🔑 Nyckelfördelar

1. **Ett kommando** - Alla säkerhetscheckar på en gång
2. **Flera format** - Console, Markdown, JSON, PDF
3. **Privacy-focused** - Ingen data lämnar ditt repo
4. **OWASP-baserad** - Följer industry best practices
5. **CI/CD ready** - JSON output och exit codes
6. **Vacker output** - Tydliga, lätta att läsa rapporter
7. **npm audit inkluderat** - Standardcheck för sårbarheter

## 📚 Referenser

- **OWASP NPM Security:** https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html
- **npm audit:** https://docs.npmjs.com/cli/v10/commands/npm-audit
- **GitHub Repo:** https://github.com/eriksturesson/security-reporter

## 🚦 Exempel Output-jämförelse

### Tidigare (Basic)

```
Security Report:
Passed: 13  Warnings: 0  Errors: 0  Critical: 0
ERROR - npm audit (placeholder): OK
WARNING - Secret scanning (placeholder): OK
```

### Nu (Beautiful)

```
════════════════════════════════════════════════════════════════════════════════
                         🛡️  SECURITY REPORTER
════════════════════════════════════════════════════════════════════════════════
📊 Project Type: backend
⏱️  Execution Time: 1234ms

🔴 CRITICAL SECURITY ISSUES
  🔴 NPM AUDIT [🔴 CRITICAL]
     ├─ Status: FAIL
     ├─ Message: Found 3 vulnerabilities
     └─ Details: ...
     💡 Suggestions: Run 'npm audit fix'

────────────────────────────────────────────────────────────────────────────────
                                 📊 SUMMARY
────────────────────────────────────────────────────────────────────────────────
  ✅  Passed: 8    ⚠️   Warnings: 3
  ❌  Failed: 1    ⏭️   Skipped: 1
════════════════════════════════════════════════════════════════════════════════

                   ❌ OVERALL STATUS: FAILED - Action Required
```

## 🎉 Klar att börja!

```bash
# Steg 1: Bygg projektet
npm install
npm run build

# Steg 2: Testa lokalt
npm test
npm run security-report

# Steg 3: Publicera
npm publish

# Steg 4: Använd i dina repos
npx security-reporter
```

Lycka till med ditt säkerhetsarbete! 🛡️🚀
