import type { CardEntry, Rarity, SetDefinition, Sheet } from '../../types.ts';
import sheets from './sheets.json' with { type: 'json' };

const LAND = /^(Plains|Island|Swamp|Mountain|Forest) \(([A-Z])\)$/;

/** Turn a raw sheet cell (e.g. "Swamp (A)" or "Lightning Bolt") into a CardEntry. */
function parseCell(raw: string): CardEntry {
  const m = LAND.exec(raw);
  if (!m) return { name: raw, isBasicLand: false };
  const variant = m[2];
  if (variant === 'A' || variant === 'B') {
    return { name: m[1], isBasicLand: true, variant };
  }
  // Alpha only has A/B; anything else is a real land whose version is unresolved.
  return { name: m[1], isBasicLand: true, variantUnresolved: true };
}

function buildSheet(rarity: Rarity, grid: string[][]): Sheet {
  const cards: CardEntry[] = grid.flat().map(parseCell);
  return { rarity, rows: grid.length, cols: grid[0].length, cards };
}

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Limited Edition Alpha (1993). Striped collation on three 11×11 sheets.
 * Pack: 11 commons + 3 uncommons + 1 rare (common → uncommon → rare).
 */
export const lea: SetDefinition = {
  code: 'lea',
  name: 'Limited Edition Alpha',
  collation: 'striped',
  sheets: {
    common: buildSheet('common', data.common),
    uncommon: buildSheet('uncommon', data.uncommon),
    rare: buildSheet('rare', data.rare),
  },
  layout: {
    slots: [
      { sheet: 'common', count: 11 },
      { sheet: 'uncommon', count: 3 },
      { sheet: 'rare', count: 1 },
    ],
  },
  stripeCycle: [2, 3, 4, 5],
};
