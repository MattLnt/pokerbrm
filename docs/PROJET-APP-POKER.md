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
- **Règles de buy-in**, une carte **par room** :
  - Badge de statut global : « Dans les clous » (vert) / « Au-dessus de la limite » (orange) — une seule room au-dessus de son plafond fait basculer le badge
  - Par room : le buy-in max du palier joué, l'échelle complète (5 / 10 / 20 / 50 €) avec un cadenas sur ce qui n'est pas encore ouvert, la barre de progression vers le palier suivant et le seuil de repli
- **Mouvements** (écran d'import) : dépôt, retrait, rakeback, bonus/ticket, **transfert entre rooms**, correction de solde
- **Repartir de zéro** (écran d'import) : vide l'historique de jeu en deux temps, en annonçant le décompte exact avant d'effacer
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
- **Pas d'ABI** : un nombre de caves à tenir par format, recalculé à chaque euro gagné, se gère mal en jouant. On raisonne en **buy-in maximum** — à chaque palier un plafond, et tout ce qui est moins cher reste autorisé.
- **Par room, pas sur la bankroll totale** : 2 000 € sur Winamax et 3 000 € sur Betclic, ce sont les 10 € sur Winamax et les 20 € sur Betclic — pas les 20 € partout. C'est ce qui fait du **transfert entre rooms** la manœuvre pour monter de palier quelque part.
- Barème : **200 caves pour monter, 150 pour redescendre**. Échelle fixe, dans `PALIERS_BUYIN` (`lib/constants.js`) :

  | Buy-in max | On y monte à | On en redescend sous |
  | --- | --- | --- |
  | 5 € | — (plancher) | — |
  | 10 € | 2 000 € | 1 500 € |
  | 20 € | 4 000 € | 3 000 € |
  | 50 € | 10 000 € | 7 500 € |

- Les deux seuils d'un palier sont volontairement différents : sans cet écart, on changerait de palier à chaque session autour d'un seuil unique. Conséquence : entre 1 500 et 2 000 €, le palier joué dépend du chemin parcouru, pas du seul solde. `computePalier` rejoue donc l'historique de la room depuis zéro (`lib/bankroll.js`).
- Les **5 € sont le plancher** : pas de seuil de descente, et pas de palier en dessous même si la bankroll fond. Choix assumé — les 2 € de la grille restent hors barème.
- Même passe pour la conformité : chaque tournoi est jugé sur le palier en vigueur **le jour où il a été joué**. Un 20 € joué quand le plafond était à 10 € reste une sortie de route même si la room a doublé depuis — et inversement.
- Prix du ticket = buy-in + rake + prime. Les re-entries n'y entrent pas : elles coûtent cher, mais ne font pas monter de palier.
- Pas de table pour tout ça : l'échelle est une constante de l'app, pas une donnée éditable. Changer un seuil est un commit, pas une migration.
- Le solde d'une room = dépôts − retraits ± transferts + rakeback/bonus/tickets + corrections + gains nets des tournois.

### Transferts entre rooms
- Un transfert n'est **ni un dépôt ni un retrait** : la bankroll totale ne bouge pas, seuls les deux soldes changent — et donc les deux paliers.
- Écrit en **deux mouvements jumeaux** (`TRANSFER_OUT` / `TRANSFER_IN`) reliés par un même `transferId`, créés dans une seule transaction : une sortie sans son entrée ferait disparaître de l'argent de la bankroll totale.
- Affiché comme un seul geste dans les derniers mouvements (« Transfert · Winamax → Betclic »), sans signe ni couleur.

### Repartir de zéro
- `POST /api/reset` efface **tournois, sessions, lots d'import et mouvements d'argent**, en une transaction, et remet `lastImportAt` à vide.
- Épargne tout le reste : ranges, programme d'étude, mains mises de côté, révisions du trainer, grille de tournois. Des mois de saisie qui n'ont rien à voir avec un solde.
- `GET /api/reset` renvoie le décompte, pour que l'écran annonce ce qui va disparaître avant de le faire.
- Après le reset la bankroll vaut zéro : le point de départ se repose avec un mouvement **Correction** par room.

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
- `Transaction` — `siteId`, `type` (DEPOSIT/WITHDRAWAL/RAKEBACK/BONUS/TICKET/ADJUSTMENT/TRANSFER_IN/TRANSFER_OUT), `amount`, `date`, `note`, `transferId` (relie les deux moitiés d'un transfert)
- Pas de table pour les paliers de buy-in : l'échelle est une constante de l'app (`PALIERS_BUYIN`), pas une donnée éditable
- `Range` — `position`, `action`, `stackDepth`, `vsPosition`, `cells` (JSON : main → `{ action: fréquence }`)
- `StudyTheme`, `StudySession` (`date`, `minutes`, `type`, `themeId`, `notes`), `TaggedHand`
- `DrillAttempt` — `rangeId`, `hand`, `answer`, `correct`, `createdAt` (+ champs de répétition espacée)

---

## 10. Points ouverts

- Exemple de fichier résumé **PMU** à fournir avant de coder son parser (et exemples Winamax / PokerStars pour valider les parsers)
- Maquettes à faire avant de coder les autres modules : Ranges, Étude, Trainer, Accueil
