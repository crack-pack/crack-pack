import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { arn } from '../src/sets/arn/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const baseName = (name: string) => name.replace(/ \((?:Light|Dark)\)$/, '');
const freqByCount = (cards: { name: string }[]) => {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(baseName(c.name), (counts.get(baseName(c.name)) ?? 0) + 1);
  const byCount: Record<number, number> = {};
  for (const n of counts.values()) byCount[n] = (byCount[n] ?? 0) + 1;
  return { distinct: counts.size, byCount, counts };
};

test("Arabian Nights registers under its code 'arn'", () => {
  assert.equal(arn.code, 'arn');
  assert.equal(getSet('arn'), arn);
  assert.equal(getSet('ARN'), arn); // case-insensitive
  assert.equal(sets.arn, arn);
});

test('has common + uncommon 11 × 11 sheets and no rare sheet', () => {
  for (const r of ['common', 'uncommon'] as Rarity[]) {
    const s = arn.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
  }
  assert.equal(arn.sheets.rare, undefined);
});

test('common-sheet frequencies match the source (16×C4, 9×C5, Desert×11, Mountain×1)', () => {
  const { distinct, byCount, counts } = freqByCount(arn.sheets.common!.cards);
  assert.equal(distinct, 27); // Light/Dark versions merged to the base card
  assert.deepEqual(byCount, { 1: 1, 4: 16, 5: 9, 11: 1 });
  assert.equal(counts.get('Desert'), 11);
  assert.equal(counts.get('Mountain'), 1);
});

test('uncommon-sheet frequencies match the source (33×U2, 17×U3, Oasis×4)', () => {
  const { distinct, byCount, counts } = freqByCount(arn.sheets.uncommon!.cards);
  assert.equal(distinct, 51);
  assert.deepEqual(byCount, { 2: 33, 3: 17, 4: 1 });
  assert.equal(counts.get('Oasis'), 4);
});

test('the single basic land (Mountain) is flagged, with no A/B/C variant', () => {
  const mountain = arn.sheets.common!.cards.find((c) => c.name === 'Mountain');
  assert.ok(mountain);
  assert.equal(mountain!.isBasicLand, true);
  assert.equal(mountain!.variant, undefined);
});

test('a pack is 8 cards: 6 common + 2 uncommon (no rare)', () => {
  const pack = openPack(arn, { seed: 42 });
  assert.equal(pack.length, 8);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 6);
  assert.equal(bySlot('uncommon'), 2);
  assert.equal(bySlot('rare'), 0);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<string, Set<string>> = {
    common: new Set(arn.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(arn.sheets.uncommon!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(arn, 300, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

test('the run has 1694 distinct packs (LCM of the two per-sheet periods)', () => {
  // Wrapping: pack 0 and pack 1694 are identical; a nearby index is not.
  assert.deepEqual(openPacks(arn, 1, { startPack: 0 }), openPacks(arn, 1, { startPack: 1694 }));
  assert.notDeepEqual(openPacks(arn, 1, { startPack: 0 }), openPacks(arn, 1, { startPack: 1 }));
});

test('openings are deterministic (index and seed both reproduce)', () => {
  assert.deepEqual(openPacks(arn, 1, { startPack: 7 }), openPacks(arn, 1, { startPack: 7 }));
  assert.deepEqual(openPacks(arn, 10, { seed: 123 }), openPacks(arn, 10, { seed: 123 }));
});
