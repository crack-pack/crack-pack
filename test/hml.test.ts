import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { hml } from '../src/sets/hml/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const freqByCount = (cards: { name: string }[]) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount, counts };
};
const baseName = (n: string) => n.replace(/ \([AB]\)$/, '');

test("Homelands registers under its code 'hml'", () => {
  assert.equal(hml.code, 'hml');
  assert.equal(getSet('hml'), hml);
  assert.equal(getSet('HML'), hml); // case-insensitive
  assert.equal(sets.hml, hml);
});

test('has common + uncommon 11 × 11 sheets and no rare sheet', () => {
  for (const r of ['common', 'uncommon'] as Rarity[]) {
    const s = hml.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.equal(hml.sheets.rare, undefined);
});

test('common sheet: 71 printings (21 × C1 + 50 × C2), 46 base cards after merging A/B', () => {
  const { distinct, byCount } = freqByCount(hml.sheets.common!.cards);
  assert.equal(distinct, 71);
  assert.deepEqual(byCount, { 1: 21, 2: 50 });
  const base = new Set(hml.sheets.common!.cards.map((c) => baseName(c.name)));
  assert.equal(base.size, 46); // 25 cards have two versions (A/B) + 21 single-version
});

test('uncommon sheet: 69 cards (26 × U3 + 43 × U1)', () => {
  const { distinct, byCount, counts } = freqByCount(hml.sheets.uncommon!.cards);
  assert.equal(distinct, 69);
  assert.deepEqual(byCount, { 1: 43, 3: 26 });
  // Sengir Autocrat is a U1 de-facto rare (appears once), despite MTGJSON
  // labelling it uncommon — our frequency-based model treats it correctly.
  assert.equal(counts.get('Sengir Autocrat'), 1);
});

test('a pack is 8 cards: 6 common + 2 uncommon (no rare)', () => {
  const pack = openPack(hml, { seed: 42 });
  assert.equal(pack.length, 8);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 6);
  assert.equal(bySlot('uncommon'), 2);
  assert.equal(bySlot('rare'), 0);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<string, Set<string>> = {
    common: new Set(hml.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(hml.sheets.uncommon!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(hml, 300, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

test('the run has 847 distinct packs (both sheets share [2,3,4,5])', () => {
  assert.deepEqual(openPacks(hml, 1, { startPack: 0 }), openPacks(hml, 1, { startPack: 847 }));
  assert.notDeepEqual(openPacks(hml, 1, { startPack: 0 }), openPacks(hml, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(hml, 1, { startPack: 7 }), openPacks(hml, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(hml, 10, { seed: 123 }), openPacks(hml, 10, { seed: 123 }));
});
