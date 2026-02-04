# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2025-06-24

### Changed

- The engines in package.json was to strict, only `"node": ">=16"` needed.

## [1.1.1] - 2025-06-17

### Changed

- Improved readme

## [1.1.0] - 2025-06-12

### Fixed

- Refactored `httpErrorFormatter` to accept the error directly as an argument `httpErrorFormatter(err)` instead of an object `httpErrorFormatter({ err })`, improving usability and simplifying the helper.
- Removed unnecessary async keyword from `httpErrorFormatter` function since no asynchronous operations are performed, enhancing clarity and performance.
- Updated README to include usage examples for the `error-drawings` package, providing clearer documentation and better onboarding for new users.

## [1.0.4] - 2025-06-11

### Fixed

# Changelog

## 0.1.0 - Initial repository creation

- Repository created for `security-reporter`.
- See `PROJECT_SUMMARY.md` for project scope, goals and configuration notes.
- Initial `package.json`, `.gitignore` and basic project layout added.

Further changes will be recorded here following Keep a Changelog conventions.
