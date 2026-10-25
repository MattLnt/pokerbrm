# Charte graphique

Deux sources, fusionnées dans `app/globals.css` (bloc `@theme`) :

1. **`PROJET-APP-POKER.md` §8** et les maquettes `mockup-a.png` / `mockup-b.png`
   — la structure : cartes arrondies, nav basse 76 px, montants en mono.
2. **`Screenshot_20261021_171615_Facebook.jpg`** (encart Oreegami) — la
   direction visuelle : fond indigo profond avec dégradé pétrole, cartes
   numérotées, pastilles de statut à point, accent rose sur l'élément actif.
   Les valeurs ci-dessous ont été échantillonnées sur l'image.

## Couleurs

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Fond | `--color-bg` | `#090a1f` |
| Dégradé haut-droite | `--color-bg-teal` | `#0a2037` |
| Carte | `--color-surface` | `#131429` |
| Carte élevée | `--color-surface-2` | `#1a1b31` |
| Surface active | `--color-surface-3` | `#272437` |
| Bordure | `--color-line` | `#272437` |
| Bordure marquée | `--color-line-strong` | `#302d40` |
| Texte principal | `--color-ink` | `#eceef1` |
| Texte secondaire | `--color-ink-muted` | `#9aa1ad` |
| Titres de section | `--color-ink-section` | `#c9cdd4` |
| Accent (actions, nav) | `--color-accent` | `#6ea8fe` |
| Sélection active | `--color-rose` / `-bg` / `-line` | `#d03e7c` / `#38213b` / `#9c4276` |
| Catégorie tierce | `--color-teal` | `#3fa8c4` |
| Positif | `--color-positive` | `#4cc38a` |
| Alerte / négatif | `--color-warning` | `#f2994a` |

Le bleu `#6ea8fe` vient de la charte poker et reste la couleur d'action ; le rose
`#d03e7c` vient de la créa Oreegami et marque **l'élément sélectionné** (onglet,
chip, pinceau, bouton de choix). Les deux ne se disputent jamais le même rôle.

## Typographie

- **Inter** pour l'interface (`--font-sans`)
- **JetBrains Mono** pour tous les chiffres et montants (`--font-mono`),
  appliqué par la classe utilitaire `.num` qui active aussi `tabular-nums`
- `.kicker` : intertitre en capitales espacées, repris de la créa

## Règles

- Rayons : cartes 16 px (`--radius-card`), tuiles 14 px (`--radius-tile`)
- Cibles tactiles ≥ 44 px partout
- Nav basse fixe de 76 px + zone sûre iOS (`.pb-nav`)
- Largeur de contenu plafonnée à 480 px, centrée sur grand écran
- Montants au format français : `8 420 €`, `14,2 %`, signes `+` / `−`
  (vrai signe moins U+2212), espace fine insécable comme séparateur de milliers
  — tout passe par `lib/format.js`
