import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][]; rare: string[][] };

/**
 * Limited Edition Beta (1993). Striped collation on three 11×11 sheets — same
 * method as Alpha, but with three basic-land variants (A/B/C), Circle of
 * Protection: Black on the common sheet, and Volcanic Island on the rare sheet.
 */
export const leb: SetDefinition = {
  code: 'leb',
  name: 'Limited Edition Beta',
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
