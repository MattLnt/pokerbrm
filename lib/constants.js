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
 * Durées de niveau proposées, en minutes. On affiche la durée réelle plutôt
 * qu'une étiquette « turbo » : 6 min dit ce que turbo ne dit pas.
 */
export const DUREES_NIVEAU = [3, 5, 6, 8, 10, 12, 15, 20];

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
