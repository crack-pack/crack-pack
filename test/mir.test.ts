import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { mir } from '../src/sets/mir/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];

test("Mirage registers under its code 'mir'", () => {
  assert.equal(mir.code, 'mir');
  assert.equal(getSet('mir'), mir);
  assert.equal(getSet('MIR'), mir);
  assert.equal(sets.mir, mir);
});

test('three 10 × 11 sheets, each 110 distinct cards, no basic-land fill', () => {
  for (const r of RARITIES) {
    const s = mir.sheets[r]!;
    assert.equal(s.rows, 10);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 110);
    assert.equal(new Set(s.cards.map((c) => c.name)).size, 110); // each card once
    assert.ok(s.cards.every((c) => !c.isBasicLand)); // basic lands aren't in Mirage boosters
  }
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(mir, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<Rarity, Set<string>> = {
    common: new Set(mir.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(mir.sheets.uncommon!.cards.map((c) => c.name)),
    rare: new Set(mir.sheets.rare!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(mir, 200, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

// 10×11 sheet with [2,3,4,5] has a 770-card period; rare is 1-per-pack → 770 packs.
test('the run has 770 distinct packs', () => {
  assert.deepEqual(openPacks(mir, 1, { startPack: 0 }), openPacks(mir, 1, { startPack: 770 }));
  assert.notDeepEqual(openPacks(mir, 1, { startPack: 0 }), openPacks(mir, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(mir, 1, { startPack: 7 }), openPacks(mir, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(mir, 10, { seed: 123 }), openPacks(mir, 10, { seed: 123 }));
});
