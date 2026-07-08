import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Legends (1994). Striped collation on three 11×11 sheets; pack of 11 commons +
 * 3 uncommons + 1 rare (36-pack boxes).
 *
 * The wrinkle: the uncommon sheet is collated as two independent half-sheets —
 * the top 6 rows ("A", the Mana Drain half) and the bottom 5 rows ("B", the
 * Karakas half) — and a whole booster box draws its uncommons from a single
 * half. Modelled via `splitSheets.uncommon` + the `half` open option. Commons
 * and rares use the full sheet.
 *
 * PROVISIONAL, pending validation against real box openings (Steven has three):
 *  - Stripe widths are ASSUMED [2,3,4,5] on all three sheets (the source doesn't
 *    give the sequence).
 *  - The uncommon split is ASSUMED row-major, top-6 / bottom-5. This does not
 *    perfectly reproduce the source's "only Hammerheim appears on both halves"
 *    (row-major also puts Pendelhaven and Tolaria on both), so the exact grid
 *    orientation / half boundary is unconfirmed. The card grids themselves are
 *    checksum-validated; only the collation order and half membership are
 *    provisional.
 * Source: The Collation Project (lethe.xyz/mtg/collation/leg).
 */
export const leg: SetDefinition = {
  code: 'leg',
  name: 'Legends',
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
  stripeCycle: [2, 3, 4, 5], // PROVISIONAL — assumed, not yet observed
  splitSheets: {
    uncommon: { topRows: 6 }, // PROVISIONAL — assumed row-major top-6 (A) / bottom-5 (B)
  },
};
