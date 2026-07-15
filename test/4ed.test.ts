import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { fourthEdition } from '../src/sets/4ed/index.ts';
import { revised } from '../src/sets/3ed/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];

test("Fourth Edition registers under its code '4ed'", () => {
  assert.equal(fourthEdition.code, '4ed');
  assert.equal(getSet('4ed'), fourthEdition);
  assert.equal(getSet('4ED'), fourthEdition);
  assert.equal(sets['4ed'], fourthEdition);
});

test('three 11 × 11 sheets, each 121 distinct cards, no basic-land fill', () => {
  for (const r of RARITIES) {
    const s = fourthEdition.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cards.length, 121);
    assert.equal(new Set(s.cards.map((c) => c.name)).size, 121);
    assert.ok(s.cards.every((c) => !c.isBasicLand)); // basic lands are on a separate land sheet
  }
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(fourthEdition, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<Rarity, Set<string>> = {
    common: new Set(fourthEdition.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(fourthEdition.sheets.uncommon!.cards.map((c) => c.name)),
    rare: new Set(fourthEdition.sheets.rare!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(fourthEdition, 200, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

// The rare sheet is reconstructed from Revised: rares present in both keep their
// Revised grid positions; new-to-4ed rares fill the slots of removed Revised rares.
test('rare sheet is reconstructed from Revised (carried-over rares keep their positions)', () => {
  const rev = revised.sheets.rare!.cards.map((c) => c.name);
  const ned = fourthEdition.sheets.rare!.cards.map((c) => c.name);
  const nedSet = new Set(ned);
  let carried = 0;
  for (let i = 0; i < 121; i++) {
    if (nedSet.has(rev[i])) {
      assert.equal(ned[i], rev[i], `carried rare ${rev[i]} should keep Revised position ${i}`);
      carried++;
    }
  }
  assert.equal(carried, 90); // 90 of 121 rares carried over from Revised
});

test('the run has 1694 distinct packs (rare 1-per-pack)', () => {
  assert.deepEqual(openPacks(fourthEdition, 1, { startPack: 0 }), openPacks(fourthEdition, 1, { startPack: 1694 }));
  assert.notDeepEqual(openPacks(fourthEdition, 1, { startPack: 0 }), openPacks(fourthEdition, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(fourthEdition, 1, { startPack: 7 }), openPacks(fourthEdition, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(fourthEdition, 10, { seed: 123 }), openPacks(fourthEdition, 10, { seed: 123 }));
});
