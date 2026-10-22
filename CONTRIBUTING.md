# CONTRIBUTING.md — translate-robot

Thanks for contributing! This document covers the conventions expected
for a contribution. In-progress task tracking lives under `crew/` (see
`crew/CLAUDE_CONTEXT/AGENTS.md`) — you don't need to read it for a
regular external PR.

Participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Branches

`feat/<slug>`, `fix/<slug>`, `chore/<slug>`; a `claude/*` branch is
accepted for an agent's own work, to be merged or rebased before landing
on the default branch.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
`fix:`, `chore:`, `docs:`, `refactor:`, `test:`. One commit = one
coherent logical change; no "wip" or "fix typo" commits left in the
final history.

## Pre-commit

`python check_placeholders.py` blocks a commit if an unresolved
bootstrap `<...>` placeholder remains in CLAUDE.md/AGENTS.md/PRODUCT.md/
CONTRIBUTING.md/SECURITY.md/crew. One-time setup per checkout:
`git config core.hooksPath .githooks`. A Claude Code agent on this repo
already has this via a `PreToolUse` hook in `.claude/settings.json` - no
setup needed in that case.

## Pull requests

Review is required before merging - never an automatic merge, especially
not for a PR that modifies translation files (an automated translation's
quality isn't something CI alone can verify). CI must be green (lint +
tests) before merging.
