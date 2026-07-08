import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { atq } from '../src/sets/atq/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const freqByCount = (cards: { name: string }[]) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount, counts };
};

test("Antiquities registers under its code 'atq'", () => {
  assert.equal(atq.code, 'atq');
  assert.equal(getSet('atq'), atq);
  assert.equal(getSet('ATQ'), atq); // case-insensitive
  assert.equal(sets.atq, atq);
});

test('has common + uncommon 11 × 11 sheets and no rare sheet', () => {
  for (const r of ['common', 'uncommon'] as Rarity[]) {
    const s = atq.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.equal(atq.sheets.rare, undefined);
});

test('common-sheet frequencies match the source (11×C1, 5×C2, 25×C4)', () => {
  const { distinct, byCount } = freqByCount(atq.sheets.common!.cards);
  assert.equal(distinct, 41); // each art variant counted separately
  assert.deepEqual(byCount, { 1: 11, 2: 5, 4: 25 });
});

test('uncommon-sheet frequencies match the source (26×U1, 4×U2, 29×U3)', () => {
  const { distinct, byCount } = freqByCount(atq.sheets.uncommon!.cards);
  assert.equal(distinct, 59);
  assert.deepEqual(byCount, { 1: 26, 2: 4, 3: 29 });
});

test('the five multi-art lands each appear as four variants (A–D)', () => {
  const all = [...atq.sheets.common!.cards, ...atq.sheets.uncommon!.cards].map((c) => c.name);
  for (const land of ["Urza's Mine", "Urza's Power Plant", "Urza's Tower", "Mishra's Factory", 'Strip Mine']) {
    const variants = new Set(all.filter((n) => n.startsWith(land + ' (')));
    assert.deepEqual([...variants].sort(), ['(A)', '(B)', '(C)', '(D)'].map((v) => land + ' ' + v));
  }
});

test('a pack is 8 cards: 6 common + 2 uncommon (no rare)', () => {
  const pack = openPack(atq, { seed: 42 });
  assert.equal(pack.length, 8);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 6);
  assert.equal(bySlot('uncommon'), 2);
  assert.equal(bySlot('rare'), 0);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<string, Set<string>> = {
    common: new Set(atq.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(atq.sheets.uncommon!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(atq, 300, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

// NOTE: with the provisional [3,4,5]/[3,4] cycles the run has 1694 distinct packs
// (same LCM as Arabian Nights). This asserts the wrap, not observed reality — the
// stripe order is still to be validated against a box-opening video.
test('the run has 1694 distinct packs (provisional cycles)', () => {
  assert.deepEqual(openPacks(atq, 1, { startPack: 0 }), openPacks(atq, 1, { startPack: 1694 }));
  assert.notDeepEqual(openPacks(atq, 1, { startPack: 0 }), openPacks(atq, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(atq, 1, { startPack: 7 }), openPacks(atq, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(atq, 10, { seed: 123 }), openPacks(atq, 10, { seed: 123 }));
});
