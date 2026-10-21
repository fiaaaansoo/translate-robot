# SECURITY.md — translate-robot

À remplir dès que le projet a de l'auth, des secrets, ou des données
utilisateur sensibles ; à supprimer sinon.

## Secrets

Token GitHub (App ou PAT scope minimal : lecture/écriture des fichiers de
langue + ouverture de PR, jamais `admin`) et clé API du service de
traduction/LLM : variables d'environnement uniquement, jamais commités,
jamais loggés en clair, jamais renvoyés dans une réponse d'agent ou un
message de commit/PR.

## Auth boundaries

Pas de service exposé côté utilisateur final pour l'instant (agents/CI
uniquement) — donc pas de session/token côté client à ce stade. Si un
dashboard ou une API de pilotage apparaît, revenir ici avant de l'exposer.

## Données sensibles / PII

Aucune donnée personnelle traitée par le robot lui-même : il lit des clés
i18n et du texte d'interface, pas de données utilisateur. Vigilance si une
clé de traduction contient par erreur un texte produit/PII — ne jamais le
relayer dans un log public ou une PR sans vérification.

## Pré-production checklist

- Jamais de merge automatique d'une PR de traduction (cf. CONTRIBUTING.md).
- Rate limiting / scope minimal sur le token GitHub utilisé par le robot.
- Vérifier qu'aucune clé API n'apparaît dans les logs CI ou le corps d'une
  PR générée.
