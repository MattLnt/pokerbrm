/**
 * Ranges de départ : 6-max, big blind ante, chipEV, open à 2–2,3bb.
 *
 * Ce ne sont PAS des sorties de solver. Ce sont des références écrites à la
 * main pour un field à 5–10 €, cohérentes avec le playbook : de quoi avoir
 * une base partout, à vérifier spot par spot dans GTO Wizard et à ajuster.
 * En base, elles portent le nom BASE_NOM pour qu'on sache lesquelles n'ont
 * pas encore été revues.
 *
 * Chaque spot liste ses mains par pinceau, en notation texte (lue par
 * `lireRangeTexte`). Les pinceaux sont posés dans l'ordre call → raise →
 * shove : une main citée deux fois prend le dernier, ce qui permet d'écrire
 * une défense large en call puis d'en extraire le 3bet.
 *
 * Sens des pinceaux selon l'action :
 * - RFI : raise = open, shove = open-shove (15–20bb).
 * - 3BET et DEF_VS_OPEN : raise = 3bet, call = flat, shove = 3bet all-in.
 * - VS_3BET : raise = 4bet, shove = 4bet all-in, call = payer.
 * - SHOVE et CALL_SHOVE : shove = tapis, call = payer le tapis.
 */

export const BASE_NOM = "Base Claude — à vérifier";

const s = (position, action, stackDepth, mains, vsPosition = "") => ({
  position,
  action,
  stackDepth,
  vsPosition,
  mains,
});

/* ------------------------------------------------------------------ */
/* Open (RFI)                                                          */
/* ------------------------------------------------------------------ */

const RFI = [
  // 60bb+
  s("LJ", "RFI", "60BB_PLUS", {
    raise: "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 76s, 65s, ATo+, KJo+, QJo",
  }),
  s("HJ", "RFI", "60BB_PLUS", {
    raise:
      "22+, A2s+, K7s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, A9o+, KTo+, QJo",
  }),
  s("CO", "RFI", "60BB_PLUS", {
    raise:
      "22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 97s+, 86s+, 75s+, 65s, 54s, A8o+, A5o, KTo+, QTo+, JTo",
  }),
  s("BTN", "RFI", "60BB_PLUS", {
    raise:
      "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o",
  }),
  s("SB", "RFI", "60BB_PLUS", {
    raise:
      "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o",
  }),

  // 40bb
  s("LJ", "RFI", "40BB", {
    raise: "22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, ATo+, KJo+, QJo",
  }),
  s("HJ", "RFI", "40BB", {
    raise: "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, A9o+, KJo+, QJo",
  }),
  s("CO", "RFI", "40BB", {
    raise:
      "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, A8o+, A5o, KTo+, QTo+, JTo",
  }),
  s("BTN", "RFI", "40BB", {
    raise:
      "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o",
  }),
  s("SB", "RFI", "40BB", {
    raise:
      "22+, A2s+, K2s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o",
  }),

  // 25bb
  s("LJ", "RFI", "25BB", {
    raise: "22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+, QJo",
  }),
  s("HJ", "RFI", "25BB", {
    raise: "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, A9o+, KTo+, QJo",
  }),
  s("CO", "RFI", "25BB", {
    raise: "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A7o+, A5o, KTo+, QTo+, JTo",
  }),
  s("BTN", "RFI", "25BB", {
    raise:
      "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K8o+, Q9o+, J9o+, T9o",
  }),
  s("SB", "RFI", "25BB", {
    raise:
      "22+, A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 86s+, 76s, 65s, A2o+, K9o+, QTo+, JTo",
  }),

  // 15–20bb : open-raise pour les mains qui supportent un 3bet,
  // open-shove pour celles qui jouent mal après un raise.
  s("LJ", "RFI", "15_20BB", {
    raise: "66+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KQo",
    shove: "22-55",
  }),
  s("HJ", "RFI", "15_20BB", {
    raise: "55+, A5s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+",
    shove: "22-44, A2s-A4s, A9o",
  }),
  s("CO", "RFI", "15_20BB", {
    raise: "77+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QJo",
    shove: "22-66, A5o-A8o",
  }),
  s("BTN", "RFI", "15_20BB", {
    raise: "88+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A9o+, KTo+, QTo+, JTo",
    shove: "22-77, A2o-A8o, K9o",
  }),
  s("SB", "RFI", "15_20BB", {
    shove: "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 98s, 87s, A2o+, K9o+, QTo+, JTo",
  }),
];

