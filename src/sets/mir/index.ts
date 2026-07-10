import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Mirage (1996). Large set: 110 commons + 110 uncommons + 110 rares (each once
 * per sheet), on 10×11 sheets. 15-card packs (11 commons + 3 uncommons + 1 rare),
 * 36-pack boxes. Basic lands (four art variations) are not in boosters, so these
 * are pure card grids.
 *
 * Mirage had TWO printings with different collation: a US printing (sequential,
 * four common runs with variable splits) and a Belgian printing (striped). We
 * model the **Belgian striped** printing — the US sequential one isn't supported
 * by the engine. Common and uncommon are the Belgian sheets; the rare grid is
 * the one rare sheet the source shows (listed under the US section; real 110-rare
 * data). All three grids are real and checksum-validated.
 *
 * PROVISIONAL: the sheets are 10×11, so — unlike the square 11×11 sets — the walk
 * depends on the row/column orientation, which the source doesn't pin down; we
 * assume 10 rows × 11 columns (the gallery read row-major). Stripe cycle
 * [2,3,4,5] assumed (the source gives no cycle).
 * Source: The Collation Project (lethe.xyz/mtg/collation/mir).
 */
export const mir: SetDefinition = {
  code: 'mir',
  name: 'Mirage',
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
