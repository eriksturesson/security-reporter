# Security Reporter — Public README

This repository contains `security-reporter`, a local CLI tool for scanning Node.js projects for security and quality issues. This file documents publishing, contribution and security expectations for a public release.

Publishing checklist (before removing `private`):

- Ensure no secrets or sensitive files are committed. Run the scanner and inspect `reports/` locally.
- Remove any overly broad secret patterns that may leak private data.
- Generate an SBOM (`npm ls --all --json`) and review it for unexpected dependencies.
- Add tests and CI that run `npm run build` and `npm run report` on PRs.
- Consider signing releases/artifacts (Sigstore/cosign) for supply-chain integrity.
- Update `package.json` fields: `repository`, `bugs`, `homepage`, and ensure `files` contains only what should be published.
- Run `npm publish --dry-run` (or `npm pack --dry-run`) to verify package contents.

Publishing options:

- Public publish to npm (default): remove `private` and `npm publish`.
- Scoped private packages: use a private scope (e.g., `@yourorg/security-reporter`) and a paid npm plan, or publish to a private registry.

Security policy for public packages:

- Do not enable networked checks by default; keep `security.checkRegistry`, `security.generateSbom`, `security.publishDryRun` opt-in.
- Document the opt-in flags clearly in `README.md` and `SECURITY.md`.

How to test locally without publishing:

```bash
# Create a tarball and install it in another project
npm pack
npm install ../security-reporter-1.0.0.tgz

# Or run a dry-run of publish (no publish performed)
npm publish --dry-run
```

Reporting vulnerabilities:

If you discover a vulnerability in this project, follow the instructions in `SECURITY.md`.

License: MIT © Erik Sturesson
