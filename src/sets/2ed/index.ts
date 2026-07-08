import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
// Unlimited's sheet layouts and collation are identical to Beta's (per The
// Collation Project), so it reuses Beta's grids. Only the printed cards differ
// (white border) — a cosmetic detail the collation model doesn't touch.
import sheets from '../leb/sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/** Unlimited Edition (1993). White-bordered reprint; same sheets/collation as Beta. */
export const unlimited: SetDefinition = {
  code: '2ed',
  name: 'Unlimited Edition',
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
