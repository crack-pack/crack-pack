import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][] };

/**
 * Fallen Empires (1994). Two 11×11 striped sheets (common + uncommon, no rare),
 * 8-card packs of 6 commons + 2 uncommons, 60-pack boxes. Rarity emergent from
 * repeat counts (common: 15×C4 + 20×C3 + Delif's Cone ×1; uncommon: 25×U3 +
 * 5×U2 + 36×U1 — the 36 U1s being the de-facto rares).
 *
 * Famous for multi-artwork commons: a common has a distinct art for each time it
 * appears on the sheet (C4 → four arts, C3 → three), notated "(A)"–"(D)" and kept
 * verbatim; each art variant occupies one slot. Uncommons are single-art.
 *
 * SIMPLIFIED collation: the uncommon sheet may or may not be split depending on
 * the box (like The Dark), so there is no single deterministic walk. We model it
 * as a plain two-sheet striped set with an assumed [2,3,4,5] cycle. The card
 * grids are checksum-validated; the pack grouping is a deliberate approximation.
 * Source: The Collation Project (lethe.xyz/mtg/collation/fem).
 */
export const fem: SetDefinition = {
  code: 'fem',
  name: 'Fallen Empires',
  collation: 'striped',
  sheets: {
    common: buildSheet('common', data.common),
    uncommon: buildSheet('uncommon', data.uncommon),
  },
  layout: {
    slots: [
      { sheet: 'common', count: 6 },
      { sheet: 'uncommon', count: 2 },
    ],
  },
  stripeCycle: [2, 3, 4, 5], // assumed; source gives no cycle and the uncommon split is box-variable
};
