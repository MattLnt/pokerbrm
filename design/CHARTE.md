# Charte graphique

Reprise de la charte de l'**admin webapp** (`webapp-admin-rho.vercel.app`, jeu
de jetons « charte b »). Tout tient dans `app/globals.css` : le bloc `@theme`
pour ce qui doit devenir un utilitaire Tailwind, un `:root` pour le reste de
l'échelle, et un `@layer components` pour les classes `.bd-*`.

Le principe de la charte, et ce qui la distingue de la version précédente de
cette app : **les surfaces sont plates**. La hiérarchie vient de la valeur du
fond et d'un filet blanc translucide — jamais d'un dégradé, d'une ombre ou
d'un halo. Une surface ne brille pas, et une carte au survol ne se soulève
pas : son fond monte d'un cran.

## Couleurs

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Fond de nav | `--color-bg-deep` | `#070b16` |
| Fond creusé (barre de progression, bloc imbriqué) | `--color-bg-sunken` | `#0e1526` |
| Fond de page | `--color-bg` | `#0a0f1c` |
| Carte | `--color-surface` | `#121a2e` |
| Carte haute (champ, carte survolée) | `--color-surface-2` | `#18223a` |
| Surface active | `--color-surface-3` | `#202b47` |
| Filet | `--color-line` | `#ffffff14` |
| Filet marqué | `--color-line-strong` | `#ffffff24` |
| Texte principal | `--color-ink` | `#eef2f9` |
| Texte secondaire | `--color-ink-section` | `#a8b4cc` |
| Texte discret | `--color-ink-muted` | `#93a0ba` |
| Accent (actions, nav, focus) | `--color-accent` | `#38bdf8` |
| Accent survolé / texte sur fond doux | `--color-accent-hover` | `#7dd3fc` |
| Texte sur fond d'accent plein | `--color-accent-fg` | `#06121f` |
| Fond d'accent doux | `--color-accent-soft` | `#0f2a3d` |
| Filet d'accent | `--color-accent-line` | `#38bdf84d` |
| Sélection (chip, pinceau, onglet) | `--color-rose` / `-hover` / `-bg` / `-line` | `#f472b6` / `#f9a8d4` / `#241c33` / `#f472b64d` |
| Positif | `--color-positive` | `#34d399` |
| Alerte | `--color-warning` | `#fbbf24` |
| Négatif | `--color-negative` | `#fb7185` |

Deux accents, deux rôles qui ne se disputent jamais : le **bleu ciel** est la
couleur d'action (bouton primaire, lien, nav active, focus), le **rose** marque
l'élément *sélectionné*. Dans les deux cas l'état sélectionné se lit `fond très
dilué + filet de la teinte + texte dans la teinte claire` — pas un aplat saturé.

Les filets sont du blanc translucide, pas une couleur opaque : ils suivent le
fond sur lequel on les pose.

## Échelles

- **Rayons** : `--radius-xs` 6 · `-sm` 8 (contrôles) · `-tile` 11 · `-card` 14 ·
  `-xl` 18 (feuilles) · `-pill`
- **Espacements** : `--sp-1` … `--sp-12` (4 → 48 px)
- **Texte** : 10,5 / 11,5 / 12,5 / 13,5 / 15 / 17 / 22 / 30 / 34 / 60 px.
  L'échelle de la charte **remplace celle de Tailwind** : `text-sm` vaut donc
  12,5 px et non 14, `text-base` 13,5 px. Les variables `--fs-*` donnent les
  mêmes valeurs pour un `text-[var(--fs-md)]` ponctuel.
- **Hauteurs de contrôle** : `--control-sm` 36 · `-md` 40 · `-lg` **44**
  (le défaut ici, cible tactile) · `-xl` 52
- **Ombres** : `--shadow-sm` est **nulle** — les cartes n'ont pas d'ombre.
  `--shadow-lg` (classe `.flottant`) est réservée aux éléments qui flottent
  vraiment : feuilles, menus, popovers.

## Typographie

**Inter partout**, comme la charte d'origine — y compris pour les chiffres.
C'est la grotesque dessinée sur le modèle de San Francisco ; aucune fonte à
chasse fixe n'entre dans l'interface, elle donnait aux montants un air de
sortie de terminal.

- Graisse 700 pour l'affichage, interlettrage `--ls-heading` (-0.025em) sur
  les titres, `--ls-display` (-0.035em) réservé aux très grands chiffres
- `.num` : chiffres de largeur fixe (`tabular-nums`) pour que les montants
  s'alignent en colonne d'une ligne à l'autre. Pas de changement de fonte.
- `.kicker` : intertitre en capitales, 10,5 px, interlettrage 0.18em
- `.chiffre-hero` : le montant principal d'un écran
- Rien ne dépasse `--fs-3xl` (34 px) : un titre de page est à 22 px, le
  chiffre principal d'un écran à 30 px et 34 px sur grand écran. L'échelle
  monte jusqu'à 60 px mais on ne s'en sert pas — l'interface est dense.

## Composants

`.bd-btn` (+ `--primary`, `--outline`, `--ghost`, `--danger`), `.bd-input`,
`.bd-select`, `.bd-textarea`, `.bd-chipbar` / `.bd-chipbtn`. Ils vivent dans
`@layer components` : un utilitaire Tailwind posé sur le même élément
(`pl-11`, `text-lg`…) les surcharge normalement.

`components/ui.js` s'appuie dessus — `Button` n'est qu'un habillage de
`.bd-btn`.

## Règles

- Fond de page : trame régulière de 56 px à `#ffffff09`, fixe
- Focus visible partout : contour 2 px d'accent, décalé de 2 px
- Cibles tactiles ≥ 44 px, sauf `.bd-chipbtn` (les filtres vont par six)
- Nav basse fixe de 76 px + zone sûre iOS (`.pb-nav`), rail latéral à partir
  de `lg`
- Montants au format français : `8 420 €`, `14,2 %`, signes `+` / `−` (vrai
  signe moins U+2212), espace fine insécable comme séparateur de milliers —
  tout passe par `lib/format.js`
