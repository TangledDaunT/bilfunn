export const ore = (n: number) => Math.round(n);

export function formatOre(amountOre: number, locale = "nb-NO") {
  const value = amountOre / 100;
  return (
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value) + " kr"
  );
}

// Norwegian VAT is included in the displayed price; this extracts the VAT part.
export function vatOf(amountOre: number, vatBps: number) {
  const rate = vatBps / 10000;
  return Math.round(amountOre - amountOre / (1 + rate));
}

export function formatDate(
  d: Date | string | number,
  locale = "nb-NO",
  withTime = false,
) {
  const date = new Date(d);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Oslo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
