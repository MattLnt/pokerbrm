/**
 * Remplit l'éditeur de ranges avec le jeu de base (`lib/ranges-base.js`).
 *
 *   node --env-file=.env scripts/remplir-ranges.mjs           (aperçu)
 *   node --env-file=.env scripts/remplir-ranges.mjs --ecrire  (écrit)
 *
 * Ne touche jamais une range saisie ou validée à la main :
 * - spot vide → la range de base est créée, marquée « à vérifier » ;
 * - spot portant encore la range de base non relue → elle est mise à jour ;
 * - tout autre spot → laissé tel quel.
 */

import { prisma } from "../lib/db.js";
import { lireRangeTexte } from "../lib/hands.js";
import { RANGES_BASE, BASE_NOM } from "../lib/ranges-base.js";
import { spotKey, actionPossible, adversaireValide } from "../lib/spots.js";

const ECRIRE = process.argv.includes("--ecrire");

if (!prisma) {
  console.error("Pas de DATABASE_URL : lance le script avec --env-file=.env.");
  process.exit(1);
}

/** Cellules de l'éditeur : call, puis raise, puis shove — le dernier gagne. */
function cellules(mains) {
  const cells = {};
  for (const pinceau of ["call", "raise", "shove"]) {
    if (!mains[pinceau]) continue;
    const { mains: liste, illisibles } = lireRangeTexte(mains[pinceau]);
    if (illisibles.length > 0) {
      throw new Error(`Range illisible (${pinceau}) : ${illisibles.join(", ")}`);
    }
    for (const { main, frequence } of liste) {
      cells[main] = { [pinceau]: frequence ?? 100 };
    }
  }
  return cells;
}

// Même compte que `getCurrentUser` (lib/user.js), qu'on ne peut pas importer
// ici : il tire un JSON que seul Next sait charger sans attribut d'import.
const email = process.env.APP_USER_EMAIL ?? "moi@pokerbrm.local";
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`Aucun compte ${email} : ouvre l'app une fois pour le créer.`);
  process.exit(1);
}
const existantes = await prisma.range.findMany({ where: { userId: user.id } });
const parCle = new Map(existantes.map((r) => [spotKey(r), r]));

const bilan = { crees: 0, misesAJour: 0, gardees: [] };

for (const spot of RANGES_BASE) {
  const cle = spotKey(spot);
  if (
    !actionPossible(spot.action, spot.position) ||
    !adversaireValide(spot.action, spot.position, spot.vsPosition)
  ) {
    throw new Error(`Spot impossible dans le jeu de base : ${cle}`);
  }

  const cells = cellules(spot.mains);
  const existante = parCle.get(cle);
  const vide = !existante || Object.keys(existante.cells ?? {}).length === 0;

  if (existante && !vide && existante.name !== BASE_NOM) {
    bilan.gardees.push(cle);
    continue;
  }

  if (ECRIRE) {
    if (existante) {
      await prisma.range.update({
        where: { id: existante.id },
        data: { cells, name: BASE_NOM },
      });
    } else {
      await prisma.range.create({
        data: {
          userId: user.id,
          position: spot.position,
          action: spot.action,
          vsPosition: spot.vsPosition,
          stackDepth: spot.stackDepth,
          name: BASE_NOM,
          cells,
        },
      });
    }
  }
  if (existante) bilan.misesAJour += 1;
  else bilan.crees += 1;
}

console.log(ECRIRE ? "Écrit :" : "Aperçu (rien d'écrit, ajoute --ecrire) :");
console.log(`  ${bilan.crees} ranges créées`);
console.log(`  ${bilan.misesAJour} ranges de base mises à jour`);
console.log(`  ${bilan.gardees.length} ranges à toi laissées intactes`);
for (const cle of bilan.gardees) console.log(`    - ${cle}`);

await prisma.$disconnect();
