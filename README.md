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

- **Parser PMU** : le format des résumés PMU n'est pas spécifié. `lib/parsers/pmu.js`
  détecte le site et affiche « format à valider » sans bloquer les autres imports.
  Déposer un vrai fichier pour coder le parser.
- **Parsers Winamax et PokerStars** : écrits d'après le format public documenté,
  pas encore validés sur de vrais fichiers. Déposer des résumés réels dans
  `test/fixtures/<site>/` et compléter `test/parsers.test.mjs`.
- **Paliers de bankroll** : les valeurs du seed sont des exemples.
- **Authentification** : la V1 tourne sur un utilisateur unique
  (`lib/user.js`). Le modèle porte déjà un `userId` partout, donc brancher
  NextAuth ne demandera que de remplacer `getCurrentUser()`.
