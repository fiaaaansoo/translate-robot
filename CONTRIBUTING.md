# CONTRIBUTING.md — translate-robot

Thanks for contributing! This document covers the conventions expected
for a contribution.

Participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Branches

`feat/<slug>`, `fix/<slug>`, `chore/<slug>`, branched from `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
`fix:`, `chore:`, `docs:`, `refactor:`, `test:`. One commit = one
coherent logical change; no "wip" or "fix typo" commits left in the
final history.

## Checks

Run `npm run lint` and `npm test` before opening a pull request. CI runs
the same checks.

## Pull requests

Review is required before merging - never an automatic merge, especially
not for a PR that modifies translation files (an automated translation's
quality isn't something CI alone can verify). CI must be green (lint +
tests) before merging.

## License

By contributing, you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE), the same license as the project.