/* ------------------------------------------------------------------ */
/* Open-shove sous 12bb                                                 */
/* ------------------------------------------------------------------ */

const SHOVE = [
  s("LJ", "SHOVE", "SUB_12BB", {
    shove: "22+, A2s+, K8s+, Q9s+, J9s+, T9s, A7o+, A5o, KJo+, QJo",
  }),
  s("HJ", "SHOVE", "SUB_12BB", {
    shove: "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 98s, A4o+, KTo+, QJo",
  }),
  s("CO", "SHOVE", "SUB_12BB", {
    shove: "22+, A2s+, K4s+, Q7s+, J8s+, T8s+, 98s, 87s, A2o+, K9o+, QTo+, JTo",
  }),
  s("BTN", "SHOVE", "SUB_12BB", {
    shove:
      "22+, A2s+, K2s+, Q4s+, J6s+, T7s+, 97s+, 86s+, 76s, 65s, A2o+, K7o+, Q9o+, J9o+, T9o",
  }),
  s("SB", "SHOVE", "SUB_12BB", {
    shove:
      "22+, A2s+, K2s+, Q2s+, J3s+, T5s+, 95s+, 85s+, 74s+, 64s+, 54s, A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 87o",
  }),
];

/* ------------------------------------------------------------------ */
/* 3bet en position (HJ, CO, BTN) contre un open                        */
/* ------------------------------------------------------------------ */

const TROIS_BET_DEEP = {
  "HJ|LJ": {
    call: "JJ-77, AQs-ATs, KQs, KJs, QJs, JTs, T9s, AQo",
    raise: "QQ+, AKs, AKo, A5s, A4s",
  },
  "CO|LJ": {
    call: "JJ-66, AQs-ATs, KQs, KJs, QJs, JTs, T9s, AQo",
    raise: "QQ+, AKs, AKo, A5s, A4s",
  },
  "CO|HJ": {
    call: "JJ-66, AJs, ATs, KQs, KJs, QJs, JTs, T9s, AQo",
    raise: "QQ+, AKs, AKo, AQs, A5s, A4s",
  },
  "BTN|LJ": {
    call: "JJ-22, AQs-A9s, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, AJo, KQo",
    raise: "QQ+, AKs, AKo, A5s, A4s",
  },
  "BTN|HJ": {
    call: "TT-22, AJs-A8s, KTs+, Q9s+, J9s+, T9s, 98s, 87s, 76s, AQo, AJo, KQo",
    raise: "JJ+, AKs, AKo, AQs, A5s-A3s, K9s",
  },
  "BTN|CO": {
    call: "99-22, ATs-A6s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, AJo, ATo, KQo",
    raise: "TT+, AQs+, AJs, AKo, AQo, KQs, A5s-A2s, K9s-K8s, Q9s, J9s, T8s",
  },
};

const TROIS_BET_40 = {
  "HJ|LJ": {
    call: "TT-88, AJs-ATs, KQs, KJs, QJs, JTs, AQo",
    raise: "JJ+, AKs, AQs, AKo, A5s",
  },
  "CO|LJ": {
    call: "TT-77, AJs-ATs, KQs, KJs, QJs, JTs, AQo",
    raise: "JJ+, AKs, AQs, AKo, A5s",
  },
  "CO|HJ": {
    call: "TT-77, AJs, ATs, KQs, KJs, QJs, JTs, T9s, AQo",
    raise: "JJ+, AKs, AQs, AKo, A5s, A4s",
  },
  "BTN|LJ": {
    call: "JJ-44, AQs-ATs, KTs+, QJs, JTs, T9s, 98s, AQo, AJo, KQo",
    raise: "QQ+, AKs, AKo, A5s, A4s",
  },
  "BTN|HJ": {
    call: "TT-33, AJs-A9s, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, AJo, KQo",
    raise: "JJ+, AKs, AQs, AKo, A5s-A3s, K9s",
  },
  "BTN|CO": {
    call: "99-22, ATs-A7s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AJo, KQo",
    raise: "TT+, AJs+, AKo, AQo, KQs, A5s-A2s, K9s, Q9s, J9s",
  },
};

