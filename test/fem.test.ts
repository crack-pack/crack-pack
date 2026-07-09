import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { fem } from '../src/sets/fem/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const baseName = (n: string) => n.replace(/ \([A-D]\)$/, '');
const freqByCount = (cards: { name: string }[], keyFn: (n: string) => string = (n) => n) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(keyFn(c.name), (counts.get(keyFn(c.name)) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount, counts };
};

test("Fallen Empires registers under its code 'fem'", () => {
  assert.equal(fem.code, 'fem');
  assert.equal(getSet('fem'), fem);
  assert.equal(getSet('FEM'), fem);
  assert.equal(sets.fem, fem);
});

test('has common + uncommon 11 × 11 sheets and no rare sheet', () => {
  for (const r of ['common', 'uncommon'] as Rarity[]) {
    const s = fem.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.equal(fem.sheets.rare, undefined);
});

test('common sheet: 36 base cards (15×C4, 20×C3, Delif\'s Cone ×1); every slot a distinct art', () => {
  const merged = freqByCount(fem.sheets.common!.cards, baseName);
  assert.equal(merged.distinct, 36);
  assert.deepEqual(merged.byCount, { 1: 1, 3: 20, 4: 15 });
  assert.equal(merged.counts.get("Delif's Cone"), 1);
  // Each appearance is a distinct art variant → all 121 slots are unique names.
  assert.equal(freqByCount(fem.sheets.common!.cards).distinct, 121);
});

test('uncommon-sheet frequencies match the source (25×U3, 5×U2, 36×U1)', () => {
  const { distinct, byCount } = freqByCount(fem.sheets.uncommon!.cards);
  assert.equal(distinct, 66);
  assert.deepEqual(byCount, { 1: 36, 2: 5, 3: 25 });
});

test('a pack is 8 cards: 6 common + 2 uncommon (no rare)', () => {
  const pack = openPack(fem, { seed: 42 });
  assert.equal(pack.length, 8);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 6);
  assert.equal(bySlot('uncommon'), 2);
  assert.equal(bySlot('rare'), 0);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<string, Set<string>> = {
    common: new Set(fem.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(fem.sheets.uncommon!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(fem, 300, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

// Single [2,3,4,5] cycle on both sheets with 6C/2U per pack wraps every 847 packs.
test('the run has 847 distinct packs (assumed [2,3,4,5] model)', () => {
  assert.deepEqual(openPacks(fem, 1, { startPack: 0 }), openPacks(fem, 1, { startPack: 847 }));
  assert.notDeepEqual(openPacks(fem, 1, { startPack: 0 }), openPacks(fem, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(fem, 1, { startPack: 7 }), openPacks(fem, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(fem, 10, { seed: 123 }), openPacks(fem, 10, { seed: 123 }));
});
