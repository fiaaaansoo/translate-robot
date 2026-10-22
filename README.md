Lire en français → [README.fr.md](README.fr.md)

# translate-robot

Translates new UI i18n strings under the real rendered width of their
component, not a character-count guess. When a translation is too long
for the button, tab, or nav item it renders in, translate-robot catches
that overflow before it ships, not after someone files a screenshot
bug.

[![CI](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml/badge.svg)](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

| Before: naive translation | After: translate-robot |
| --- | --- |
| ![A German translation overflowing past the edge of a blue button](docs/images/before-overflow.png) | ![The same button with a translation that fits](docs/images/after-fit.png) |
| `"Reichen Sie Ihren monatlichen Spesenbericht ein"`: correct German, too wide for the button. | `"Spesenbericht einreichen"`: same meaning, measured to fit. |

> No API key needed to see this work: `--dry-run` replays a pre-recorded
> translation against the toy repo fixture included in this repository.

```bash
git clone https://github.com/fiaaaansoo/translate-robot.git && cd translate-robot
npm install && npm run build
node bin/translate-robot run --repo fixtures/toy-repo --recorded-translations fixtures/toy-repo/translations.recorded.json --target-locale de --dry-run
```

That's the exact setup behind the screenshots above:
[`fixtures/toy-repo/`](fixtures/toy-repo/README.md) is a real HTML
component and i18n file, not a mockup.

translate-robot opens a pull request with the result. It never merges
or approves one itself. Every translation gets a human review before it
reaches production, no exception.

> **Translations are LLM output.** translate-robot verifies that a
> translation fits its component; it does not verify that the
> translation is correct, complete, or culturally appropriate. Always
> have the pull request reviewed by someone who reads the target
> language before merging. See [SECURITY.md](SECURITY.md).

---

## How width is measured

Most i18n tooling estimates whether a translation will fit by counting
characters. That breaks down fast: German and Finnish run 20-35% longer
than English for the same meaning, CJK characters are wider than Latin
ones, and proportional fonts mean two strings of equal length can render
at very different widths.

translate-robot measures instead of guessing: it renders the actual
component in headless Chromium (via Playwright), swaps in each candidate
translation, and compares the node's `scrollWidth` against its
`clientWidth`, exactly what a real browser would show a real user. If a
translation overflows, it goes back to the LLM with that feedback
(`"this candidate was 23px too wide, try again"`) for a bounded number of
attempts.

## Installation

```bash
git clone https://github.com/fiaaaansoo/translate-robot.git
cd translate-robot
npm install
npm run build
```

Node.js ^22.12.0 (or ^24, or >=26) is required. `npm install` also pulls
in Playwright; its Chromium binary may need a separate
`npx playwright install chromium` depending on your environment.

## Usage

```bash
node bin/translate-robot run \
  --new-i18n i18n/en.json \
  --mapping i18n-map.json \
  --target-locale de \
  --owner <github-owner> \
  --repo-name <github-repo>
```

This diffs `i18n/en.json` against its version on the base branch,
translates every added or changed key under its component's measured
width, writes the result to `i18n/de.json`, and opens a pull request.
Add `--dry-run` to see the result without writing anything or opening a
PR. Useful in CI, or to sanity-check a run before it touches your repo.

Run `node bin/translate-robot run --help` for the full option list
(source locale catalog path, base branch, retry bound, and more).

By default, translations come from the Anthropic API
(`ANTHROPIC_API_KEY` in your environment); the GitHub token used to push
the branch and open the PR comes from `GITHUB_TOKEN`. Neither is ever
logged or included in an error message. Sending source strings to
Anthropic's API means they're processed by that third-party subprocessor
under your own API key. translate-robot is not a hosted service, so you
remain the data controller for anything you send through it.

### Using a self-hosted model instead

Pass `--llm-provider openai-compatible` to translate against any server
that speaks the OpenAI chat completions API, such as a self-hosted
Ollama or vLLM instance, instead of the Anthropic API:

```bash
node bin/translate-robot run \
  --new-i18n i18n/en.json \
  --mapping i18n-map.json \
  --target-locale de \
  --owner <github-owner> \
  --repo-name <github-repo> \
  --llm-provider openai-compatible \
  --llm-base-url http://localhost:11434/v1 \
  --llm-model llama3
```

`--llm-base-url` and `--llm-model` are both required with this provider;
neither has a default, so a missing one fails loudly instead of silently
falling back to a wrong host. Source strings never leave the server at
`--llm-base-url` in this mode. If that server needs an API key, set
`TRANSLATE_ROBOT_LLM_API_KEY`; most self-hosted setups need none. One
provider runs per invocation; there is no automatic fallback between
providers.

## GitHub Action

```yaml
name: translate-robot
on:
  pull_request:
    paths: ['i18n/en.json']

permissions:
  contents: write
  pull-requests: write

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: fiaaaansoo/translate-robot@v1
        with:
          target-locale: de
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The `permissions` block above is the minimum the Action needs:
`contents: write` to push the translation branch, `pull-requests: write`
to open the PR. Scope any token you configure the same way; it never
needs `admin` access.

To translate against a self-hosted model instead, replace
`anthropic-api-key` with `llm-provider: openai-compatible`,
`llm-base-url`, and `llm-model` (see
[Using a self-hosted model instead](#using-a-self-hosted-model-instead)
above for what each one does).

## v1 scope

v1 solves one pipeline end to end rather than several partially.
Current limits, all intentional:

- One source locale, one target locale: English to German.
- Flat JSON i18n catalogs only: no nested keys, no ICU plural rules, no
  other formats (Fluent, gettext, etc.).
- One rendering engine: Chromium, via Playwright.
- One pull request per run.
- One translation provider per run: either the Anthropic API or a single
  configured OpenAI-compatible server, never both, with no automatic
  fallback from one to the other.

Not yet built: additional target languages, nested/structured catalogs,
other browser engines, batching several runs into a single PR, falling
back between translation providers.

Unrelated to v1 scope and not going to change: translate-robot never
merges or approves a pull request. Every translation goes through human
review before it reaches production, in v1 and after.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch/commit conventions and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.
Security issues go through [SECURITY.md](SECURITY.md), not a public
issue.

## License

[Apache License 2.0](LICENSE).