// 25bb : 3bet petit avec le haut (on paie le shove), 3bet all-in en dessous.
const TROIS_BET_25 = {
  "HJ|LJ": { call: "77, KQs", raise: "QQ+, AKs, AKo", shove: "JJ-88, AQs, AJs, AQo" },
  "CO|LJ": { call: "77-66", raise: "QQ+, AKs, AKo", shove: "JJ-88, AQs, AJs, AQo, KQs" },
  "CO|HJ": {
    call: "66-55, A5s, KJs, QJs",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-77, AQs, AJs, ATs, AQo, KQs",
  },
  "BTN|LJ": {
    call: "66-44, ATs, A5s, KJs, QJs, JTs",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-77, AQs, AJs, AQo, KQs",
  },
  "BTN|HJ": {
    call: "55-22, A9s-A8s, A5s, KJs, KTs, QJs, JTs, T9s",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-66, AQs, AJs, ATs, AQo, KQs",
  },
  "BTN|CO": {
    call: "44-22, A7s-A6s, KTs, QJs, QTs, JTs, T9s, 98s",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-55, AQs, AJs, ATs-A8s, A5s-A4s, AQo, AJo, KQs, KJs",
  },
};

// 15–20bb : resteal, tapis ou fold.
const TROIS_BET_COURT = {
  "HJ|LJ": { shove: "88+, AJs+, AKo, AQo, KQs" },
  "CO|LJ": { shove: "77+, ATs+, AJo+, KQs" },
  "CO|HJ": { shove: "66+, ATs+, A5s, AJo+, KQs, KJs" },
  "BTN|LJ": { shove: "66+, ATs+, AJo+, KQs" },
  "BTN|HJ": { shove: "55+, A8s+, A5s-A4s, ATo+, KJs+, QJs" },
  "BTN|CO": { shove: "22+, A2s+, A8o+, K9s+, KJo+, QTs+, JTs" },
};

function deplier(table, action, stackDepth) {
  return Object.entries(table).map(([cle, mains]) => {
    const [position, vs] = cle.split("|");
    return s(position, action, stackDepth, mains, vs);
  });
}

const TROIS_BET = [
  ...deplier(TROIS_BET_DEEP, "3BET", "60BB_PLUS"),
  ...deplier(TROIS_BET_40, "3BET", "40BB"),
  ...deplier(TROIS_BET_25, "3BET", "25BB"),
  ...deplier(TROIS_BET_COURT, "3BET", "15_20BB"),
];

/* ------------------------------------------------------------------ */
/* Défense SB et BB contre un open                                      */
/* ------------------------------------------------------------------ */

// SB : 3bet ou fold (on ne flat que contre le BTN, l'ouvreur le plus large).
const SB_DEEP = {
  LJ: { raise: "TT+, AJs+, KQs, AKo, AQo, A5s-A4s" },
  HJ: { raise: "99+, ATs+, A5s-A3s, KJs+, QJs, AJo+, KQo" },
  CO: { raise: "88+, A8s+, A5s-A2s, KTs+, QTs+, JTs, T9s, ATo+, KJo+" },
  BTN: {
    call: "55-22, 87s, 76s",
    raise: "66+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, A8o+, KTo+, QJo",
  },
};

const BB_LARGE_VS_BTN =
  "99-22, ATs-A6s, KJs-KTs, K7s-K2s, QJs-Q9s, Q7s-Q2s, JTs-J9s, J7s-J3s, T9s-T4s, 98s-94s, 87s-84s, 75s-73s, 64s-63s, 54s-53s, 43s, AJo-A2o, K5o+, Q7o+, J7o+, T7o+, 97o+, 86o+, 76o, 65o";

const BB_DEEP = {
  LJ: {
    call:
      "JJ-22, AQs-A6s, A3s-A2s, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, AQo-A9o, KTo+, QTo+, JTo",
    raise: "QQ+, AKs, AKo, A5s-A4s",
  },
  HJ: {
    call:
      "JJ-22, AJs-A6s, A3s-A2s, K5s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, AQo-A8o, KTo+, QTo+, JTo, T9o",
    raise: "QQ+, AKs, AQs, AKo, A5s-A4s",
  },
  CO: {
    call:
      "TT-22, ATs-A6s, A2s, K2s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 74s+, 63s+, 53s+, 43s, AJo-A5o, K9o+, Q9o+, J9o+, T8o+, 98o",
    raise: "JJ+, AQs+, AJs, AKo, AQo, KQs, A5s-A3s",
  },
  BTN: {
    call: BB_LARGE_VS_BTN,
    raise: "TT+, AJs+, AKo, AQo, KQs, A5s-A2s, K9s-K8s, Q8s, J8s, 76s, 65s",
  },
  SB: {
    call: `${BB_LARGE_VS_BTN}, Q5o+, J6o+, T6o+, 96o+, 85o+, 75o+, 64o+, 54o`,
    raise: "TT+, AJs+, AKo, AQo, KQs, A5s-A2s, K9s-K8s, Q8s, J8s, 76s, 65s",
  },
};

