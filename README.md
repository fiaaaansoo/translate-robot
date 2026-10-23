Lire en français → [README.fr.md](README.fr.md)

# translate-robot

**i18n translations that fit the UI: measured in a real browser, reviewed in a pull request.**

[![CI](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml/badge.svg)](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

You add an English UI string. translate-robot translates it, renders the
real component in headless Chromium, checks that the text fits, retries
with measured feedback if it overflows, and opens a pull request for a
human to review. It never merges or approves a pull request itself.

It ships as a CLI and as a GitHub Action. Translations come from the
Anthropic API or from any self-hosted OpenAI-compatible server (Ollama,
vLLM).

## The problem

A translation can be correct and still break the layout. The German for
"Submit your monthly expense report" is longer than the English, and a
fixed-width button cuts it off. Character counts don't predict this:
proportional fonts and wide scripts make two strings of equal length
render at very different widths. Usually someone finds the overflow in a
screenshot after release.

## Before and after

Source string (`en`): `Submit your monthly expense report`

**Naive translation** (`de`): `Reichen Sie Ihren monatlichen Spesenbericht ein`

![German translation of "Submit your monthly expense report" cut off at the right edge of a 320px blue button](docs/images/before-overflow.png)

**translate-robot** (`de`): `Spesenbericht einreichen`

![The same 320px button with the shorter German translation fitting inside it](docs/images/after-fit.png)

The second translation is shorter and drops "monthly". That is the
trade-off the tool makes to fit, which is why a human reviews every
pull request.

## Try it (no API key needed)

`--dry-run` replays a pre-recorded translation against the toy repo in
[`fixtures/toy-repo/`](fixtures/toy-repo/README.md), a real HTML
component and i18n file. Nothing is written, no PR is opened.

```bash
git clone https://github.com/fiaaaansoo/translate-robot.git && cd translate-robot
npm install && npx playwright install chromium && npm run build
node bin/translate-robot run --repo fixtures/toy-repo --recorded-translations fixtures/toy-repo/translations.recorded.json --target-locale de --dry-run
```

Output:

```text
expense_report_submit: "Spesenbericht einreichen" (320px, 1 attempt(s), resolved)
```

Node.js ^22.12.0, ^24 or >=26 is required.

## How it works

1. **Diff.** Compares your source catalog (`i18n/en.json`) with its
   version on the base branch to find added or changed keys.
2. **Resolve.** Maps each key to the component it renders in
   (`i18n-map.json`).
3. **Measure.** Renders that component in headless Chromium through
   Playwright, swaps in the candidate translation, and compares the
   node's `scrollWidth` to its `clientWidth`, which is what a real
   browser would show a user.
4. **Retry.** If the text overflows, the candidate goes back to the LLM
   with the measurement (`"this candidate was 23px too wide, try
   again"`), for a bounded number of attempts.
5. **Open a PR.** Writes the target catalog (`i18n/de.json`), commits it
   on a new branch and opens a pull request. Nothing is merged.

> **Translations are LLM output.** translate-robot verifies that a
> translation fits its component. It does not verify that the
> translation is correct, complete, or culturally appropriate. Have
> someone who reads the target language review every pull request. See
> [SECURITY.md](SECURITY.md).

## Use it on your repo

```bash
node bin/translate-robot run \
  --new-i18n i18n/en.json \
  --mapping i18n-map.json \
  --target-locale de \
  --owner <github-owner> \
  --repo-name <github-repo>
```

Add `--dry-run` to see the result without writing anything or opening a
PR, for example in CI. `node bin/translate-robot run --help` lists every
option (source catalog path, base branch, retry bound, and more).

By default, translations come from the Anthropic API
(`ANTHROPIC_API_KEY`), and the token used to push the branch and open
the PR comes from `GITHUB_TOKEN`. Neither is ever logged or included in
an error message.

**Data and third parties.** translate-robot runs on your machine or in
your own CI. It is not a hosted service, and its author receives none of
your data. By default, each string to translate (with the target locale
and the width to fit) is sent to the Anthropic API under your own API
key, and is governed by your agreement with Anthropic (see Anthropic's
commercial terms and data-retention documentation). UI strings rarely
contain personal data. If yours do, you are responsible for having a
legal basis and for putting in place the agreements you need with
Anthropic. With `--llm-provider openai-compatible`, strings are sent
only to the server at `--llm-base-url`; what that server does with them
depends on how you operate it. The API is billed to you per use, and
retries are bounded. translate-robot is not affiliated with or endorsed
by Anthropic, OpenAI, Ollama, vLLM or Microsoft. These names only
describe compatibility.

### Self-hosted model

Pass `--llm-provider openai-compatible` to translate against any server
that speaks the OpenAI chat completions API, such as a self-hosted
Ollama or vLLM instance:

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

`--llm-base-url` and `--llm-model` are both required with this provider.
Neither has a default, so a missing one fails loudly instead of falling
back to a wrong host. Source strings are sent only to the server at
`--llm-base-url` in this mode. If that server needs an API key, set
`TRANSLATE_ROBOT_LLM_API_KEY`. One provider runs per invocation, with no
automatic fallback between providers.

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

The `permissions` block is the minimum the Action needs:
`contents: write` to push the translation branch and
`pull-requests: write` to open the PR. Scope any token you configure the
same way. It never needs `admin` access.

The Action installs dependencies and Chromium and builds the CLI on each
run (npm and Playwright caches are used), so expect a few minutes on a
cold cache.

For a self-hosted model, replace `anthropic-api-key` with
`llm-provider: openai-compatible`, `llm-base-url` and `llm-model`.

## FAQ

**Why do translated strings overflow buttons?**
Translations are often longer than the source, and the width a string
needs depends on the font and the script, not on its character count.

**How does translate-robot check that a translation fits?**
It renders the real component in headless Chromium and compares the
node's `scrollWidth` to its `clientWidth`.

**Does it merge automatically?**
No. It opens a pull request and stops. A test in the repository also
checks that no code path merges or approves one.

**Which languages are supported?**
English to German in v1. See the limits below.

**Can I keep my strings off a third-party API?**
Yes. Use the self-hosted provider: source strings are sent only to the
server you point `--llm-base-url` at.

**How is this different from pseudo-localization or CSS `text-overflow`?**
Pseudo-localization stretches placeholder text to expose layout bugs but
doesn't produce translations. `text-overflow: ellipsis` hides the
overflow instead of fixing the text. translate-robot produces a
translation that was measured to fit.

## v1 limits

v1 solves one pipeline end to end rather than several partially.

- One source locale and one target locale: English to German.
- Flat JSON i18n catalogs only. No nested keys, ICU plural rules, Fluent
  or gettext.
- One rendering engine: Chromium, via Playwright.
- One pull request per run.
- One translation provider per run, with no automatic fallback.

Not built yet: more target languages, nested catalogs, other browser
engines, batching several runs into one PR, falling back between
providers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions
and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.
Report security issues through [SECURITY.md](SECURITY.md), not a public
issue.

## License

[Apache License 2.0](LICENSE).
