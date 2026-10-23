# SECURITY.md — translate-robot

## Reporting a vulnerability

Please report security vulnerabilities through a
[private security advisory](https://github.com/fiaaaansoo/translate-robot/security/advisories/new)
on this repository, not a public issue. We'll acknowledge the report and
work with you on a fix and a disclosure timeline.

## Secrets

GitHub token (App or PAT, minimal scope: read/write on language files +
opening a PR, never `admin`) and the translation/LLM service's API key:
environment variables only, never committed, never logged in clear text,
never echoed back in a log, a commit or a PR message.

## Auth boundaries

translate-robot is a CLI and a GitHub Action. It exposes no
end-user-facing service, so there is no session or token to protect on
that side. Revisit this file if a hosted component is ever added.

## Sensitive data / PII

translate-robot handles i18n keys and UI strings, which normally contain
no personal data. If a string accidentally contains personal data, do not
relay it into a public log or a PR without checking first.

## Translations are LLM output

translate-robot verifies that a translation fits its component's
rendered width; it does not verify that the translation is accurate,
complete, or culturally or legally appropriate. Always have a translation
PR reviewed by someone who reads the target language before merging —
this is enforced structurally (the tool never merges or approves a PR
itself, cf. CONTRIBUTING.md), but the human review itself is a content
safeguard the tool cannot provide.

Source strings are sent to the configured LLM provider (the Anthropic
API by default) under your own API key, and are governed by your
agreement with that provider. translate-robot is not a hosted service and
its author receives none of your data: you are responsible for what you
send through it.

## Before you run it in production

- Never auto-merge a translation PR (cf. CONTRIBUTING.md).
- Minimal scope on the GitHub token the robot uses:
  `contents: write` and `pull-requests: write` only, never `admin`.
- Verify no API key appears in CI logs or in the body of a generated PR.
