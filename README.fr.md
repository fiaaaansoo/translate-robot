English version → [README.md](README.md)

# translate-robot

**Des traductions i18n qui tiennent dans l'interface : mesurées dans un vrai navigateur, relues dans une pull request.**

[![CI](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml/badge.svg)](https://github.com/fiaaaansoo/translate-robot/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Vous ajoutez une chaîne d'interface en anglais. translate-robot la
traduit, affiche le vrai composant dans Chromium headless, vérifie que le
texte tient, recommence avec la mesure en retour si ça déborde, puis
ouvre une pull request à relire par un humain. Il ne fusionne ni
n'approuve jamais une pull request lui-même.

Il s'utilise en CLI ou en GitHub Action. Les traductions viennent de
l'API Anthropic ou de n'importe quel serveur auto-hébergé compatible
OpenAI (Ollama, vLLM).

## Le problème

Une traduction peut être correcte et casser la mise en page. L'allemand
de « Submit your monthly expense report » est plus long que l'anglais, et
un bouton de largeur fixe le coupe. Le nombre de caractères ne permet pas
de le prévoir : avec des polices proportionnelles ou des écritures
larges, deux textes de même longueur n'occupent pas la même largeur. En
général, le débordement est découvert sur une capture d'écran après la
mise en production.

## Avant et après

Chaîne source (`en`) : `Submit your monthly expense report`

**Traduction naïve** (`de`) : `Reichen Sie Ihren monatlichen Spesenbericht ein`

![Traduction allemande de « Submit your monthly expense report » coupée au bord droit d'un bouton bleu de 320 px](docs/images/before-overflow.png)

**translate-robot** (`de`) : `Spesenbericht einreichen`

![Le même bouton de 320 px avec la traduction allemande plus courte, qui tient dedans](docs/images/after-fit.png)

La seconde traduction est plus courte et perd « monatlichen » (mensuel).
C'est le compromis fait pour tenir dans l'espace, et c'est pourquoi un
humain relit chaque pull request.

## Essayer (aucune clé API nécessaire)

`--dry-run` rejoue une traduction pré-enregistrée sur le repo-jouet
[`fixtures/toy-repo/`](fixtures/toy-repo/README.md), un vrai composant
HTML avec son fichier i18n. Rien n'est écrit, aucune PR n'est ouverte.

```bash
git clone https://github.com/fiaaaansoo/translate-robot.git && cd translate-robot
npm install && npx playwright install chromium && npm run build
node bin/translate-robot run --repo fixtures/toy-repo --recorded-translations fixtures/toy-repo/translations.recorded.json --target-locale de --dry-run
```

Sortie :

```text
expense_report_submit: "Spesenbericht einreichen" (320px, 1 attempt(s), resolved)
```

Node.js ^22.12.0, ^24 ou >=26 est requis.

## Comment ça marche

1. **Diff.** Compare le catalogue source (`i18n/en.json`) à sa version sur
   la branche de base pour trouver les clés ajoutées ou modifiées.
2. **Résolution.** Associe chaque clé au composant où elle s'affiche
   (`i18n-map.json`).
3. **Mesure.** Affiche ce composant dans Chromium headless via
   Playwright, injecte la traduction candidate et compare le
   `scrollWidth` du nœud à son `clientWidth`, soit ce qu'un vrai
   navigateur montrerait à un utilisateur.
4. **Nouvel essai.** Si le texte déborde, le candidat repart vers le LLM
   avec la mesure (`"ce candidat était trop large de 23px, réessaie"`),
   pour un nombre d'essais borné.
5. **Pull request.** Écrit le catalogue cible (`i18n/de.json`), le
   committe sur une nouvelle branche et ouvre une pull request. Rien
   n'est fusionné.

> **Les traductions sont une sortie de LLM.** translate-robot vérifie
> qu'une traduction tient dans son composant. Il ne vérifie pas qu'elle
> est correcte, complète ou adaptée culturellement. Faites relire chaque
> pull request par quelqu'un qui lit la langue cible. Voir
> [SECURITY.md](SECURITY.md).

## L'utiliser sur votre dépôt

```bash
node bin/translate-robot run \
  --new-i18n i18n/en.json \
  --mapping i18n-map.json \
  --target-locale de \
  --owner <github-owner> \
  --repo-name <github-repo>
```

Ajoutez `--dry-run` pour voir le résultat sans rien écrire ni ouvrir de
PR, par exemple en CI. `node bin/translate-robot run --help` liste toutes
les options (chemin du catalogue source, branche de base, nombre
d'essais, etc.).

Par défaut, les traductions viennent de l'API Anthropic
(`ANTHROPIC_API_KEY`), et le jeton qui pousse la branche et ouvre la PR
vient de `GITHUB_TOKEN`. Aucun des deux n'est jamais journalisé ni inclus
dans un message d'erreur.

**Données et tiers.** translate-robot s'exécute sur votre machine ou dans
votre propre CI. Ce n'est pas un service hébergé et son auteur ne reçoit
aucune de vos données. Par défaut, chaque chaîne à traduire (avec la
langue cible et la largeur à respecter) est envoyée à l'API Anthropic
avec votre propre clé, selon votre contrat avec Anthropic (voir ses
conditions commerciales et sa documentation sur la conservation des
données). Les chaînes d'interface contiennent rarement des données
personnelles ; si les vôtres en contiennent, c'est à vous de disposer
d'une base légale et des accords nécessaires avec Anthropic. Avec
`--llm-provider openai-compatible`, les chaînes ne partent que vers le
serveur de `--llm-base-url` ; ce qu'il en fait dépend de la façon dont
vous l'exploitez. L'API est facturée à l'usage chez vous, et les essais
sont bornés. translate-robot n'est ni affilié à Anthropic, OpenAI,
Ollama, vLLM ou Microsoft, ni approuvé par eux ; ces noms décrivent
seulement la compatibilité.

### Modèle auto-hébergé

Passez `--llm-provider openai-compatible` pour traduire avec n'importe
quel serveur qui parle l'API chat completions d'OpenAI, comme une
instance Ollama ou vLLM auto-hébergée :

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

`--llm-base-url` et `--llm-model` sont tous deux obligatoires avec ce
fournisseur. Aucun n'a de valeur par défaut : s'il en manque un, l'outil
échoue franchement au lieu de se rabattre sur un mauvais hôte. Dans ce
mode, les chaînes sources ne sont envoyées qu'au serveur de
`--llm-base-url`. Si ce serveur exige une clé API, définissez
`TRANSLATE_ROBOT_LLM_API_KEY`. Un seul fournisseur par exécution, sans
repli automatique de l'un vers l'autre.

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

Le bloc `permissions` est le minimum requis par l'Action :
`contents: write` pour pousser la branche de traduction et
`pull-requests: write` pour ouvrir la PR. Limitez de la même façon tout
jeton que vous configurez. Il n'a jamais besoin d'un accès `admin`.

L'Action installe les dépendances et Chromium et compile la CLI à chaque
exécution (les caches npm et Playwright sont utilisés) : comptez
quelques minutes à froid.

Pour un modèle auto-hébergé, remplacez `anthropic-api-key` par
`llm-provider: openai-compatible`, `llm-base-url` et `llm-model`.

## FAQ

**Pourquoi les textes traduits débordent-ils des boutons ?**
Une traduction est souvent plus longue que la source, et la largeur
qu'un texte demande dépend de la police et de l'écriture, pas de son
nombre de caractères.

**Comment translate-robot vérifie-t-il qu'une traduction tient ?**
Il affiche le vrai composant dans Chromium headless et compare le
`scrollWidth` du nœud à son `clientWidth`.

**Fusionne-t-il automatiquement ?**
Non. Il ouvre une pull request puis s'arrête. Un test du dépôt vérifie
aussi qu'aucun chemin de code ne fusionne ni n'approuve une PR.

**Quelles langues sont prises en charge ?**
De l'anglais vers l'allemand en v1. Voir les limites ci-dessous.

**Puis-je garder mes chaînes hors d'une API tierce ?**
Oui, avec le fournisseur auto-hébergé : les chaînes sources ne sont envoyées
qu'au serveur indiqué par `--llm-base-url`.

**En quoi est-ce différent de la pseudo-localisation ou de `text-overflow` en CSS ?**
La pseudo-localisation étire un texte factice pour révéler les défauts de
mise en page, mais ne produit pas de traduction. `text-overflow:
ellipsis` masque le débordement au lieu de corriger le texte.
translate-robot produit une traduction mesurée pour tenir.

## Limites de la v1

La v1 résout un seul pipeline de bout en bout plutôt que plusieurs à
moitié.

- Une langue source, une langue cible : de l'anglais vers l'allemand.
- Catalogues JSON plats uniquement. Pas de clés imbriquées, de pluriels
  ICU, de Fluent ni de gettext.
- Un seul moteur de rendu : Chromium, via Playwright.
- Une pull request par exécution.
- Un seul fournisseur de traduction par exécution, sans repli
  automatique.

Pas encore construit : d'autres langues cibles, les catalogues imbriqués,
d'autres moteurs de navigateur, le regroupement de plusieurs exécutions
dans une seule PR, le repli entre fournisseurs.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les conventions de branches
et de commits, et [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) pour les règles
de la communauté. Les failles de sécurité passent par
[SECURITY.md](SECURITY.md), pas par une issue publique.

## Licence

[Apache License 2.0](LICENSE).
