import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { revised } from '../src/sets/3ed/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];
const landFill = (r: Rarity) => {
  const counts: Record<string, number> = {};
  for (const c of revised.sheets[r]!.cards) if (c.isBasicLand) counts[c.name] = (counts[c.name] ?? 0) + 1;
  return counts;
};

test("Revised registers under its code '3ed' (export const `revised`)", () => {
  assert.equal(revised.code, '3ed');
  assert.equal(getSet('3ed'), revised);
  assert.equal(getSet('3ED'), revised);
  assert.equal(sets['3ed'], revised);
});

test('three 11 × 11 sheets', () => {
  for (const r of RARITIES) {
    const s = revised.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
  }
});

test('non-land counts are 75 / 95 / 121', () => {
  const nonLand = (r: Rarity) => revised.sheets[r]!.cards.filter((c) => !c.isBasicLand).length;
  assert.equal(nonLand('common'), 75);
  assert.equal(nonLand('uncommon'), 95);
  assert.equal(nonLand('rare'), 121);
});

test('basic-land fill matches the source (uncommon Islands short-printed; no rare lands)', () => {
  assert.deepEqual(landFill('common'), { Swamp: 9, Mountain: 10, Forest: 9, Plains: 8, Island: 10 });
  assert.deepEqual(landFill('uncommon'), { Swamp: 6, Mountain: 6, Forest: 6, Plains: 6, Island: 2 });
  assert.deepEqual(landFill('rare'), {});
});

test('basic-land variants are all A/B/C', () => {
  for (const r of RARITIES) {
    for (const c of revised.sheets[r]!.cards) {
      if (!c.isBasicLand) continue;
      assert.ok(c.variant === 'A' || c.variant === 'B' || c.variant === 'C', `${r}: ${c.name} has variant ${c.variant}`);
    }
  }
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(revised, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<Rarity, Set<string>> = {
    common: new Set(revised.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(revised.sheets.uncommon!.cards.map((c) => c.name)),
    rare: new Set(revised.sheets.rare!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(revised, 200, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

test('the run has 1694 distinct packs (rare 1-per-pack, like the other base sets)', () => {
  assert.deepEqual(openPacks(revised, 1, { startPack: 0 }), openPacks(revised, 1, { startPack: 1694 }));
  assert.notDeepEqual(openPacks(revised, 1, { startPack: 0 }), openPacks(revised, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(revised, 1, { startPack: 7 }), openPacks(revised, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(revised, 10, { seed: 123 }), openPacks(revised, 10, { seed: 123 }));
});
