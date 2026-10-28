/**
 * Sites où l'utilisateur joue réellement. C'est cette liste qui pilote
 * l'interface : les cartes « Par site », les boutons de mouvement, le seed.
 * Les parsers PokerStars et PMU restent dans lib/parsers/ — il suffit de
 * remettre la ligne ici pour réactiver un site.
 */
export const SITES = [
  // Couleurs relevées sur les logos des clients installés.
  { slug: "winamax", name: "Winamax", couleur: "#000000", initiale: "W" },
  { slug: "betclic", name: "Betclic", couleur: "#e81d2b", initiale: "B" },
];

/** Couleur et initiale d'une room, pour la pastille de l'interface. */
export function identiteSite(slug) {
  return (
    SITES.find((s) => s.slug === slug) ?? {
      slug,
      name: slug,
      couleur: "#38bdf8",
      initiale: (slug?.[0] ?? "?").toUpperCase(),
    }
  );
}

/**
 * Formats comptés dans les résultats. Le joueur ne suit que ses MTT : les
 * Spins restent importés et comptés dans le solde — l'argent sort et rentre
 * vraiment — mais ils n'entrent ni dans le profit, ni dans le ROI, ni dans
 * l'ITM, où leur variance écraserait tout.
 */
export const FORMATS_COMPTES = ["CLASSIC", "KO", "MYSTERY", "SPACE_KO"];

/** Formats proposés à la saisie. Le Spin n'en fait plus partie. */
export const FORMATS = [
  { key: "CLASSIC", label: "MTT classique", court: "Classique" },
  { key: "KO", label: "KO", court: "KO" },
  { key: "MYSTERY", label: "Mystery", court: "Mystery" },
  { key: "SPACE_KO", label: "Space KO", court: "Space KO" },
];

/**
 * Paliers de buy-in, **par room**. On ne raisonne pas en ABI — un nombre de
 * caves à tenir par format, recalculé à chaque euro gagné, se gère mal en
 * jouant. On raisonne en buy-in maximum : à chaque palier un plafond, et
 * tout ce qui est moins cher reste autorisé.
 *
 * Le barème : 200 caves pour monter, 150 pour redescendre. Les deux seuils
 * sont volontairement différents — sans cet écart on changerait de palier à
 * chaque session autour d'un seuil unique.
 *
 * Les 5 € sont le plancher : pas de seuil de descente, et pas de palier en
 * dessous même si la bankroll fond. C'est un choix assumé.
 *
 * L'assiette est le solde de la room, pas la bankroll totale : 2 000 € sur
 * Winamax et 3 000 € sur Betclic, ce sont les 10 € sur Winamax et les 20 €
 * sur Betclic — pas les 20 € partout. D'où les transferts entre rooms, qui
 * sont la manœuvre pour monter de palier quelque part.
 */
export const PALIERS_BUYIN = [
  { buyInMax: 5, bankrollRequired: 0, stopLoss: null },
  { buyInMax: 10, bankrollRequired: 2000, stopLoss: 1500 },
  { buyInMax: 20, bankrollRequired: 4000, stopLoss: 3000 },
  { buyInMax: 50, bankrollRequired: 10000, stopLoss: 7500 },
];

export const FORMAT_LABELS = {
  CLASSIC: "classique",
  KO: "KO",
  MYSTERY: "Mystery",
  SPACE_KO: "Space KO",
  SPIN: "Spin",
};

export const SPEED_LABELS = {
  NORMAL: "normal",
  SEMITURBO: "semi-turbo",
  TURBO: "turbo",
  HYPER: "hyper",
};

/**
 * Minutes de lancement proposées : un tournoi part au quart d'heure, jamais
 * à 19 h 07.
 */
export const QUARTS_HEURE = [0, 15, 30, 45];

/** « 6 min », ou la vitesse héritée si la durée n'est pas connue. */
export function libelleVitesse({ levelMinutes, speed }) {
  if (levelMinutes) return `${levelMinutes} min`;
  if (speed && speed !== "NORMAL") return SPEED_LABELS[speed];
  return null;
}

export const TRANSACTION_LABELS = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  RAKEBACK: "Rakeback",
  BONUS: "Bonus",
  TICKET: "Ticket",
  ADJUSTMENT: "Correction",
  TRANSFER_OUT: "Transfert sortant",
  TRANSFER_IN: "Transfert entrant",
};

/** Mouvements comptés hors profit de jeu. */
export const OFF_GAME_TYPES = ["RAKEBACK", "BONUS", "TICKET"];

/**
 * Mouvements qui retirent de l'argent de la room. Saisis en positif, ils
 * comptent en négatif dans le solde.
 */
export const SORTIES = ["WITHDRAWAL", "TRANSFER_OUT"];

