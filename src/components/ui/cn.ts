/** Joins class names, skipping empty ones. Screens pass layout classes (width, flex, margin) only — never colours. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
