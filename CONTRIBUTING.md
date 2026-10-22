# CONTRIBUTING.md — translate-robot

Merci de contribuer ! Ce document couvre les conventions attendues pour une
contribution. Le suivi des tâches en cours vit dans `crew/` (voir
`crew/CLAUDE_CONTEXT/AGENTS.md`) — pas besoin de le consulter pour une simple
PR externe.

Toute participation à ce projet est soumise à notre
[Code de conduite](CODE_OF_CONDUCT.md).

## Branches

`feat/<slug>`, `fix/<slug>`, `chore/<slug>` ; une branche `claude/*` est
acceptée pour le travail d'un agent, à fusionner ou rebaser avant de
fusionner sur `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) : `feat:`,
`fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Un commit = un changement
logique cohérent ; pas de "wip" ou "fix typo" en squash final.

## Pre-commit

`python check_placeholders.py` bloque un commit si un placeholder `<...>`
de bootstrap reste dans CLAUDE.md/AGENTS.md/PRODUCT.md/CONTRIBUTING.md/
SECURITY.md/crew. Setup une fois par checkout :
`git config core.hooksPath .githooks`. Un agent Claude Code sur ce repo
l'a déjà via un hook `PreToolUse` dans `.claude/settings.json` — pas de
setup requis dans ce cas.

## Pull requests

Revue obligatoire avant merge sur `main` — jamais de merge automatique,
en particulier pas pour une PR qui modifie des fichiers de traduction (la
qualité d'une traduction automatique n'est pas vérifiable par CI seule).
CI doit être verte (lint + tests une fois qu'il y en a) avant merge.
