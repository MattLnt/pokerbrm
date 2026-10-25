# Importer ses historiques

Sites actifs : **Winamax** et **Betclic** (`lib/constants.js`).
Les parsers PokerStars et PMU restent dans `lib/parsers/` — remettre une ligne
dans `SITES` suffit à réactiver un site.

Les deux parsers ont été écrits **sur de vrais fichiers**, pas sur une
supposition : 2 590 résumés Winamax et 3 fichiers d'export Betclic
(49 tournois). Les fixtures de `test/fixtures/` reproduisent ce format avec des
pseudos inventés — le dépôt est public, aucun fichier réel n'y est versé.

## Trouver ses fichiers

```bash
npm run historiques              # cherche aux emplacements connus
npm run historiques -- "C:/un/dossier"
```

Le script dit, par site : combien de fichiers, combien de tournois lus, et ce
qu'il ne sait pas lire.

### Winamax

Résumés de tournoi, un fichier par tournoi, nom en `…_summary.txt` :

```
Documents\Winamax Poker\accounts\<pseudo>\history\
```

L'enregistrement se règle dans **Options → Historique des mains**. Les tournois
joués avant l'activation ne sont pas récupérables.

Si un tracker (Xeester, HM, PT) tourne, il déplace souvent les fichiers dans son
propre dossier `processed` — le script regarde aussi là.

### Betclic

Betclic n'exporte **pas** de résumés de tournoi : il exporte les mains. Le
fichier obtenu s'appelle `<id>_ExportHH_<date>.txt` et vit en général dans
`Documents`. Le parser reconstitue chaque tournoi en regroupant les mains par
`Game ID` et en lisant le bloc `*** SUMMARY ***` de la dernière main.

## Importer

Depuis `/bankroll/import` : dépose le dossier entier. La déduplication se fait
sur `(site, identifiant de tournoi)`, donc réimporter deux fois le même dossier
ne crée pas de doublon.

## Ce que les fichiers ne disent pas

Ces limites viennent du format des sites, pas du code :

| Donnée | Winamax | Betclic |
| --- | --- | --- |
| Re-entries | **absent du résumé** | absent |
| Nombre d'inscrits | oui | **absent** |
| Détail rake / prime | oui | **non**, buy-in total seulement |
| Rebuys et add-ons | oui, rares | absent |

**Le point à surveiller : les re-entries.** Winamax ne les mentionne pas dans
le résumé de tournoi. Un tournoi ré-entré compte donc une seule cave, ce qui
sous-estime le coût et surestime le ROI. Si tu ré-entres souvent, le ROI affiché
est optimiste. Deux sorties possibles plus tard : déduire les re-entries des
historiques de mains, ou permettre une correction à la main sur la fiche du
tournoi.

Autres choix de calcul :

- Un **ticket gagné** (`You won Ticket 20€`) est suivi à part et n'entre pas
  dans le résultat net : ce n'est pas du cash, et les tickets sont traités
  comme un mouvement hors jeu.
- L'**ITM** compte les places payées, pas les primes KO : on ramasse des
  bounties bien avant la bulle.
- L'**Expresso** Winamax est classé en `SPIN`, pas en `KO`, bien qu'il soit à
  primes.

## Pièges du format Winamax, pour mémoire

Rencontrés sur les fichiers réels, tous couverts par des tests :

1. Un fichier contient souvent **deux blocs pour le même tournoi** : un bloc
   « Late Registration » intermédiaire, puis le bloc final. Seul le second
   porte le résultat. Prendre le premier ferait disparaître tous les gains.
2. La ligne de gain a six formes, dont `You won Bounty 3€` où aucun montant ne
   suit « won ».
3. Certains fichiers contiennent la séquence littérale `\u20ac` au lieu de `€`.
4. Les ordinaux sont irréguliers : `1202th`, `41th`.
5. La vitesse `semiturbo` existe, en plus de `normal` et `turbo`.
