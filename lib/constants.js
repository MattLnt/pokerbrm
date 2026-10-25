export const SITES = [
  { slug: "winamax", name: "Winamax" },
  { slug: "pokerstars", name: "PokerStars" },
  { slug: "pmu", name: "PMU" },
];

export const FORMATS = [
  { key: "CLASSIC", label: "MTT classique", defaultBuyIns: 200 },
  { key: "KO", label: "KO", defaultBuyIns: 150 },
  { key: "SPIN", label: "Spin", defaultBuyIns: 100 },
];

export const FORMAT_LABELS = {
  CLASSIC: "classique",
  KO: "KO",
  SPIN: "Spin",
};

export const SPEED_LABELS = {
  NORMAL: "normal",
  TURBO: "turbo",
  HYPER: "hyper",
};

export const TRANSACTION_LABELS = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  RAKEBACK: "Rakeback",
  BONUS: "Bonus",
  TICKET: "Ticket",
  ADJUSTMENT: "Correction",
};

/** Mouvements comptés hors profit de jeu. */
export const OFF_GAME_TYPES = ["RAKEBACK", "BONUS", "TICKET"];

export const PERIODS = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: null },
];

export const POSITIONS = ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"];

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

/** Pinceaux de l'éditeur de ranges. */
export const RANGE_BRUSHES = [
  { key: "raise", label: "Raise", color: "#d03e7c" },
  { key: "call", label: "Call", color: "#4cc38a" },
  { key: "shove", label: "Shove", color: "#f2994a" },
  { key: "fold", label: "Fold", color: "#272437" },
];
