import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][] };

/**
 * Arabian Nights (1993), Magic's first expansion. Striped collation on two
 * 11×11 sheets — a common sheet and an uncommon sheet, with no rare sheet.
 * Rarity is emergent from how often a card repeats on its sheet.
 *
 * Pack: 8 cards = 6 commons + 2 uncommons. The two sheets stripe with different
 * width cycles (common [3,4,5], uncommon [3,4]); 15 common cards have "light"
 * and "dark" versions (the earlier bottom-right 6×6 quadrant), kept verbatim in
 * the sheet data. Source: The Collation Project (lethe.xyz/mtg/collation/arn).
 */
export const arn: SetDefinition = {
  code: 'arn',
  name: 'Arabian Nights',
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
    common: [3, 4, 5],
    uncommon: [3, 4],
  },
};
