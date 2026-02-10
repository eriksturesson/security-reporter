# Security Policy

Responsible disclosure

If you find a security issue in this project, please report it privately to hej@eriksturesson.se with a clear proof-of-concept, impact, and suggested remediation. Do not open a public issue for vulnerabilities until a fix is available.

What we provide

- Local-first scanning: This tool does not transmit `.env` files or secrets by default.
- Network checks (registry queries, publish dry-run, SBOM generation) are opt-in and off by default.

Maintainer contact

- Email: hej@eriksturesson.se
- Use PGP or encrypted email for sensitive information (PGP key not published in repo).

Fix and disclosure policy

- We aim to triage reports within 72 hours.
- After a fix is available, we'll prepare a public advisory and a patched release.

Operational notes

- Do not run the tool with elevated privileges in untrusted environments.
- Review `reports/` contents before sharing; treat them as sensitive artifacts.

## Release, SBOM and verification

Recommended CI release process (high level):

- Publish only from CI (repository-level `NPM_TOKEN` secret), not from personal accounts.
- Commit and keep `package-lock.json` in the repo; run `npm ci --ignore-scripts` in CI.
- Generate a CycloneDX SBOM per release and attach it to the GitHub release.
- Optionally sign SBOMs/artifacts (Sigstore/cosign or GPG) to provide provenance.

Example notes for maintainers

- Create a repository secret `NPM_TOKEN` (scoped to publish access). CI will write `~/.npmrc`:

  ```bash
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
  npm publish --registry https://registry.npmjs.org
  ```

- Generate SBOM in CI (example using Anchore Syft docker image):

  ```bash
  docker run --rm -v "${GITHUB_WORKSPACE}:/workdir" -w /workdir anchore/syft:latest -o cyclonedx-xml=sbom.xml .
  ```

Verifying artefacts (optional but recommended for consumers/CI)

- GPG‑signed Git tag verification:

  ```bash
  git fetch --tags
  git tag -v vX.Y.Z
  ```

- Verify SBOM/artifact signed with `cosign` (example using local public key):
  ```bash
  cosign verify-blob --key cosign.pub --signature sbom.xml.sig sbom.xml
  ```

Notes about signing

- Signing is not required for `npm install` to work; it is an additional provenance/integrity guarantee consumed by CI or enterprise pipelines that choose to verify signatures.
- If you enable keyless Sigstore (`cosign`) in GitHub Actions, the workflow needs `id-token: write` permission and an action that invokes `cosign` after authentication.

Security policy reminders

- Rotate and limit tokens: use short‑lived or minimally scoped tokens where possible. Audit token usage.
- Require 2FA for all maintainers on npm and GitHub org accounts.
- Document the verification steps in this file so consumers and internal teams can opt into verification.
