import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CardEntry } from '../src/types.ts';
import { lea } from '../src/sets/lea/index.ts';
import { stripedWalk } from '../src/collation/striped.ts';

/**
 * Real Alpha uncommon pack-opening sequences transcribed from
 * "Alpha Uncommon Observations.pdf" — cards in the order they left each pack.
 * The observers reconstructed each pack assuming a SINGLE stripe width, so this
 * validates the sheet transcription and the walk GEOMETRY (per-column-contiguous,
 * right-to-left, up, wrapping): every pack must appear as a contiguous run in the
 * constant-width walk it describes, in one orientation or the other (a pack
 * filmed upside-down is observed in reverse). The true production width sequence
 * is the deterministic 2,3,4,5 cycle — see collation-model.test.ts.
 */
const OBSERVED = [
  { id: 'V1 S1', width: 4, cards: ['White Knight', 'Phantasmal Forces', 'Island (A)', 'Living Wall', 'Library of Leng', 'Crystal Rod', 'Lifetap', 'Burrowing', 'Berserk', 'Green Ward', 'Swords to Plowshares', 'Deathgrip', 'Rod of Ruin'] },
  { id: 'V1 S2', width: 3, cards: ['Basalt Monolith', 'White Ward', 'Island (B)', 'Flashfires', 'Obsianus Golem', 'Air Elemental', 'Orcish Artillery', 'Lure', 'Forest (B)', 'Counterspell', 'Keldon Warlord', 'Tsunami', 'Steal Artifact'] },
  { id: 'V2 S1', width: 3, cards: ['Cursed Land', 'Forest (A)', 'Wall of Brambles', 'Black Vise', 'Wooden Sphere', 'Forest (B)', 'Phantom Monster', 'Dragon Whelp', 'Channel', "Siren's Call", 'Mountain (B)', 'Camouflage', 'Red Ward'] },
  { id: 'V3 S2', width: 5, cards: ['Wall of Bone', 'Stone Giant', 'Conversion', 'Earth Elemental', 'Castle', 'Animate Dead', 'Mountain (A)', 'White Ward', 'Evil Presence', 'Forest (A)', 'Throne of Bone', 'Demonic Tutor', 'Obsianus Golem'] },
  { id: 'V4 S2', width: 5, cards: ['Conversion', 'Earth Elemental', 'Regrowth', 'Wall of Air', 'Basalt Monolith', 'White Ward', 'Evil Presence', 'Ley Druid', 'Island (B)', 'Flashfires', 'Obsianus Golem', 'Sengir Vampire', 'Forest (B)'] },
  { id: 'V7', width: 5, cards: ['Clone', 'Conservator', 'Sacrifice', 'Lance', 'Wanderlust', 'Animate Artifact', 'Serra Angel', 'Soul Net', 'Water Elemental', 'Plains (A)', 'Swamp (B)', 'Plains (A)', 'Wall of Fire'] },
];

/** Render a CardEntry back to its sheet label, e.g. "Forest (B)" or "Lightning Bolt". */
function label(c: CardEntry): string {
  return c.isBasicLand && c.variant ? `${c.name} (${c.variant})` : c.name;
}

function toGrid(rarity: 'common' | 'uncommon' | 'rare'): CardEntry[][] {
  const s = lea.sheets[rarity];
  const g: CardEntry[][] = [];
  for (let r = 0; r < s.rows; r++) g.push(s.cards.slice(r * s.cols, (r + 1) * s.cols));
  return g;
}

/** Generate `len` labels from a constant-width striped walk over the sheet. */
function constantWidthLabels(width: number, len: number): string[] {
  const next = stripedWalk(toGrid('uncommon'), { nextWidth: () => width });
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(label(next()));
  return out;
}

function indexOfRun(haystack: string[], needle: string[]): number {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

for (const pack of OBSERVED) {
  test(`observed pack ${pack.id} is a contiguous striped run (stripes of ${pack.width})`, () => {
    // The walk state recurs after 11 bands (gcd(width,11)=1); generate one full
    // period plus overlap so any window — including wraparound — is present.
    const period = 11 * 11 * pack.width;
    const stream = constantWidthLabels(pack.width, period + pack.cards.length);
    const forward = indexOfRun(stream, pack.cards);
    const reversed = forward !== -1 ? -1 : indexOfRun(stream, [...pack.cards].reverse());
    assert.ok(
      forward !== -1 || reversed !== -1,
      `${pack.id} did not appear in the width-${pack.width} striped walk in either orientation`,
    );
  });
}
