# Contributing

Thanks for your interest in contributing. This project prefers small, focused PRs with tests.

Getting started locally

```bash
# clone and install
git clone <repo>
cd security-reporter
npm install

# build
npm run build

# run the scanner locally
npm run report
```

Code style and tests

- Keep changes minimal and focused on a single concern.
- Update TypeScript types when changing interfaces.
- Add tests when introducing logic changes; run `npm run build` to validate.

Pull requests

- Fork and open a PR against `main` or the active default branch.
- Include a short description and the motivation for the change.
- For significant changes, open an issue first to discuss the approach.

Security-related PRs

- Be careful when modifying scanning patterns. Overly broad or noisy patterns should be discussed in an issue before merging.
- Do not add any code or scripts that exfiltrate data. All network checks must be opt‑in.

CI and releasing

- CI should run `npm ci`, `npm run build` and `npm run report` on PRs.
- Releases are done by maintainers and should include an SBOM and signed artifacts when possible.
