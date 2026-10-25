# Session de jeu

Écran `/session`. Saisie en direct pendant qu'on joue, pour voir ce qu'une
session engage au moment où on l'engage — pas trois semaines plus tard.

## Le principe

L'import automatique répond à « combien j'ai gagné ». Il ne répond pas à
« combien je mets sur la table ce soir », parce qu'il arrive après coup. La
session comble ça, sans retomber dans la saisie intégrale.

Le coût par tournoi est d'**un tap**, parce que tout vient de la grille :
buy-in, rake, prime, format, vitesse. Il ne reste que le résultat, saisi à la
sortie du tournoi, à chaud.

## La grille

La liste des tournois habituellement joués (`TournamentTemplate`).

`npm run db:seed` la pré-remplit avec **53 MTT extraits de l'historique
Winamax réel** — ceux joués au moins 5 fois, avec leur buy-in, leur format,
leur vitesse et leur heure habituelle de lancement. Les Spins en sont absents.

Au moment d'inscrire, la grille est **triée par proximité horaire** : à 19 h,
les tournois de 19 h remontent en tête. L'heure est traitée comme cyclique,
donc 23 h est proche de 1 h. Sans ça, il faudrait chercher dans 53 lignes.

## Le déroulé

1. **Lancer une session.**
2. **Inscrire** un tournoi : un tap dans la grille. Le coût est engagé
   immédiatement et le résultat net vaut −coût tant que le tournoi n'est pas
   terminé — la bankroll reste juste en direct.
3. **Résultat** à la sortie : place, gain, primes si KO, et **re-entries**.
4. **Terminer** la session. Les tournois encore en jeu le restent : on peut
   clore la session et saisir un résultat plus tard.

## Les re-entries

C'est la seule donnée que les résumés Winamax ne donnent pas, et elle fausse
le ROI quand elle manque (cf. [IMPORT.md](IMPORT.md)). La saisie en session la
récupère : c'est le seul moment où on la connaît avec certitude.

## MTT seulement

`FORMATS_COMPTES` dans `lib/constants.js` vaut `["CLASSIC", "KO"]`.

Les Spins restent importés, stockés et comptés **dans le solde** — l'argent
sort et rentre vraiment. Mais ils n'entrent ni dans le profit, ni dans le ROI,
ni dans l'ITM : leur variance écraserait la lecture des MTT, et leur ITM
structurel de 37 % n'est pas comparable aux 21 % d'un KO.

Pour les réintégrer, ajouter `"SPIN"` à cette constante.

## Ce que la session calcule

- **Engagé** : tout ce qui est sorti, tournois en cours inclus. L'argent d'une
  inscription est dépensé à l'inscription, pas à la sortie.
- **Récupéré** : gains et primes des tournois terminés.
- **ROI** : rapporté au seul engagement MTT.
- **ITM** : sur les tournois terminés, places payées uniquement.
