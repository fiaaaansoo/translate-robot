# PRODUCT.md — translate-robot

À remplir dès que le projet a une vision produit/utilisateurs réels ; à
supprimer (ou réduire à une ligne) si c'est un outil interne/script sans
utilisateur externe.

## Vision

Un système d'agents qui traduit automatiquement les chaînes d'interface
ajoutées au code, en respectant la contrainte d'espace réelle du composant
où elles s'affichent, et qui livre le résultat comme une Pull Request GitHub
prête à relire — pour les équipes produit qui ajoutent des libellés i18n
plus vite qu'elles ne peuvent vérifier qu'ils rentrent à l'écran dans
chaque langue.

## Utilisateur cible

Des développeurs/équipes produit qui maintiennent une application
multilingue (i18n par clé de traduction) et veulent éviter la régression
classique : un libellé traduit automatiquement qui déborde d'un bouton,
d'un onglet ou d'une barre de navigation étroite sur certaines langues
(allemand, finnois...).

## Scope actuel

Rien n'est encore codé — seul le scaffold de coordination (`crew/`) et les
skills Claude Code sont en place. Le scope applicatif reste à définir au
premier chantier : détection des nouvelles clés i18n, résolution de la
contrainte visuelle réelle du composant (pas un simple compte de
caractères), traduction sous contrainte, validation par rendu réel, PR
groupée avec revue humaine obligatoire.

## Hors scope (explicitement)

- Merge automatique d'une traduction sans revue humaine.
- Traduction heuristique par nombre de caractères sans mesure de rendu
  réel (polices/CJK rendent ce proxy peu fiable — cf. discussion initiale
  du projet).
- Reverse engineering / analyse de binaires (hors sujet pour un projet
  i18n — écarté explicitement lors de l'évaluation des plugins externes).
