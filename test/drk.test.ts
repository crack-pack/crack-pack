import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { drk } from '../src/sets/drk/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const freqByCount = (cards: { name: string }[]) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount, counts };
};

test("The Dark registers under its code 'drk'", () => {
  assert.equal(drk.code, 'drk');
  assert.equal(getSet('drk'), drk);
  assert.equal(getSet('DRK'), drk);
  assert.equal(sets.drk, drk);
});

test('has common + uncommon 11 × 11 sheets and no rare sheet', () => {
  for (const r of ['common', 'uncommon'] as Rarity[]) {
    const s = drk.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.equal(drk.sheets.rare, undefined);
});

test('common-sheet frequencies match the source (40×C3 + Maze of Ith ×1)', () => {
  const { distinct, byCount, counts } = freqByCount(drk.sheets.common!.cards);
  assert.equal(distinct, 41);
  assert.deepEqual(byCount, { 1: 1, 3: 40 });
  assert.equal(counts.get('Maze of Ith'), 1);
});

test('uncommon-sheet frequencies match the source (43×U2 + 35×U1)', () => {
  const { distinct, byCount } = freqByCount(drk.sheets.uncommon!.cards);
  assert.equal(distinct, 78);
  assert.deepEqual(byCount, { 1: 35, 2: 43 });
});

test('a pack is 8 cards: 6 common + 2 uncommon (no rare)', () => {
  const pack = openPack(drk, { seed: 42 });
  assert.equal(pack.length, 8);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 6);
  assert.equal(bySlot('uncommon'), 2);
  assert.equal(bySlot('rare'), 0);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<string, Set<string>> = {
    common: new Set(drk.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(drk.sheets.uncommon!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(drk, 300, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

// With a single [2,3,4,5] cycle on both sheets and 6C/2U per pack, the run wraps
// every 847 packs. This asserts the (assumed) model's period, not observed reality.
test('the run has 847 distinct packs (assumed [2,3,4,5] model)', () => {
  assert.deepEqual(openPacks(drk, 1, { startPack: 0 }), openPacks(drk, 1, { startPack: 847 }));
  assert.notDeepEqual(openPacks(drk, 1, { startPack: 0 }), openPacks(drk, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(drk, 1, { startPack: 7 }), openPacks(drk, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(drk, 10, { seed: 123 }), openPacks(drk, 10, { seed: 123 }));
});