const SB_25 = {
  LJ: { raise: "QQ+, AKs, AKo", shove: "JJ-77, AJs+, AQo, KQs" },
  HJ: { raise: "QQ+, AKs, AKo", shove: "JJ-66, ATs+, A5s, AJo+, KQs, KJs" },
  CO: { raise: "QQ+, AKs, AKo", shove: "JJ-44, A8s+, A5s-A4s, ATo+, KTs+, QJs, KQo" },
  BTN: {
    raise: "QQ+, AKs, AKo",
    shove: "JJ-22, A2s+, A8o+, A5o, K9s+, KJo+, QTs+, JTs, T9s",
  },
};

const BB_25 = {
  LJ: {
    call: "99-22, AJs-A2s, KTs+, QTs+, J9s+, T9s, 98s, 87s, 76s, AQo-ATo, KJo+, QJo",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-TT, AQs",
  },
  HJ: {
    call: "88-22, ATs-A2s, K8s+, Q9s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, AJo-A9o, KTo+, QTo+, JTo",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-99, AQs, AJs, AQo",
  },
  CO: {
    call:
      "77-22, A9s-A6s, A4s-A2s, K5s+, Q7s+, J7s+, T7s+, 97s+, 86s+, 75s+, 65s, 54s, AJo-A7o, K9o+, Q9o+, J9o+, T9o",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-88, AQs, AJs, ATs, A5s, AQo, KQs",
  },
  BTN: {
    call:
      "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T8o+, 98o",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-66, AQs, AJs, ATs, A5s-A4s, AQo, AJo, KQs, KJs",
  },
  SB: {
    call:
      "22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o",
    raise: "QQ+, AKs, AKo",
    shove: "JJ-55, AQs, AJs, ATs, A9s, A5s, AQo, AJo, KQs, KJs",
  },
};

const SB_COURT = {
  LJ: { shove: "88+, ATs+, AJo+, KQs" },
  HJ: { shove: "77+, A9s+, A5s, AJo+, KQs" },
  CO: { shove: "55+, A7s+, A5s-A4s, ATo+, KJs+, KQo" },
  // Lu dans GTO Wizard (BTN 20bb, SB 15,5bb, BB 39bb) : tapis ou fold.
  BTN: { shove: "22+, A2s+, A3o+, K9s+, KTo+, Q9s+, QJo, J9s+, T8s+, 98s" },
};

const BB_COURT = {
  LJ: {
    call: "88-22, ATs-A2s, KTs+, QJs, JTs, AJo, KQo",
    shove: "99+, AJs+, AKo, AQo",
  },
  HJ: {
    call: "77-22, A9s-A2s, K9s+, QTs+, JTs, T9s, ATo, KJo+",
    shove: "88+, ATs+, AJo+, KQs",
  },
  CO: {
    call: "66-22, A8s-A6s, A4s-A2s, K8s+, Q9s+, J9s+, T8s+, 98s, A9o-A7o, KTo+, QJo",
    shove: "77+, A9s+, A5s, ATo+, KJs+",
  },
  BTN: {
    call:
      "44-22, A6s, A3s-A2s, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A8o-A2o, K9o+, QTo+, JTo",
    shove: "55+, A7s+, A5s-A4s, A9o+, KTs+, KQo, QJs",
  },
  SB: {
    call:
      "33-22, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, A6o-A2o, K8o+, Q9o+, J9o+, T9o",
    shove: "44+, A2s+, A7o+, K9s+, KJo+, QTs+",
  },
};

function defense(position, table, stackDepth) {
  return Object.entries(table).map(([vs, mains]) =>
    s(position, "DEF_VS_OPEN", stackDepth, mains, vs)
  );
}

const DEFENSE = [
  ...defense("SB", SB_DEEP, "60BB_PLUS"),
  ...defense("SB", SB_DEEP, "40BB"),
  ...defense("SB", SB_25, "25BB"),
  ...defense("SB", SB_COURT, "15_20BB"),
  ...defense("BB", BB_DEEP, "60BB_PLUS"),
  ...defense("BB", BB_DEEP, "40BB"),
  ...defense("BB", BB_25, "25BB"),
  ...defense("BB", BB_COURT, "15_20BB"),
];

