/**
 * Inspecte un dossier d'historiques de poker et dit ce qu'on sait en lire.
 *
 *   npm run historiques            → cherche tout seul aux emplacements connus
 *   npm run historiques -- <chemin>
 *
 * Le script ne transmet rien et n'écrit rien : il lit, compte, et affiche un
 * rapport. Il sert à répondre à deux questions avant de coder un parser :
 * « où sont les fichiers » et « est-ce qu'on les comprend déjà ».
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { homedir } from "node:os";

import { detectParser } from "../lib/parsers/index.js";

const EXTENSIONS = new Set([".txt", ".xml", ".log", ".csv", ".html", ".htm"]);
const MAX_FILES = 20000;

/** Emplacements habituels des historiques, par client. */
function emplacementsConnus() {
  const home = homedir();
  const docs = [join(home, "Documents"), join(home, "OneDrive", "Documents")];
  const pistes = [];

  for (const d of docs) {
    pistes.push(
      { client: "Winamax", chemin: join(d, "Winamax Poker", "accounts") },
      { client: "Winamax", chemin: join(d, "Winamax Poker") },
      { client: "Betclic", chemin: join(d, "Betclic Poker") },
      { client: "Betclic", chemin: join(d, "BetclicPoker") },
      { client: "PokerStars", chemin: join(d, "PokerStars", "HandHistory") },
      { client: "PokerStars", chemin: join(d, "PokerStars.fr", "HandHistory") },
      { client: "PMU", chemin: join(d, "PMU Poker") }
    );
  }
  pistes.push(
    { client: "Betclic", chemin: join(home, "AppData", "Local", "Betclic Poker") },
    { client: "Betclic", chemin: join(home, "AppData", "Roaming", "Betclic Poker") },
    { client: "iPoker", chemin: join(home, "AppData", "Local", "iPoker") }
  );

  return pistes.filter((p) => existsSync(p.chemin));
}

function listerFichiers(racine, acc = []) {
  if (acc.length > MAX_FILES) return acc;
  let entrees;
  try {
    entrees = readdirSync(racine, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entrees) {
    const chemin = join(racine, e.name);
    if (e.isDirectory()) listerFichiers(chemin, acc);
    else if (EXTENSIONS.has(extname(e.name).toLowerCase())) acc.push(chemin);
  }
  return acc;
}

function lire(chemin) {
  try {
    const { size } = statSync(chemin);
    if (size > 5_000_000) return null;
    return readFileSync(chemin, "utf8");
  } catch {
    return null;
  }
}

/**
 * Un résumé de tournoi se reconnaît à ce qu'il contient un classement et un
 * identifiant de tournoi. Une main jouée, non. On s'en sert pour distinguer
 * les deux dans un dossier qui mélange tout.
 */
function ressembleAUnResume(contenu) {
  const indices = [
    /tournament summary/i,
    /r[ée]sum[ée] de tournoi/i,
    /you finished in/i,
    /vous avez termin[ée]/i,
    /place\s*:\s*\d+/i,
    /buy-?in/i,
  ];
  return indices.filter((r) => r.test(contenu)).length >= 2;
}

function analyser(racine) {
  const fichiers = listerFichiers(racine);
  const parSite = new Map();
  const inconnus = [];
  let resumesProbables = 0;

  for (const f of fichiers) {
    const contenu = lire(f);
    if (!contenu) continue;

    const resume = ressembleAUnResume(contenu);
    if (resume) resumesProbables += 1;

    const parser = detectParser(contenu);
    if (parser) {
      const b = parSite.get(parser.SITE) ?? {
        site: parser.SITE,
        fichiers: 0,
        tournois: 0,
        illisibles: 0,
        aSpecifier: Boolean(parser.needsSpec),
      };
      b.fichiers += 1;
      if (!parser.needsSpec) {
        try {
          const t = parser.parse(contenu);
          if (t.length === 0) b.illisibles += 1;
          else b.tournois += t.length;
        } catch {
          b.illisibles += 1;
        }
      }
      parSite.set(parser.SITE, b);
    } else if (resume) {
      inconnus.push(f);
    }
  }

  return { racine, total: fichiers.length, resumesProbables, parSite, inconnus };
}

function afficher(r) {
  console.log(`\n  ${r.racine}`);
  console.log(`  ${r.total} fichiers lisibles, dont ${r.resumesProbables} qui ressemblent à des résumés de tournoi`);

  if (r.parSite.size === 0 && r.inconnus.length === 0) {
    console.log("  → rien de reconnu ici.");
    return;
  }

  for (const b of r.parSite.values()) {
    if (b.aSpecifier) {
      console.log(`  → ${b.site} : ${b.fichiers} fichiers détectés, PARSER À ÉCRIRE`);
    } else {
      const souci = b.illisibles > 0 ? `, ${b.illisibles} illisibles` : "";
      console.log(`  → ${b.site} : ${b.fichiers} fichiers, ${b.tournois} tournois lus${souci}`);
    }
  }

  if (r.inconnus.length > 0) {
    console.log(`  → ${r.inconnus.length} résumés d'un site non reconnu. Exemples :`);
    for (const f of r.inconnus.slice(0, 5)) console.log(`       ${basename(f)}`);
  }
}

const argument = process.argv[2];
const cibles = argument
  ? [{ client: "fourni", chemin: argument }]
  : emplacementsConnus();

if (cibles.length === 0) {
  console.log(`
  Aucun dossier d'historiques trouvé aux emplacements habituels.

  Relance en indiquant le dossier toi-même :
      npm run historiques -- "C:/chemin/vers/le/dossier"

  Où chercher :
    Winamax  Documents\\Winamax Poker\\accounts\\<pseudo>\\history
             (activer d'abord : Options > Historique des mains)
    Betclic  regarde dans Documents, puis dans
             %LOCALAPPDATA% et %APPDATA%, un dossier au nom du client
`);
  process.exit(0);
}

console.log("\n  Inspection des historiques");
console.log("  " + "─".repeat(60));

const resultats = cibles.map((c) => analyser(c.chemin));
for (const r of resultats) afficher(r);

const aSpecifier = new Set();
let inconnusTotal = 0;
for (const r of resultats) {
  for (const b of r.parSite.values()) if (b.aSpecifier) aSpecifier.add(b.site);
  inconnusTotal += r.inconnus.length;
}

console.log("\n  " + "─".repeat(60));
if (aSpecifier.size > 0 || inconnusTotal > 0) {
  console.log(`
  Il reste des formats à coder.
  Envoie UN fichier d'exemple par site non reconnu : c'est suffisant
  pour écrire le parser, et ça évite de transmettre tout l'historique.
`);
} else {
  console.log("\n  Tous les fichiers trouvés sont déjà lisibles.\n");
}
