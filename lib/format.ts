export function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  })
    .format(value)
    .replace("KES", "KSh");
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}
