/**
 * Joins optional CSS class names into one clean string for reusable interface components.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
