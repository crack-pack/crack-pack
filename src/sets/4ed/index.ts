import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Fourth Edition (1995). Large base-set reprint: 121 commons + 121 uncommons +
 * 121 rares (each once per sheet), striped on 11×11 sheets. 15-card packs (11
 * commons + 3 uncommons + 1 rare), 36-pack boxes. Basic lands (three A/B/C
 * variants) are on a separate land sheet and don't appear in boosters, so these
 * three sheets are pure card grids.
 *
 * Common and uncommon are the real sheet data (common uses "version 1" of two
 * printings the source shows). The **rare sheet is a reconstruction**: the
 * Collation Project has no English/French rare-sheet transcription, so we base it
 * on the real **Revised** rare sheet — 90 of the 121 rares carried over and keep
 * their Revised positions; the 31 rares new to 4th Edition are placed into the
 * slots vacated by the 31 removed Revised rares (those 31 positions are assumed).
 * Plausible but unverified; the real 4th Edition rare sheet exists as French /
 * Portuguese sheet images, not yet transcribed. Stripe cycle [2,3,4,5] assumed.
 * Source: The Collation Project (lethe.xyz/mtg/collation/4ed). See docs/4ed.md.
 */
export const fourthEdition: SetDefinition = {
  code: '4ed',
  name: 'Fourth Edition',
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
