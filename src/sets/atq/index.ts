import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][] };

/**
 * Antiquities (1994), Magic's second expansion. Like Arabian Nights: two 11×11
 * striped sheets (common + uncommon, no rare sheet), 8-card packs of 6 commons
 * + 2 uncommons, rarity emergent from repeat counts. Five non-basic lands
 * (Urza's Mine/Power Plant/Tower, Mishra's Factory, Strip Mine) have four art
 * variants each, notated "(A)"–"(D)" and kept verbatim in the sheet data.
 * Source: The Collation Project (lethe.xyz/mtg/collation/atq).
 *
 * PROVISIONAL stripe widths: the source page states "striped 11×11" but does not
 * give the per-sheet stripe-width sequence. Pending validation against a real
 * box-opening video, these are ASSUMED to match Arabian Nights (common [3,4,5],
 * uncommon [3,4]). The card grids are validated; only the stripe order — i.e.
 * which cards land together in a pack — is unconfirmed. Update when known.
 */
export const atq: SetDefinition = {
  code: 'atq',
  name: 'Antiquities',
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
  stripeCycle: {
    common: [3, 4, 5], // PROVISIONAL — assumed from Arabian Nights, not yet observed
    uncommon: [3, 4], // PROVISIONAL — assumed from Arabian Nights, not yet observed
  },
};
