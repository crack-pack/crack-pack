import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { ice } from '../src/sets/ice/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];

test("Ice Age registers under its code 'ice'", () => {
  assert.equal(ice.code, 'ice');
  assert.equal(getSet('ice'), ice);
  assert.equal(getSet('ICE'), ice);
  assert.equal(sets.ice, ice);
});

test('three 11 × 11 sheets, each 121 distinct cards, no basic-land fill', () => {
  for (const r of RARITIES) {
    const s = ice.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cards.length, 121);
    assert.equal(new Set(s.cards.map((c) => c.name)).size, 121); // each card once
    assert.ok(s.cards.every((c) => !c.isBasicLand)); // basic lands are on a separate land sheet, not in boosters
  }
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(ice, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<Rarity, Set<string>> = {
    common: new Set(ice.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(ice.sheets.uncommon!.cards.map((c) => c.name)),
    rare: new Set(ice.sheets.rare!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(ice, 200, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

test('the run has 1694 distinct packs (rare 1-per-pack)', () => {
  assert.deepEqual(openPacks(ice, 1, { startPack: 0 }), openPacks(ice, 1, { startPack: 1694 }));
  assert.notDeepEqual(openPacks(ice, 1, { startPack: 0 }), openPacks(ice, 1, { startPack: 1 }));
});

// The rare grid is a PLACEHOLDER (Scryfall collector order, not the real print
// sheet). This just pins that the 121 real rares are present; it does not assert
// real rare collation. Remove/replace when the true rare sheet is sourced.
test('placeholder rare sheet contains the 121 real Ice Age rares', () => {
  const rares = new Set(ice.sheets.rare!.cards.map((c) => c.name));
  assert.equal(rares.size, 121);
  assert.ok(rares.has('Jester\'s Cap'));
  assert.ok(rares.has('Necropotence'));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(ice, 1, { startPack: 7 }), openPacks(ice, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(ice, 10, { seed: 123 }), openPacks(ice, 10, { seed: 123 }));
});
