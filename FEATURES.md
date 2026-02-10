# 🚀 Security Reporter - Enhanced Features

## 📊 Alla nya features (12 stycken!)

### 🔒 Security Features

#### 1. **Real npm audit Integration** ✅

- Kör faktisk `npm audit` med JSON output
- Kategoriserar sårbarheter efter severity
- Konfigurerbara tröskelvärden (info, low, moderate, high, critical)
- Visar exakt antal sårbarheter per kategori
- Ger konkreta fix-förslag

**Användning:**

```json
{
  "security": {
    "auditLevel": "moderate" // Fail on moderate or above
  }
}
```

**Output:**

```
❌ npm audit [🔴 CRITICAL]
   Found 12 vulnerabilities
   - critical: 2
   - high: 5
   - moderate: 5
   💡 Run 'npm audit fix' to fix vulnerabilities
```

---

#### 2. **Advanced Secret Scanning** ✅

- 15+ pattern för secrets (AWS, Google, Stripe, GitHub, etc.)
- Scannrar all kod i src/
- Detekterar .env filer som inte är i .gitignore
- Smart filtering av false positives (kommentarer, exempel)
- Visar exakt fil och radnummer

**Detekterade secrets:**

- AWS Access Keys & Secret Keys
- Google API Keys
- Stripe Live/Test Keys
- GitHub Personal Access Tokens
- JWT Tokens
- Private Keys (RSA, EC)
- Database Connection Strings
- Slack Tokens
- Hardcoded Passwords

**Output:**

```
🚨 secrets scan [🔴 CRITICAL]
   Found 5 potential secrets in 3 files

   By type:
   - AWS Access Key: 2
   - GitHub PAT: 1
   - API Key: 2

   Files:
   - /src/config/aws.ts
   - /src/utils/github.ts

   💡 Remove hardcoded secrets immediately
   💡 Use environment variables
   💡 Rotate exposed credentials
```

---

#### 3. **Enhanced .env Validation** ✅

- Kollar alla .env varianter (.env, .env.local, .env.development, etc.)
- Verifierar .gitignore konfiguration
- Validerar .env.example existens
- Kollar om .env filer är tomma
- Ger säkerhetsrekommendationer

**Output:**

```
🚨 env files [🔴 CRITICAL]
   .env not in .gitignore
   Missing .env.example

   💡 Add .env* to .gitignore immediately
   💡 Create .env.example with dummy values
```

---

#### 4. **License Compliance Checker** ✅

- Validerar licenses mot whitelist
- Identifierar problematiska licenses
- Räknar totalt antal dependencies

**Användning:**

```json
{
  "security": {
    "allowedLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"]
  }
}
```

---

#### 5. **package.json Security Validation** ✅

- Detekterar farliga scripts (curl | sh, rm -rf /, eval(), etc.)
- Varnar för postinstall/preinstall scripts
- Kollar repository field
- OWASP-baserade checks

**Output:**

```
🚨 package.json security [🔴 CRITICAL]
   Found 2 security issues

   - Script "build": Piping curl to sh
   - Found postinstall script - review carefully

   💡 Avoid piping curl/wget to sh
   💡 Be cautious with postinstall scripts
```

---

#### 6. **Typosquatting Detection** ✅

- Upptäcker package namn som liknar populära paket
- Levenshtein distance-baserad matching
- Varnar för potentiella supply chain attacks

**Output:**

```
⚠️  typosquatting detection [🟡 WARNING]
   Found 1 potentially suspicious package

   - "raect" might be typosquatting "react"

   💡 Verify package names carefully
   💡 Check npm.js for official packages
```

---

### 📦 Quality Features

#### 7. **Advanced Unused Dependencies** ✅

- Scannrar faktisk kod-användning (inte bara imports)
- Kollar require(), import, from patterns
- Kollar package.json scripts
- Beräknar slösad disk-space
- Allow-list support

**Output:**

