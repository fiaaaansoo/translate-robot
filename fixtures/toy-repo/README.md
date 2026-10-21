# toy-repo — fixture de démo (en→de)

Mini "repo cible" autonome, utilisé par la CLI `translate-robot` (tâches
04-07) comme cas de test de bout en bout. Simule une vraie application
qui a une chaîne i18n neuve (`expense_report_submit`) s'affichant dans un
bouton de largeur contrainte.

## Le bug que ça démontre

Le bouton a `width: 320px` fixe + `white-space: nowrap`, sans
`overflow: hidden` ni retour à la ligne — une traduction trop longue
déborde **visuellement** du fond bleu du bouton au lieu d'être coupée
proprement. C'est exactement le bug que le projet existe pour éviter
(cf. `PRODUCT.md` racine) : un traducteur automatique naïf produit
`"Reichen Sie Ihren monatlichen Spesenbericht ein"` (48 caractères) pour
la clé `expense_report_submit`, qui déborde nettement à 320px ; la
traduction enregistrée dans `translations.recorded.json`
(`"Spesenbericht einreichen"`, 24 caractères) tient dans la contrainte.
Vérifié par capture d'écran réelle (Chromium headless, pas une estimation
par comptage de caractères) pendant le bootstrap de cette fixture — même
méthode que celle que l'étape de mesure (tâche 05) devra automatiser.

## Fichiers

- `component/button.html` — le composant réel, autonome (ouvrable
  directement dans un navigateur ou en headless). Contient le texte
  source anglais tel qu'il existe dans le "vrai" repo avant traduction.
- `i18n/en.json` — fichier i18n source, plat, une clé par chaîne UI.
- `i18n-map.json` — mapping **clé → composant** déclaré explicitement
  (pas d'inférence AST en v1, cf. décision CEO/architect). Schéma :

  ```json
  {
    "<clé i18n>": {
      "component": "<chemin relatif à ce dossier vers le fichier HTML>",
      "selector": "<sélecteur CSS du nœud dont le texte est traduit>"
    }
  }
  ```

  La tâche `04-extracteur-contexte-i18n.md` lit ce fichier pour résoudre,
  pour chaque clé modifiée du diff i18n, quel composant et quel nœud
  mesurer. Pas de valeur de largeur numérique à déclarer ici : la
  contrainte vient de la CSS du composant lui-même (`width` fixe,
  `white-space: nowrap`) — la mesure (tâche 05) compare le `scrollWidth`
  du nœud rendu à son `clientWidth` une fois le candidat de traduction
  injecté, pas un budget de caractères codé en dur.

- `translations.recorded.json` — réponse de traduction en→de
  **pré-enregistrée**, pour que `05-traducteur-validateur-contrainte.md`
  et `07-cli-orchestration-e2e.md` puissent tourner en mode
  test/`--dry-run` sur cette fixture sans appeler de LLM réel (cf.
  décision dans ces deux tâches). Schéma : `{ "<clé>": { "<locale
  cible>": "<texte traduit>" } }`.

## Vérifier soi-même

Ouvrir `component/button.html` dans un navigateur, ou en headless :

```bash
chromium --headless=new --screenshot=out.png --window-size=560,200 \
  "file://$(pwd)/component/button.html"
```

Le bouton affiche le texte anglais source sans déborder. Remplacer le
texte du bouton par la valeur de `translations.recorded.json` pour
vérifier qu'elle tient aussi ; par la traduction littérale
`"Reichen Sie Ihren monatlichen Spesenbericht ein"` pour voir le
débordement que ce projet est censé empêcher.
