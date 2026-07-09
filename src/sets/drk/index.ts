import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][] };

/**
 * The Dark (1994). Like Arabian Nights / Antiquities: two 11×11 striped sheets
 * (common + uncommon, no rare sheet), 8-card packs of 6 commons + 2 uncommons,
 * 60-pack boxes, rarity emergent from repeat counts (common: 40×C3 + Maze of Ith
 * ×1; uncommon: 43×U2 + 35×U1 — the 35 U1s being the de-facto rares).
 *
 * SIMPLIFIED collation: The Dark's real collation is variable per box — sheets
 * may or may not split, with "2 or 3 independent sequences of commons in a box"
 * and non-split boxes showing width-7 stripes — so there is no single
 * deterministic walk to reproduce. We model it as a plain two-sheet striped set
 * with an assumed [2,3,4,5] cycle: the card grids are checksum-validated, but the
 * pack grouping is a deliberate approximation of an inherently variable process.
 * Source: The Collation Project (lethe.xyz/mtg/collation/drk).
 */
export const drk: SetDefinition = {
  code: 'drk',
  name: 'The Dark',
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
  stripeCycle: [2, 3, 4, 5], // assumed; real collation is variable/box-dependent (see note)
};
