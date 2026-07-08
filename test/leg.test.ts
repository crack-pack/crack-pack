import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { leg } from '../src/sets/leg/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const freqByCount = (cards: { name: string }[]) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount };
};

// The uncommon sheet's two collation halves (provisional row-major top-6 / bottom-5).
const uncGrid = () => {
  const cards = leg.sheets.uncommon!.cards;
  return Array.from({ length: 11 }, (_, r) => cards.slice(r * 11, r * 11 + 11));
};
const halfNames = (rows: number[]) => new Set(rows.flatMap((r) => uncGrid()[r]).map((c) => c.name));

test("Legends registers under its code 'leg'", () => {
  assert.equal(leg.code, 'leg');
  assert.equal(getSet('leg'), leg);
  assert.equal(getSet('LEG'), leg);
  assert.equal(sets.leg, leg);
});

test('three 11 × 11 sheets with validated rarity frequencies', () => {
  for (const r of ['common', 'uncommon', 'rare'] as Rarity[]) {
    const s = leg.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.deepEqual(freqByCount(leg.sheets.common!.cards), { distinct: 75, byCount: { 1: 29, 2: 46 } });
  assert.deepEqual(freqByCount(leg.sheets.uncommon!.cards), { distinct: 114, byCount: { 1: 107, 2: 7 } });
  assert.deepEqual(freqByCount(leg.sheets.rare!.cards), { distinct: 121, byCount: { 1: 121 } });
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(leg, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test("the 'A' half draws uncommons only from the top 6 rows (incl. Mana Drain)", () => {
  const topRows = halfNames([0, 1, 2, 3, 4, 5]);
  const uncommons = new Set<string>();
  for (const pack of openPacks(leg, 400, { startPack: 0, half: 'A' })) {
    for (const c of pack as OpenedCard[]) if (c.fromSheet === 'uncommon') uncommons.add(c.name);
  }
  for (const n of uncommons) assert.ok(topRows.has(n), `${n} is not in the top-6 (A) half`);
  assert.ok(uncommons.has('Mana Drain'), 'A half should include Mana Drain');
  assert.ok(!uncommons.has('Karakas'), 'A half should not include Karakas');
});

test("the 'B' half draws uncommons only from the bottom 5 rows (incl. Karakas)", () => {
  const botRows = halfNames([6, 7, 8, 9, 10]);
  const uncommons = new Set<string>();
  for (const pack of openPacks(leg, 400, { startPack: 0, half: 'B' })) {
    for (const c of pack as OpenedCard[]) if (c.fromSheet === 'uncommon') uncommons.add(c.name);
  }
  for (const n of uncommons) assert.ok(botRows.has(n), `${n} is not in the bottom-5 (B) half`);
  assert.ok(uncommons.has('Karakas'), 'B half should include Karakas');
  assert.ok(!uncommons.has('Mana Drain'), 'B half should not include Mana Drain');
});

test('the two halves produce different packs; commons and rares are unaffected', () => {
  const a = openPacks(leg, 5, { startPack: 0, half: 'A' });
  const b = openPacks(leg, 5, { startPack: 0, half: 'B' });
  const uncs = (packs: OpenedCard[][]) => JSON.stringify(packs.map((p) => p.filter((c) => c.fromSheet === 'uncommon').map((c) => c.name)));
  const nonUncs = (packs: OpenedCard[][]) => JSON.stringify(packs.map((p) => p.filter((c) => c.fromSheet !== 'uncommon').map((c) => c.name)));
  assert.notEqual(uncs(a as OpenedCard[][]), uncs(b as OpenedCard[][])); // halves differ
  assert.equal(nonUncs(a as OpenedCard[][]), nonUncs(b as OpenedCard[][])); // commons + rares identical
});

test('every drawn card lives on the sheet (half) it was drawn from', () => {
  for (const half of ['A', 'B'] as const) {
    const onSheet: Record<string, Set<string>> = {
      common: new Set(leg.sheets.common!.cards.map((c) => c.name)),
      uncommon: half === 'A' ? halfNames([0, 1, 2, 3, 4, 5]) : halfNames([6, 7, 8, 9, 10]),
      rare: new Set(leg.sheets.rare!.cards.map((c) => c.name)),
    };
    for (const pack of openPacks(leg, 200, { seed: 7, half })) {
      for (const c of pack as OpenedCard[]) {
        assert.ok(onSheet[c.fromSheet].has(c.name), `${c.name} not on ${c.fromSheet} ${half}`);
      }
    }
  }
});

test('openings are deterministic (index, seed, and half all reproduce)', () => {
  assert.deepEqual(openPacks(leg, 5, { startPack: 7, half: 'A' }), openPacks(leg, 5, { startPack: 7, half: 'A' }));
  assert.deepEqual(openPacks(leg, 10, { seed: 123, half: 'B' }), openPacks(leg, 10, { seed: 123, half: 'B' }));
});
