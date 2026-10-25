# App poker — résumé projet (V1)

Web app poker personnelle (usage strictement perso, pas de commercialisation) pour un joueur pro de MTT qui joue sur Winamax, PokerStars et PMU.
Objectif : piloter la progression (étude + jeu), gérer la bankroll, éditer ses propres ranges et s'entraîner dessus.
Le projet s'inscrit dans l'app poker complète déjà prévue (calculateurs cote/ICM/KO/Spin&KO et solver à venir) : la V1 en pose le socle.

---

## 1. Stack et conventions

- Next.js 15 App Router, **JavaScript (pas TypeScript)**
- Prisma + PostgreSQL (Railway)
- NextAuth (JWT), un seul utilisateur au départ, mais modèle de données prêt pour `userId`
- Déploiement Vercel
- **Mobile first** : toutes les interfaces sont pensées pour le téléphone d'abord, puis desktop
- Thème sombre (voir section 8)
- Plus tard : backend séparé pour le solver (fork de TexasSolver, C++/CFR) hébergé sur une machine perso, accessible à distance (Tailscale). Hors V1, mais garder l'architecture ouverte (appels via une API interne isolée).

---

## 2. Périmètre V1

Navigation basse à 5 onglets : **Accueil · Ranges · Étude · Trainer · Bankroll**

1. **Bankroll + résultats** (maquette validée, voir section 3)
2. **Éditeur de ranges** (section 4)
3. **Plan d'étude + suivi de progression** (section 5)
4. **Trainer** (section 6)
5. **Accueil** : tableau de bord qui agrège les 4 modules (section 7)

Ordre de développement conseillé : Bankroll → Ranges → Trainer → Étude → Accueil.

---

## 3. Module Bankroll (refonte)

### Problème de l'ancien système
La saisie manuelle était trop longue. **Principe de la refonte : zéro saisie par tournoi.** Les résultats viennent de l'**import des fichiers résumés de tournoi** (tournament summaries) des sites. Seuls les mouvements hors jeu se saisissent à la main, en 2 taps.

### Écran 1 — Vue d'ensemble (`/bankroll`)
- En-tête « Bankroll » + bouton d'import (icône téléchargement) → `/bankroll/import`
- **Carte bankroll totale** : montant total, variation sur la période (sélecteur 7 j / 30 j / 90 j / tout), mention « dont X € rakeback et bonus », courbe d'évolution
- **Par site** : une ligne par site (Winamax, PokerStars, PMU) avec solde, variation sur la période, date du dernier import et nombre de tournois. Alerte orange si le dernier import date de plus de 7 jours (« à mettre à jour »)
- **Règles de buy-in** :
  - Badge de statut : « Dans les clous » (vert) / « Au-dessus de la limite » (orange) si des tournois récents dépassent le buy-in max
  - 3 cartes par format : MTT classique, KO, Spin — buy-in max calculé = bankroll / nombre de caves du format
  - Barre de progression vers le palier suivant (« Prochain palier : ABI 50 € — 8 420 / 10 000 € ») + seuil de descente (« Descente si la bankroll passe sous 6 500 € »)
- **Résultats sur la période** : profit de jeu, rakeback et bonus (séparés), ROI, ITM ; boutons de ventilation **Par format / Par buy-in / Par site**
- **Derniers mouvements** : dépôts, retraits, rakeback, tickets

### Écran 2 — Import (`/bankroll/import`)
- Zone de dépôt « Dépose ton dossier d'historiques » + bouton « Choisir des fichiers » (multi-fichiers, dossier entier accepté)
- Détection automatique du site par fichier, **déduplication** par identifiant de tournoi (site + tournamentId)
- Bloc **Détecté** : par site, nombre de nouveaux tournois, doublons ignorés, résultat net
- Bloc **Aperçu** : premières lignes (nom du tournoi, site, format, re-entries, KO, place, gain net) + lien « Voir les N tournois »
- Bloc **Mouvements hors jeu** (comptés à part du profit de jeu) : Dépôt, Retrait, Rakeback, Bonus/ticket → petit formulaire en bottom sheet (site, montant, date, note)
- Bouton fixe en bas « Importer N tournois »
- Si un format de fichier n'est pas reconnu : le signaler (« format à valider ») sans bloquer les autres

### Parsing des fichiers
- Un parser par site : `lib/parsers/winamax.js`, `lib/parsers/pokerstars.js`, `lib/parsers/pmu.js`, avec une interface commune :
  `parse(fileContent) → [{ site, tournamentId, name, date, buyIn, fee, bounty, reEntries, finishPosition, entrants, prize, bountiesWon, format, speed, currency }]`
- Le parsing se fait côté serveur (route API) ou côté client puis envoi du JSON — au choix, mais les fichiers bruts ne sont pas stockés
- **PMU : format inconnu à ce stade**, il faut un exemple de fichier avant de coder ce parser
- Détection du format (classique / KO / Spin) et de la vitesse (normal / turbo / hyper) à partir du nom et des champs du résumé, avec possibilité de corriger à la main dans la liste
- Calcul : coût total = (buyIn + fee + bounty) × (1 + reEntries) ; gain net = prize + bountiesWon − coût total

### Règles de buy-in
- Paramétrables dans les réglages : nombre de caves par format (valeurs par défaut : classique 200, KO 150, Spin 100)
- Paliers de montée/descente définis par l'utilisateur (ABI cible + bankroll requise + seuil de descente)
- Le solde par site est calculé : dépôts − retraits + gains nets importés + rakeback/bonus. Un ajustement manuel du solde reste possible (mouvement de type « correction »).

