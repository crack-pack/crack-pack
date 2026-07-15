import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Ice Age (1995). Large set: 121 commons + 121 uncommons + 121 rares; striped
 * collation on 11×11 sheets; 15-card packs (11 commons + 3 uncommons + 1 rare),
 * 36-pack boxes. Basic lands (incl. snow-covered) are on a separate land sheet
 * and do NOT appear in boosters, so these three sheets are pure card grids.
 *
 * All three sheets are REAL print-sheet data. The Collation Project page has no
 * rare-sheet gallery, so the rare grid was transcribed by hand from a photo of
 * the uncut rare sheet on magiclibrarities.net and validated (all 121 rares
 * present exactly once, positions eyeballed against the image). Commons and
 * uncommons come from The Collation Project (common uses "version 1", the earlier
 * of two printings the source shows). Stripe cycle [2,3,4,5] assumed; the source
 * notes variable collation (some boxes split the first common sheet, width-1
 * stripes observed).
 * Sources: The Collation Project (lethe.xyz/mtg/collation/ice) for common/uncommon;
 * magiclibrarities.net uncut-sheet photo for the rare sheet.
 */
export const ice: SetDefinition = {
  code: 'ice',
  name: 'Ice Age',
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
