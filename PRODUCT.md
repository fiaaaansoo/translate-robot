# translate-robot: product notes

## Vision

Translate the UI strings a team adds to its code, under the real width
constraint of the component each one renders in, and deliver the result
as a pull request ready for human review.

## Who it is for

Developers and product teams who maintain a multilingual app with
key-based i18n and want to stop shipping auto-translated labels that
overflow a button, tab or nav item in some languages (German and Finnish
are the usual offenders).

## Current scope (v1)

English to German, flat JSON catalogs, Chromium via Playwright, one pull
request per run, Anthropic API or a self-hosted OpenAI-compatible server.
See the "v1 limits" section of [README.md](README.md).

## Out of scope

- Merging a translation without human review.
- Estimating fit from character counts instead of a real render. Fonts
  and CJK scripts make that proxy unreliable.
