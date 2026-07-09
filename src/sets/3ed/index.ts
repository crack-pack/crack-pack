import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Revised Edition / 3rd Edition (1994). A base-set reprint whose sheet layout is
 * "very similar to Beta and Unlimited": striped collation on three 11×11 sheets,
 * 15-card packs (11 commons + 3 uncommons + 1 rare), 36-pack boxes. Three basic-
 * land art variants (A/B/C). Basic lands fill both the common and uncommon sheets
 * (75 non-land commons + 46 lands; 95 non-land uncommons + 26 lands); the rare
 * sheet is 121 distinct rares with no land fill (the Beta rare-Islands were
 * removed, leaving Islands slightly short-printed). Stripe widths assumed
 * [2,3,4,5] as for the other base sets (the source gives no explicit cycle).
 * Source: The Collation Project (lethe.xyz/mtg/collation/3ed).
 */
export const revised: SetDefinition = {
  code: '3ed',
  name: 'Revised Edition',
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
