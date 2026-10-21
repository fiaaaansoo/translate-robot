# CONTRIBUTING.md — translate-robot

À remplir si plusieurs contributeurs/agents travaillent sur ce repo, ou si tu
veux des conventions stables entre sessions. À supprimer si solo sans
convention particulière (le suivi de tâches vit dans `crew/` de toute façon).

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