```
⚠️  unused dependencies [🟡 WARNING]
   Found 3 unused dependencies (~45.2 MB)

   Unused:
   - lodash
   - moment
   - uuid

   Estimated size: 45.2 MB

   💡 Run: npm uninstall lodash moment uuid
   💡 Reduce bundle size by ~45 MB
```

---

#### 8. **Duplicate Dependencies with Conflicts** ✅

- Hittar paket installerade i flera versioner
- Identifierar version-konflikter
- Uppskattar slösat utrymme
- Ger konkreta fix-kommandon

**Output:**

```
⚠️  duplicate dependencies [🟡 WARNING]
   Found 5 packages with multiple versions

   - react: 17.0.2, 18.2.0
   - lodash: 4.17.20, 4.17.21

   💡 Run 'npm dedupe'
   💡 Update package.json for consistent versions
```

---

#### 9. **Outdated Dependencies with Categorization** ✅

- Kategoriserar i major/minor/patch updates
- Prioriterar kritiska updates
- Ger changelog-länkar
- Säkerhetsfokus

**Output:**

```
⚠️  outdated dependencies [🟡 WARNING]
   Found 12 outdated dependencies

   Major updates (breaking): 3
   - react: 17.0.2 → 18.2.0
   - typescript: 4.9.0 → 5.3.0

   Minor updates: 5
   Patch updates: 4

   💡 Review major updates for breaking changes
   💡 Run 'npm update' for minor/patch
```

---

#### 10. **Dependency Size Analysis** ✅

- Analyserar storlek per dependency
- Identifierar "bloat"
- Topp 10 största dependencies
- Bundle optimization tips

**Output:**

```
⚠️  dependency sizes [🟡 WARNING]
   Total size: 523.4 MB

   Top 10 largest:
   1. webpack: 85.2 MB
   2. @babel/core: 42.1 MB
   3. typescript: 38.5 MB
   ...

   Packages over 10 MB: 15

   💡 Consider lighter alternatives
   💡 Enable tree-shaking
```

---

#### 11. **Circular Dependency Detection** ✅

- Identifierar circular imports
- Ger madge integration tips
- Förbättrar code maintainability

---

### 📄 Reporting Features

#### 12. **Beautiful HTML Reports** ✅

- Professionell, printbar HTML
- Responsiv design
- Color-coded severity levels
- Interactive progress bars
- Perfect för stakeholders

**Features:**

- 📊 Visual summary cards
- 🎨 Gradient header
- 📈 Progress bars
- 🖨️ Print-optimized
- 📱 Mobile responsive
- 🔗 OWASP links

**Generering:**

```bash
security-reporter --format html --output report.html
```

---

## 🎯 Hur man använder alla features

### 1. Komplett .securityrc.json

```json
{
  "projectType": "backend",

  "security": {
    "auditLevel": "moderate",
    "checkSecrets": true,
    "allowedLicenses": ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"],
    "ignoreVulnerabilities": []
  },

  "quality": {
    "checkUnused": true,
    "checkDuplicates": true,
    "checkOutdated": true,
    "maxDependencyAge": "1 year",
    "allowUnused": ["@types/*", "typescript", "ts-node", "prettier", "eslint", "husky", "lint-staged"]
  },

  "docker": {
    "checkEnvInBuild": true,
    "requiredEnvVars": ["NODE_ENV", "PORT"]
  },

  "tests": {
    "run": false,
    "coverageThreshold": 80
  },

  "reporting": {
    "format": "terminal",
    "verbose": false
  }
}
```

### 2. Alla rapportformat

```bash
# Terminal (default) - Snygg färglagd output
security-reporter

# Markdown - För dokumentation
security-reporter --format markdown --output report.md

# JSON - För CI/CD parsing
security-reporter --format json --output report.json

# HTML - För stakeholders
security-reporter --format html --output report.html

# Alla format på en gång!
security-reporter --format all
```

### 3. CI/CD Integration

```yaml
# GitHub Actions
- name: Security Scan
  run: |
    npm install
    npx security-reporter --strict --format json --output security.json
    npx security-reporter --format html --output security.html

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: security-reports
    path: |
      security.json
      security.html
```