---

## 4. Module Éditeur de ranges (`/ranges`)

- Grille **13×13** éditable (paires sur la diagonale, suited au-dessus, offsuit en dessous)
- Ranges organisées par **spot** : position (UTG → BB) × action (RFI, défense vs open, 3bet, vs 3bet, shove, call shove…) × **profondeur de tapis** (paliers : 60bb+, 40bb, 25bb, 15–20bb, <12bb)
- Plusieurs actions par main avec fréquences (ex. raise 60 % / call 40 %) ; pinceaux de couleur par action
- Outils : sélection rapide (« toutes les paires », « Ax suited »…), copier une range d'un spot vers un autre, dupliquer pour une autre profondeur
- **Stats** en direct : % de mains et nombre de combos par action
- L'utilisateur saisit ses ranges lui-même (aucune range pré-remplie)
- Mobile : grille plein écran, tap pour peindre, appui long pour régler la fréquence

---

## 5. Module Plan d'étude + suivi (`/etude`)

Programme de progression MTT par blocs (thèmes modifiables) :
1. **Préflop par profondeur** (sem. 1–4) : RFI par position et par tapis → défense BB → stratégie SB → 3bet vs flat → face au 3bet → push/fold et resteal <20bb
2. **Postflop pots simples** (sem. 5–8) : c-bet BTN/CO vs BB par texture, défense BB vs c-bet, turn
3. **Pots 3bet et rivière** (sem. 9–10)
4. **ICM** (sem. 11–12 puis en continu) : bulle, ITM, table finale

Fonctions :
- Thème de la semaine + objectifs cochables
- **Journal d'étude** : sessions avec durée, type (théorie / drill / revue de mains / revue de base de données), thème, notes
- Cible hebdo : 5 jours d'étude, 1 h à 1 h 30 par jour (paramétrable) ; jauge de temps réalisé vs cible
- **Mains taguées** : ajout rapide d'une main à revoir (spot, tapis, description, lien ou texte d'historique) ; statut à revoir / revue
- Révision mensuelle des thèmes passés (rappel)
- Lien avec les ranges : un thème préflop pointe vers les spots de l'éditeur concernés

---

## 6. Module Trainer (`/trainer`)

- Drills préflop basés **sur les ranges de l'utilisateur** : l'app tire un spot (position, tapis, action précédente) et une main, l'utilisateur choisit l'action, correction immédiate avec la fréquence attendue
- Filtres : catégorie de pot (préflop, 3bet, 4bet, push/fold, ICM, HU, TF, multiway — les catégories postflop viendront avec le solver), position, profondeur
- **Répétition espacée** : les mains ratées reviennent plus souvent
- Stats : % de réussite par spot, évolution dans le temps, spots les plus faibles (alimente l'Accueil et le Plan d'étude)
- Sessions courtes (20 à 50 mains), adaptées au mobile

---

## 7. Accueil (`/`)

- Bankroll totale + variation
- Étude de la semaine : thème, temps fait / cible
- Spots les plus faibles au trainer
- Bouton « Lancer un drill » sur le spot le plus faible
- Rappel d'import si un site n'a pas été importé depuis plus de 7 jours

---

## 8. Design

Maquettes mobiles 390 px de large (captures jointes : `bankroll-vue-ensemble.png`, `bankroll-import.png`).

- Fond `#0F1115`, cartes `#181B21`, bordures `#262A32`, barre de nav `#14171C`
- Texte principal `#ECEEF1`, secondaire `#9AA1AD`, titres de section `#C9CDD4`
- Accent `#6EA8FE` (bleu), positif `#4CC38A`, alerte/négatif `#F2994A`
- Polices : **Inter** (interface), **JetBrains Mono** (montants et chiffres)
- Cartes arrondies 14–18 px, cibles tactiles ≥ 44 px, nav basse fixe de 76 px
- Montants au format français : `8 420 €`, `14,2 %`, signe `+`/`−`

---

## 9. Modèle de données (proposition Prisma)

- `User`
- `Site` (Winamax, PokerStars, PMU) — `name`, `lastImportAt`
- `Tournament` — `siteId`, `externalId` (unique avec `siteId`), `name`, `playedAt`, `buyIn`, `fee`, `bounty`, `reEntries`, `entrants`, `finishPosition`, `prize`, `bountiesWon`, `netResult`, `format` (CLASSIC/KO/SPIN), `speed`, `importBatchId`
- `ImportBatch` — `createdAt`, `fileCount`, `newCount`, `duplicateCount`
- `Transaction` — `siteId`, `type` (DEPOSIT/WITHDRAWAL/RAKEBACK/BONUS/TICKET/ADJUSTMENT), `amount`, `date`, `note`
- `BankrollRule` — `format`, `buyInsRequired` ; `BankrollLevel` — `targetAbi`, `bankrollRequired`, `stopLoss`
- `Range` — `position`, `action`, `stackDepth`, `vsPosition`, `cells` (JSON : main → `{ action: fréquence }`)
- `StudyTheme`, `StudySession` (`date`, `minutes`, `type`, `themeId`, `notes`), `TaggedHand`
- `DrillAttempt` — `rangeId`, `hand`, `answer`, `correct`, `createdAt` (+ champs de répétition espacée)

---

## 10. Points ouverts

- Exemple de fichier résumé **PMU** à fournir avant de coder son parser (et exemples Winamax / PokerStars pour valider les parsers)
- Paliers de buy-in réels à renseigner (les valeurs des maquettes sont des exemples)
- Maquettes à faire avant de coder les autres modules : Ranges, Étude, Trainer, Accueil
