/**
 * Formats a number as Kenyan shillings for consistent prices and totals throughout the interface.
 */
export function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  })
    .format(value)
    .replace("KES", "KSh");
}

/**
 * Shortens large numbers for compact dashboard displays while keeping smaller values easy to read.
 */
export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Formats a decimal number as a percentage for reports and performance indicators.
 */
export function percent(value: number) {
  return `${Math.round(value)}%`;
}
