// Formatage français : « 8 420 € », « 14,2 % », signe + / −

const NBSP = "\u202f"; // espace fine insécable

function groupInteger(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatEuro(amount, { sign = false, decimals = 0 } = {}) {
  const n = Number(amount ?? 0);
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const body = dec ? `${groupInteger(int)},${dec}` : groupInteger(int);
  const prefix = n < 0 ? "−" : sign ? "+" : "";
  return `${prefix}${body}${NBSP}€`;
}

export function formatPercent(value, { decimals = 1, sign = false } = {}) {
  const n = Number(value ?? 0);
  const body = Math.abs(n).toFixed(decimals).replace(".", ",");
  const prefix = n < 0 ? "−" : sign ? "+" : "";
  return `${prefix}${body}${NBSP}%`;
}

export function formatNumber(value) {
  return groupInteger(Math.round(Number(value ?? 0)));
}

/** « il y a 2 j », « aujourd'hui », « il y a 9 j » */
export function formatRelativeDays(date) {
  if (!date) return "jamais importé";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}${NBSP}j`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

/** Classe de couleur selon le signe d'un montant. */
export function toneClass(value) {
  const n = Number(value ?? 0);
  if (n > 0) return "text-positive";
  if (n < 0) return "text-negative";
  return "text-ink-muted";
}
