// Placeholder illustration for products WITHOUT a real photo.
// One consistent flat style per category; unknown categories fall back to "other".
// Real product photos always take priority — these only show when imageUrl is empty.
const KNOWN = new Set([
  "whiskey", "scotch", "vodka", "tequila", "gin", "rum", "wine", "champagne",
  "beer", "cognac", "rtd", "mixer", "liqueur", "rare", "sake_soju", "other",
]);

export function categoryPlaceholder(category?: string | null): string {
  const c = (category ?? "").toLowerCase().trim();
  return `/placeholders/${KNOWN.has(c) ? c : "other"}.svg`;
}