/* ------------------------------------------------------------------ */
/* Face au 3bet (on a ouvert)                                           */
/* ------------------------------------------------------------------ */

const FACE_3BET = [
  // 60bb+ : 4bet petit (raise) ou call.
  s("LJ", "VS_3BET", "60BB_PLUS", {
    call: "JJ-88, AQs-ATs, KQs, KJs, AQo",
    raise: "QQ+, AKs, AKo, A5s",
  }),
  s("HJ", "VS_3BET", "60BB_PLUS", {
    call: "JJ-77, AQs-ATs, KQs, KJs, QJs, JTs, AQo",
    raise: "QQ+, AKs, AKo, A5s-A4s",
  }),
  s("CO", "VS_3BET", "60BB_PLUS", {
    call: "JJ-66, AJs-A9s, KQs-KTs, QJs, QTs, JTs, T9s, AQo, AJo",
    raise: "QQ+, AKs, AQs, AKo, A5s-A4s",
  }),
  s("BTN", "VS_3BET", "60BB_PLUS", {
    call: "TT-55, AJs-A8s, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, AJo, KQo",
    raise: "JJ+, AKs, AQs, AKo, A5s-A3s",
  }),
  s("SB", "VS_3BET", "60BB_PLUS", {
    call: "TT-66, AJs-A9s, KTs+, QTs+, JTs, T9s, AQo, AJo, KQo",
    raise: "JJ+, AKs, AQs, AKo, A5s-A2s",
  }),

  // 40bb : la 4bet devient un tapis.
  s("LJ", "VS_3BET", "40BB", { call: "JJ-TT, AQs", shove: "QQ+, AKs, AKo" }),
  s("HJ", "VS_3BET", "40BB", { call: "TT-99, AJs, KQs", shove: "JJ+, AKs, AQs, AKo" }),
  s("CO", "VS_3BET", "40BB", {
    call: "TT-88, AJs, ATs, KQs, AQo",
    shove: "JJ+, AKs, AQs, AKo",
  }),
  s("BTN", "VS_3BET", "40BB", {
    call: "99-77, ATs, KQs, KJs, QJs, JTs",
    shove: "TT+, AKs, AQs, AJs, AKo, AQo",
  }),
  s("SB", "VS_3BET", "40BB", {
    call: "99-77, ATs, KQs",
    shove: "TT+, AKs, AQs, AJs, A5s, AKo, AQo",
  }),

  // 25bb : le 3bet est presque toujours un tapis, on choisit ce qu'on paie.
  s("LJ", "VS_3BET", "25BB", { call: "99+, AJs+, AKo, AQo" }),
  s("HJ", "VS_3BET", "25BB", { call: "88+, AJs+, AKo, AQo, KQs" }),
  s("CO", "VS_3BET", "25BB", { call: "77+, ATs+, AJo+, KQs" }),
  s("BTN", "VS_3BET", "25BB", { call: "66+, A9s+, ATo+, KJs+" }),
  s("SB", "VS_3BET", "25BB", { call: "66+, A8s+, ATo+, KQs" }),
];

/* ------------------------------------------------------------------ */
/* Payer un tapis sous 12bb                                             */
/* ------------------------------------------------------------------ */

const CALL_SHOVE_BB = {
  LJ: "77+, ATs+, AJo+, KQs",
  HJ: "66+, A9s+, ATo+, KQs",
  CO: "55+, A7s+, A9o+, KJs+",
  BTN: "33+, A2s+, A7o+, K9s+, KJo+, QJs",
  SB: "22+, A2s+, A2o+, K5s+, K9o+, Q9s+, QJo, J9s+, T9s",
};

const CALL_SHOVE_SB = {
  LJ: "88+, AJs+, AKo, AQo",
  HJ: "77+, ATs+, AJo+",
  CO: "66+, A9s+, ATo+, KQs",
  BTN: "55+, A7s+, A9o+, KJs+, KQo",
};

const CALL_SHOVE = [
  ...Object.entries(CALL_SHOVE_BB).map(([vs, call]) =>
    s("BB", "CALL_SHOVE", "SUB_12BB", { call }, vs)
  ),
  ...Object.entries(CALL_SHOVE_SB).map(([vs, call]) =>
    s("SB", "CALL_SHOVE", "SUB_12BB", { call }, vs)
  ),
];

export const RANGES_BASE = [
  ...RFI,
  ...SHOVE,
  ...TROIS_BET,
  ...DEFENSE,
  ...FACE_3BET,
  ...CALL_SHOVE,
];
