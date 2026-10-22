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
never echoed back in an agent response or a commit/PR message.

## Auth boundaries

No end-user-facing service at this stage (agents/CI only) — so no
client-side session/token to consider yet. Revisit this file before
exposing a dashboard or a control-plane API.

## Sensitive data / PII

The robot itself does not process personal data: it reads i18n keys and
UI text, not user data. Be careful if a translation key accidentally
contains product text or PII — never relay it into a public log or a PR
without checking first.

## Translations are LLM output

translate-robot verifies that a translation fits its component's
rendered width; it does not verify that the translation is accurate,
complete, or culturally or legally appropriate. Always have a translation
PR reviewed by someone who reads the target language before merging —
this is enforced structurally (the tool never merges or approves a PR
itself, cf. CONTRIBUTING.md), but the human review itself is a content
safeguard the tool cannot provide.

Source strings sent to the configured LLM provider (the Anthropic API,
by default) are processed by that third-party subprocessor under your
own API key. translate-robot is not a hosted service: you remain the
data controller for anything you send through it.

## Pre-production checklist

- Never auto-merge a translation PR (cf. CONTRIBUTING.md).
- Rate limiting / minimal scope on the GitHub token the robot uses -
  `contents: write` and `pull-requests: write` only, never `admin`.
- Verify no API key appears in CI logs or in the body of a generated PR.