/**
 * Un transfert entre rooms n'est pas un retrait suivi d'un dépôt : la
 * bankroll totale ne bouge pas, seul le solde des deux rooms change. Il
 * s'écrit donc en deux mouvements jumeaux, reliés par un même `transferId`,
 * pour pouvoir être affiché et annulé comme un seul geste.
 */
export const TRANSFER_TYPES = ["TRANSFER_OUT", "TRANSFER_IN"];

export const PERIODS = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: null },
];

/**
 * Positions d'une table à 6 joueurs, dans l'ordre de parole préflop.
 *
 * Six et non huit : c'est le format le plus joué en ligne. « LJ » (lojack)
 * est le premier à parler — l'équivalent de l'UTG d'une table pleine.
 */
export const POSITIONS = ["LJ", "HJ", "CO", "BTN", "SB", "BB"];

export const STACK_DEPTHS = [
  { key: "60BB_PLUS", label: "60bb+" },
  { key: "40BB", label: "40bb" },
  { key: "25BB", label: "25bb" },
  { key: "15_20BB", label: "15–20bb" },
  { key: "SUB_12BB", label: "<12bb" },
];

export const RANGE_ACTIONS = [
  { key: "RFI", label: "RFI" },
  { key: "DEF_VS_OPEN", label: "Défense vs open" },
  { key: "3BET", label: "3bet" },
  { key: "VS_3BET", label: "Face au 3bet" },
  { key: "SHOVE", label: "Shove" },
  { key: "CALL_SHOVE", label: "Call shove" },
];

/**
 * Pinceaux de l'éditeur de ranges. Les couleurs sont celles de la charte,
 * pleines : c'est l'étiquette sombre posée dessus qui les rend lisibles, pas
 * un adoucissement de la teinte. Le fold n'est pas une action — il prend un
 * gris bleuté qui recule derrière les trois autres.
 */
export const RANGE_BRUSHES = [
  { key: "raise", label: "Raise", color: "#34d399" },
  { key: "call", label: "Call", color: "#fbbf24" },
  { key: "shove", label: "Shove", color: "#fb7185" },
  { key: "fold", label: "Fold", color: "#8e9cb8" },
];

/** Types de session d'étude, dans l'ordre où on les saisit le plus souvent. */
export const STUDY_SESSION_TYPES = [
  { key: "THEORIE", label: "Théorie" },
  { key: "DRILL", label: "Drill" },
  { key: "REVUE_MAINS", label: "Revue de mains" },
  { key: "REVUE_BDD", label: "Revue de base" },
];

/** Statuts d'une main mise de côté. */
export const TAGGED_HAND_STATUSES = [
  { key: "A_REVOIR", label: "À revoir" },
  { key: "REVUE", label: "Revue" },
];

/* ------------------------------------------------------------------ */
/* Compte bancaire                                                     */
/* ------------------------------------------------------------------ */

/**
 * Nomenclature des mouvements du compte. Comme les paliers de buy-in, elle
 * vit ici et pas en base : c'est une façon de ranger ses comptes, la même
 * d'un bout à l'autre de l'app, et rien ne la modifie à l'exécution.
 *
 * `poker` et `depot_poker` sont les deux catégories du miroir : aucune
 * saisie manuelle ne doit les porter, sinon un retrait compterait deux fois.
 */
export const CATEGORIES_COMPTE = [
  // Entrées
  { key: "freelance", label: "Freelance", flow: "INCOME" },
  { key: "poker", label: "Retrait poker", flow: "INCOME", miroir: true },
  { key: "salaire", label: "Salaire", flow: "INCOME" },
  { key: "remboursement", label: "Remboursement", flow: "INCOME" },
  { key: "autre_entree", label: "Autre entrée", flow: "INCOME" },

  // Dépenses
  { key: "loyer", label: "Loyer et charges", flow: "EXPENSE" },
  { key: "courses", label: "Courses", flow: "EXPENSE" },
  { key: "abonnements", label: "Abonnements", flow: "EXPENSE" },
  { key: "infra", label: "Infra web", flow: "EXPENSE" },
  { key: "transport", label: "Transport", flow: "EXPENSE" },
  { key: "sante", label: "Santé", flow: "EXPENSE" },
  { key: "impots", label: "Impôts et cotisations", flow: "EXPENSE" },
  { key: "loisirs", label: "Loisirs", flow: "EXPENSE" },
  { key: "depot_poker", label: "Dépôt poker", flow: "EXPENSE", miroir: true },
  { key: "autre_depense", label: "Autre dépense", flow: "EXPENSE" },
];

/** Les catégories qu'on peut choisir à la saisie — le miroir s'exclut. */
export function categoriesSaisissables(flow) {
  return CATEGORIES_COMPTE.filter((c) => c.flow === flow && !c.miroir);
}

export function libelleCategorie(key) {
  return CATEGORIES_COMPTE.find((c) => c.key === key)?.label ?? key;
}

