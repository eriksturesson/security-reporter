# 🚀 Complete Setup Guide - Security Reporter

## Steg 1: Installation (2 minuter)

```bash
cd security-reporter
npm install
```

### Om du får fel med dependencies:

```bash
# Installera alla dependencies manuellt
npm install --save chalk@4.1.2 commander@11.1.0 dotenv@16.5.0
npm install --save-dev @types/node@22.15.27 typescript@5.3.0 ts-node@10.9.1 depcheck@1.4.7
```

## Steg 2: Bygg projektet (1 minut)

```bash
npm run build
```

### Om du får TypeScript-fel:

Se till att din `tsconfig.json` innehåller:

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "CommonJS",
    "lib": ["ES2019"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Steg 3: Testa lokalt (1 minut)

```bash
# Kör basic test
npm test

# Testa CLI:n
node dist/cli.js --help

# Kör security reporter i detta projekt
npm run security-report
```

### Testa i ett annat projekt:

```bash
cd ../ditt-annat-projekt
node ../security-reporter/dist/cli.js
```

## Steg 4: Publicera till npm (3 minuter)

```bash
cd security-reporter

# Logga in (första gången)
npm login
# Ange: username, password, email

# Kontrollera vad som kommer publiceras
npm publish --dry-run

# Publicera!
npm publish
```

### Om paketnamnet är upptaget:

Ändra `name` i `package.json`:

```json
{
  "name": "@dittnamn/security-reporter"
}
```

Eller välj ett annat namn:

- `code-security-reporter`
- `security-scan-tool`
- `repo-security-scanner`

## Steg 5: Använd överallt! 🎉

### Globalt (rekommenderat):

```bash
npm install -g security-reporter
cd vilket-projekt-som-helst
security-reporter
```

### I ett projekt:

```bash
cd ditt-projekt
npm install --save-dev security-reporter
```

Lägg till i `package.json`:

```json
{
  "scripts": {
    "security-report": "security-reporter",
    "security-report:md": "security-reporter --format markdown",
    "security-report:ci": "security-reporter --strict --format json"
  }
}
```

Kör:

```bash
npm run security-report
```

### Med npx (ingen installation):

```bash
cd ditt-projekt
npx security-reporter
```

## Exempel-kommandon

```bash
# Basic scan med snygg console output
security-reporter

# Eller kort version
sr

# Markdown-rapport
security-reporter --format markdown --output report.md

# JSON för CI/CD
security-reporter --format json --output report.json

# Alla format på en gång
security-reporter --format all

# Strict mode (warnings = fail)
security-reporter --strict

# Skapa config fil
security-reporter init

# Skapa config och kör
security-reporter init
security-reporter
```

## Användning i CI/CD

### GitHub Actions

Skapa `.github/workflows/security.yml`:

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Run security scan
        run: npx security-reporter --strict --format json --output security-report.json

      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-report
          path: security-report.json
```

### GitLab CI

Lägg till i `.gitlab-ci.yml`:

```yaml
security-scan:
  stage: test
  image: node:18
  script:
    - npm install
    - npx security-reporter --strict --format markdown --output security-report.md
  artifacts:
    when: always
    paths:
      - security-report.md
    reports:
      junit: security-report.json
```

## Konfiguration

### Skapa config fil:

```bash
security-reporter init
```

Detta skapar `.securityrc.json`:

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

### Anpassa för ditt projekt:

```json
{
  "projectType": "frontend", // eller "backend", "fullstack"
  "security": {
    "auditLevel": "high", // "low", "moderate", "high", "critical"
    "checkSecrets": true,
    "allowedLicenses": ["MIT", "Apache-2.0"]
  },
  "quality": {
    "checkUnused": true,
    "allowUnused": ["@types/*", "husky", "lint-staged"]
  }
}
```

## Troubleshooting

### "Cannot find module" error

```bash
npm install
npm run build
```

### "Command not found: security-reporter"

```bash
# Om installerad globalt:
npm install -g security-reporter

# Eller använd npx:
npx security-reporter

# Eller node direkt:
node ./node_modules/security-reporter/dist/cli.js
```

### TypeScript errors

```bash
# Installera types
npm install --save-dev @types/node

# Se till att tsconfig.json har "types": ["node"]
```

### npm publish fails with 403

```bash
# Logga in igen
npm logout
npm login

# Eller ändra paketnamn i package.json
```

### Package name already taken

Ändra `name` i `package.json`:

```json
{
  "name": "@yourusername/security-reporter"
}
```

## Vad du får

✅ **npm audit** - Vulnerability scanning  
✅ **Secret detection** - Find hardcoded API keys, tokens  
✅ **.env validation** - Ensure no exposure in git or Docker  
✅ **Dependency checks** - Unused, outdated, duplicates  
✅ **Docker security** - ENV vars, secrets, .dockerignore  
✅ **Test & build** - Validate setup  
✅ **Multiple formats** - Console, Markdown, JSON, PDF  
✅ **Beautiful output** - Emojis, colors, clear structure

## Privacy & Security

❌ Vi sparar ALDRIG dina secrets eller .env filer  
❌ Vi skickar ALDRIG data någonstans  
❌ Vi ändrar ALDRIG din kod automatiskt  
✅ Allt sker lokalt i ditt repo  
✅ Du behåller full kontroll  
✅ Open source - du kan granska koden

## Tips

1. 🎯 Kör `security-reporter init` för att skapa config
2. 📝 Använd `--format markdown` för dokumentation
3. 🚀 Använd `--strict` i CI/CD för att fånga warnings
4. 🔄 Lägg till i pre-commit hooks för tidig upptäckt
5. 📊 Generera PDF via markdown för stakeholders

## Hjälp & Support

```bash
# Visa hjälp
security-reporter --help

# Skapa config
security-reporter init
```

## Länkar

- 📚 **OWASP NPM Security:** https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html
- 📦 **npm package:** https://www.npmjs.com/package/security-reporter
- 🐛 **Issues:** https://github.com/eriksturesson/security-reporter/issues
- 📧 **Email:** hej@eriksturesson.se

## Nästa steg

1. ✅ Bygga och testa lokalt
2. 📦 Publicera till npm
3. 🔄 Installera i alla dina repos
4. 🎨 Generera första rapporten
5. 🔧 Anpassa config efter behov

Happy scanning! 🛡️🚀

---

**Pro tip:** Lägg till detta i din README:

```markdown
## Security

This project is regularly scanned with [security-reporter](https://github.com/eriksturesson/security-reporter).

Latest scan: ![Security Status](https://img.shields.io/badge/security-passing-brightgreen)
```
