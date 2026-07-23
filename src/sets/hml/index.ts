import type { SetDefinition } from '../../types.ts';
import { buildSheet } from '../parse.ts';
import sheets from './sheets.json' with { type: 'json' };

const data = sheets as unknown as { common: string[][]; uncommon: string[][] };

/**
 * Homelands (1995). Two 11×11 striped sheets — a common and an uncommon sheet,
 * with no rare sheet; rarity is emergent from how often a card repeats (commons
 * C1 ×1 / C2 ×2, uncommons U3 ×3 with de-facto rares U1 ×1). Pack: 8 cards =
 * 6 commons + 2 uncommons.
 *
 * Sheet data hand-transcribed from uncut-sheet photos on magiclibrarities.net
 * (The Collation Project has no Homelands page), validated by collector number
 * and by rarity colour-balance against MTGJSON. 25 commons have two versions,
 * kept verbatim as "(A)"/"(B)". Basic lands are on a separate land sheet (not in
 * boosters), so these are pure card grids.
 *
 * NOTE: MTGJSON/Scryfall mislabels Sengir Autocrat (#56) as uncommon; the sheet
 * frequency (appears once) and colour-balance make it a U1 de-facto rare — our
 * frequency-based model handles this correctly. See mtgjson/mtgjson#1687.
 *
 * PROVISIONAL: stripe cycle assumed [2,3,4,5] (Belgian/Carta Mundi printing; no
 * width data available). Card grids validated; the collation walk is assumed.
 */
export const hml: SetDefinition = {
  code: 'hml',
  name: 'Homelands',
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
  stripeCycle: [2, 3, 4, 5],
};