/**
 * Provenance d'un mouvement du compte. Le compte agrège trois sources, et
 * deux d'entre elles ne se modifient pas depuis cet écran.
 */
export const ORIGINES_COMPTE = {
  manuel: { label: "Saisi", modifiable: true },
  poker: { label: "Poker", modifiable: false, lien: "/bankroll" },
  projet: { label: "Projet", modifiable: false, lien: "/projets" },
};

/* ------------------------------------------------------------------ */
/* Projets web                                                         */
/* ------------------------------------------------------------------ */

/**
 * Les états d'un projet, dans l'ordre du cycle de vie. `vivier` sépare ce
 * qui n'est pas encore du travail — les pistes et les devis — de ce qui l'est.
 */
export const PROJECT_STAGES = [
  { key: "IDEE", label: "Piste", court: "Piste", vivier: true },
  { key: "DEVIS_ENVOYE", label: "Devis envoyé", court: "Devis", vivier: true },
  { key: "DEVIS_REFUSE", label: "Devis refusé", court: "Refusé", vivier: true },
  { key: "EN_COURS", label: "En cours", court: "En cours", vivier: false },
  { key: "TERMINE", label: "Terminé", court: "Terminé", vivier: false },
];

export const PROJECT_STAGE_LABELS = Object.fromEntries(
  PROJECT_STAGES.map((s) => [s.key, s.label])
);

export const PROJECT_BILLINGS = [
  { key: "A_FACTURER", label: "À facturer", tone: "warning" },
  { key: "FACTURE", label: "Facturé", tone: "accent" },
  { key: "PAYE", label: "Payé", tone: "positive" },
];

export const PROJECT_BILLING_LABELS = Object.fromEntries(
  PROJECT_BILLINGS.map((b) => [b.key, b.label])
);

/** Le ton de pastille d'un état de facturation. */
export function tonFacturation(key) {
  return PROJECT_BILLINGS.find((b) => b.key === key)?.tone ?? "neutral";
}

/**
 * Un devis sans réponse au-delà de ce délai mérite une relance. Trois
 * semaines : en dessous, on relance quelqu'un qui n'a pas eu le temps de
 * lire.
 */
export const DEVIS_RELANCE_JOURS = 21;

/* ------------------------------------------------------------------ */
/* Services et comptes                                                 */
/* ------------------------------------------------------------------ */

/**
 * Les services d'hébergement et d'outillage recensés par l'onglet
 * « Comptes et accès ». Même forme que `SITES` : une couleur de marque et
 * une initiale, pour une pastille lisible sans logo.
 *
 * `ressource` nomme ce qu'on note chez ce service — c'est le libellé du
 * champ dans le formulaire, et ce qui fait la différence entre « projet
 * Vercel » et « nom de la base ».
 */
export const SERVICES_WEB = [
  { slug: "vercel", name: "Vercel", couleur: "#000000", ressource: "Projet" },
  { slug: "railway", name: "Railway", couleur: "#0b0d0e", ressource: "Base de données" },
  { slug: "stripe", name: "Stripe", couleur: "#635bff", ressource: "Compte" },
  { slug: "supabase", name: "Supabase", couleur: "#3ecf8e", ressource: "Projet" },
  { slug: "neon", name: "Neon", couleur: "#00e599", ressource: "Base de données" },
  { slug: "github", name: "GitHub", couleur: "#24292f", ressource: "Dépôt" },
  { slug: "cloudflare", name: "Cloudflare", couleur: "#f38020", ressource: "Zone" },
  { slug: "ovh", name: "OVH", couleur: "#123f6d", ressource: "Domaine" },
  { slug: "namecheap", name: "Namecheap", couleur: "#de3723", ressource: "Domaine" },
  { slug: "google", name: "Google", couleur: "#4285f4", ressource: "Compte" },
  { slug: "resend", name: "Resend", couleur: "#1a1a1a", ressource: "Domaine d'envoi" },
  { slug: "sentry", name: "Sentry", couleur: "#362d59", ressource: "Projet" },
  { slug: "upstash", name: "Upstash", couleur: "#00e9a3", ressource: "Base" },
  { slug: "openai", name: "OpenAI", couleur: "#10a37f", ressource: "Organisation" },
  { slug: "anthropic", name: "Anthropic", couleur: "#d97757", ressource: "Organisation" },
  { slug: "autre", name: "Autre", couleur: "#38bdf8", ressource: "Ressource" },
];

/** Couleur, initiale et libellé de champ d'un service. */
export function identiteService(slug) {
  const s = SERVICES_WEB.find((x) => x.slug === slug);
  if (s) return { ...s, initiale: s.name[0].toUpperCase() };
  return {
    slug,
    name: slug,
    couleur: "#38bdf8",
    ressource: "Ressource",
    initiale: (slug?.[0] ?? "?").toUpperCase(),
  };
}
