import type { BasicLandVariant, CardEntry, Rarity, Sheet } from '../types.ts';

/**
 * A basic land, optionally with an art variant — e.g. "Island (A)", "Forest (C)",
 * or a bare "Mountain" (Arabian Nights' single basic land has no variant).
 */
const LAND = /^(Plains|Island|Swamp|Mountain|Forest)(?: \(([A-C])\))?$/;

/** Parse a raw sheet cell into a CardEntry (shared across all sets). */
export function parseCell(raw: string): CardEntry {
  const m = LAND.exec(raw);
  if (!m) return { name: raw, isBasicLand: false };
  const entry: CardEntry = { name: m[1], isBasicLand: true };
  if (m[2]) entry.variant = m[2] as BasicLandVariant;
  return entry;
}

/** Build a Sheet from a row-major grid of raw cell strings. */
export function buildSheet(rarity: Rarity, grid: string[][]): Sheet {
  const cards: CardEntry[] = grid.flat().map(parseCell);
  return { rarity, rows: grid.length, cols: grid[0].length, cards };
}
