# Suivi — ranges MTT

Dernière mise à jour : 9 novembre 2026.

## Où on en est

### Fait
- **Profondeurs** (9 nov.) : 100, 75, 50, 40, 30, 20, 19, 18 … 11bb, ≤10bb.
  Anciennes ranges déplacées : 60bb+ → 100bb, 25bb → 30bb, 15–20bb → 18bb, <12bb → ≤10bb
  (`lib/migrations-ranges.js`, lancé au premier accès et par le script de remplissage).
- **Pinceaux** : Raise, Call, 3bet, Shove, Loosifie, Tightifie, Fold — chacun sa couleur.
  Le trainer ne propose que les réponses présentes dans la range du spot (+ Fold).
- **Décision** : tu saisis tes ranges toi-même (ça fait travailler). Claude ne remplit plus de ranges.
- **Éditeur de ranges** (`/ranges`) :
  - choix de l'adversaire (« Contre » / « 3bet par ») pour la défense, le 3bet, la réponse au 3bet et le call de shove ; « Tous » = range valable contre n'importe qui ;
  - actions impossibles grisées (la BB n'ouvre pas, personne devant le LJ) ;
  - saisie en texte : `22+, A2s+, KTo+, T8s+, A5s:50` → posé avec le pinceau courant ;
  - validation : pastille **orange** = à vérifier, **verte** = validée ; bandeau « À vérifier », bouton « Valider la range », « Suivante à vérifier », compteur.
- **108 ranges de base** en base (Railway), écrites par Claude, pas sorties d'un solver.
  Étiquette « Base Claude — à vérifier » tant qu'elles ne sont pas enregistrées depuis l'éditeur.
  - Opens LJ→SB : 60bb+, 40, 25, 15–20 (raise + open-shove à 15–20).
  - Open-shove < 12bb : 5 positions.
  - 3bet en position : HJ, CO, BTN contre chaque ouvreur, 4 profondeurs.
  - Défense SB et BB contre chaque ouvreur, 4 profondeurs.
  - Face au 3bet : 60bb+, 40, 25.
  - Call de shove < 12bb : BB et SB contre chaque shoveur.
  - Seule range « réelle » : SB 15bb vs open BTN, lue dans GTO Wizard
    (jam 22+, A2s+, A3o+, K9s+, KTo+, Q9s+, QJo, J9s+, T8s+, 98s ; flat quasi jamais).
- Ta range **LJ RFI 60bb+** (saisie à la main) n'a pas été touchée.

### Fichiers
- `lib/ranges-base.js` : le jeu de base, en notation texte, modifiable.
- `scripts/remplir-ranges.mjs` : `node --env-file=.env scripts/remplir-ranges.mjs` (aperçu), `--ecrire` pour écrire.
  Ne touche jamais une range validée ou saisie à la main.
- `lib/spots.js` : clés de spot avec adversaire (`BB|DEF_VS_OPEN|25BB|BTN`).

## À faire

1. **Saisir tes ranges dans `/ranges`** depuis Suited (pack « 6max mtt KT_MC2 ») — par toi, avec les pinceaux Loosifie / Tightifie.
   Ancienne piste, si tu veux de l'aide pour relever : envoyer des captures.
   - Envoi : Win + Maj + S, puis Ctrl + V dans le terminal.
   - Sur chaque capture : grille entière (13 lignes — échelle Windows à 100 %, ou deux captures haut/bas), légende avec pourcentages, profondeur (« 25bb deep »), position.
   - Ordre : **opens** (LJ, HJ, CO, BTN, SB × toutes les profondeurs du menu « Range Info »), puis **3bets** (ouvreur par ouvreur).
   - Chaque relevé remplace la range de base du spot, reste marqué « à vérifier ».
   - Vérifier le relevé contre les pourcentages de la légende Suited.
   - Couleurs Suited vues : Fold, Raise [2.0bb], **Loosifie**, **Tightifie** — à clarifier (sens exact, comment les ranger dans l'app).
2. **Blindes (SB et BB) à 40bb et 75bb** : la profondeur 75bb existe maintenant ; saisie par toi.
3. **Page de consultation façon Suited, avec le design de l'app** : table avec les sièges en haut (cliquer qui ouvre, puis qui répond), grille du spot en lecture seule en dessous, légende avec pourcentages.
4. Ensuite : valider les 108 ranges une à une dans `/ranges`, en s'appuyant sur GTO Wizard pour les spots douteux.

## À retenir
- GTO Wizard : pas d'extraction automatique (conditions d'utilisation, risque pour le compte Elite). Consultation manuelle seulement.
  Solutions à tapis différents : ⚙ Changer → Stack type « Au hasard », trier par colonne ; tapis exacts : Custom solutions → New solution (lance un calcul sur le compte), ou Upload d'un historique de main.
- Suited : les ranges ne sont pas sur le disque (téléchargées depuis leur serveur). Capture de la fenêtre possible, mais les clics automatiques n'ont pas affiché les ranges → captures faites à la main.
- App en 6-max (LJ → BB). Le playbook parle de 8-max : UTG / UTG+1 à ajouter si besoin.
- Playbook : `../playbook-mtt.md` — deux erreurs relevées, non corrigées dans le fichier :
  exemple PKO (§4), pot final 43 000 et non 42 000 → ~42 % en vanilla ;
  bankroll (§9), 200–300 ABI × 7 € = 1 400–2 100 €.
