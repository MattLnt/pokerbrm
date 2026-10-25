# pokerbrm

Application poker personnelle pour joueur de MTT : bankroll, éditeur de ranges,
plan d'étude et trainer. Usage strictement privé.

Le cahier des charges est dans [`docs/PROJET-APP-POKER.md`](docs/PROJET-APP-POKER.md).

## Stack

- Next.js 16 (App Router) en **JavaScript**, Tailwind CSS v4
- Prisma 7 + PostgreSQL (Railway), via driver adapter `@prisma/adapter-pg`
- Déploiement Vercel
- Mobile first, thème sombre

## Démarrer

```bash
npm install
npm run dev
```

Sans `DATABASE_URL`, l'app démarre sur un **jeu de données d'exemple** — toutes
les pages sont navigables et l'en-tête affiche « Données d'exemple ». L'écriture
(import, mouvements, ranges, sessions) est désactivée tant qu'aucune base n'est
branchée.

## Brancher la base

1. Copier `.env.example` vers `.env` et renseigner l'URL Railway :

   ```
   DATABASE_URL="postgresql://…@…railway…/railway"
   ```

2. Créer le schéma puis l'amorcer :

   ```bash
   npm run db:push     # ou npm run db:migrate pour une migration versionnée
   npm run db:seed
   ```

3. Relancer `npm run dev`. Le bandeau « Données d'exemple » disparaît.

## Scripts

| Script | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (parsers, bankroll, grille, répétition espacée) |
| `npm run db:push` | Applique le schéma à la base |
| `npm run db:migrate` | Migration versionnée |
| `npm run db:seed` | Sites, règles, paliers et programme d'étude |
| `npm run db:studio` | Explorateur Prisma |
| `npm run historiques` | Cherche les historiques de poker sur la machine |

## Organisation

```
app/
  page.js              Accueil — agrège les 4 modules
  bankroll/            Vue d'ensemble + écran d'import
  ranges/              Éditeur de grille 13×13
  etude/               Plan d'étude et journal
  trainer/             Drills préflop sur tes propres ranges
  api/                 Routes d'écriture (import, transactions, ranges, …)
lib/
  parsers/             Un parser par site + registre de détection
                       winamax : résumés de tournoi
                       betclic : mains regroupées par tournoi
  bankroll.js          Soldes, ROI/ITM, buy-in max, paliers, courbe
  hands.js             Grille 169 mains, combos, statistiques de range
  spaced.js            Répétition espacée (SM-2 simplifié)
  data.js              Accès aux données — bascule base / exemple
  demo.js              Jeu de données d'exemple
prisma/schema.prisma   Modèle de données
test/                  Tests Node (`node --test`)
design/                Maquettes et référence graphique
```

## Points ouverts

- **Re-entries Winamax** : le résumé de tournoi ne les mentionne pas. Un tournoi
  ré-entré compte une seule cave, ce qui sous-estime le coût et surestime le ROI.
  Voir [docs/IMPORT.md](docs/IMPORT.md).
- **Paliers de bankroll** : les valeurs du seed sont des exemples.
- **Parser PokerStars** : site inactif, parser écrit d'après le format public et
  jamais confronté à un vrai fichier. PMU de même, et son format est inconnu.
- **Authentification** : la V1 tourne sur un utilisateur unique
  (`lib/user.js`). Le modèle porte déjà un `userId` partout, donc brancher
  NextAuth ne demandera que de remplacer `getCurrentUser()`.