### 4. Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npx security-reporter --no-tests --no-docker --strict
```

---

## 📊 Output Comparison

### Basic vs Enhanced

**Tidigare (placeholder):**

```
✓ npm audit: OK
✓ secrets: OK
✓ dependencies: OK
```

**Nu (enhanced):**

```
════════════════════════════════════════════════════════════════════════════════
                              🛡️  SECURITY REPORTER
════════════════════════════════════════════════════════════════════════════════

🔴 CRITICAL SECURITY ISSUES

  🔴 SECRETS SCAN [🔴 CRITICAL]
     Found 5 potential secrets in 3 files

     By type:
     ├─ AWS Access Key: 2
     ├─ GitHub PAT: 1
     └─ API Key: 2

     Files:
     ├─ /src/config/aws.ts
     ├─ /src/utils/github.ts
     └─ /src/lib/api.ts

     💡 Suggestions:
        • Remove hardcoded secrets immediately
        • Use environment variables
        • Rotate exposed credentials

⚠️  WARNINGS

  ⚠️  unused dependencies: Found 3 unused (~45.2 MB)
  ⚠️  outdated dependencies: 12 packages (3 major updates)
  ⚠️  dependency sizes: Total 523 MB (15 packages >10MB)

✅ PASSED CHECKS

  ✓ npm audit
  ✓ env files
  ✓ licenses
  ✓ duplicate dependencies
  ✓ peer dependencies
  ✓ package.json security
  ✓ typosquatting
  ✓ circular dependencies

────────────────────────────────────────────────────────────────────────────────
                                   📊 SUMMARY
────────────────────────────────────────────────────────────────────────────────
  📋  Total Checks               15
  ✅  Passed                      8
  ⚠️   Warnings                    4
  ❌  Failed                      1
  ⏭️   Skipped                     2
════════════════════════════════════════════════════════════════════════════════

                      ❌ OVERALL STATUS: FAILED - Action Required

🔧 RECOMMENDED ACTIONS:

  1. Remove hardcoded secrets immediately
  2. Use environment variables
  3. Rotate exposed credentials
  4. Review unused dependencies
  5. Update outdated packages

💡 Tip: Fix critical issues before deploying to production
```

---

## 🎁 Bonus Features

### Auto-suggestions

Varje check ger konkreta, actionable suggestions:

- ✅ Exakta kommandon att köra
- ✅ Länkar till dokumentation
- ✅ Best practices
- ✅ Prioriterade åtgärder

### Smart Severity Levels

- 🔴 **Critical** - Omedelbar action krävs (secrets, high vulns)
- 🟠 **Error** - Viktigt att fixa (moderate vulns, missing peers)
- 🟡 **Warning** - Rekommenderas att fixa (unused deps, outdated)
- 🔵 **Info** - Informativt (passed checks, stats)

### Performance Optimized

- ⚡ Parallel execution av alla checks
- 🚀 Caching av results
- 📦 Minimal dependencies
- 💾 Efficient file scanning

---

## 🚀 Nästa Steg

1. **Kopiera de nya filerna** från `enhanced-features/` till ditt projekt
2. **Testa alla features:**
   ```bash
   npm run build
   npm run security-report
   ```
3. **Generera HTML rapport:**
   ```bash
   security-reporter --format html
   ```
4. **Lägg till i CI/CD**
5. **Njut av professionella rapporter!** 🎉

---

## 💡 Pro Tips

1. **För utvecklare:**
   - Använd `--no-tests --no-docker` för snabbare feedback
   - Kör innan commit med pre-commit hook

2. **För team:**
   - Dela HTML rapporter varje vecka
   - Tracka metrics över tid
   - Sätt quality gates i CI/CD

3. **För managers:**
   - HTML rapporter är perfekta för presentations
   - JSON för dashboards och metrics
   - Markdown för dokumentation

4. **För CI/CD:**
   - Använd `--strict` för att faila på warnings
   - Spara rapporter som artifacts
   - Skicka notifications vid failures

---

Made with ❤️ by Security Reporter
Based on OWASP NPM Security Best Practices
