# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - Unreleased

### Added

- CLI that diffs an i18n catalog, translates new keys, and measures each
  translation against the real rendered width of its component in
  headless Chromium (Playwright), retrying with measured feedback.
- Pull request agent: writes the target catalog, commits on a new branch,
  opens a pull request for human review. It never merges or approves.
- GitHub Action wrapper (`fiaaaansoo/translate-robot@v1`).
- Anthropic API provider and a self-hosted OpenAI-compatible provider.
- `--dry-run` mode with a recorded translation against the bundled toy
  repo, usable without an API key.
