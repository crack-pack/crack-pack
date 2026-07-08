import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, Rarity } from '../src/types.ts';
import { lea } from '../src/sets/lea/index.ts';
import { getSet, sets } from '../src/sets/index.ts';
import { openPack, openPacks } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];

test("Alpha's set code is the lowercase Scryfall/MTGJSON code 'lea'", () => {
  assert.equal(lea.code, 'lea');
  assert.equal(getSet('lea'), lea);
  assert.equal(getSet('LEA'), lea); // case-insensitive lookup
  assert.equal(sets.lea, lea);
  assert.throws(() => getSet('zzz'));
});

test('every Alpha sheet is 11 × 11 (121 slots)', () => {
  for (const r of RARITIES) {
    const s = lea.sheets[r]!;
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
  }
});

test('non-land counts match known Alpha rarity totals', () => {
  const nonLand = (r: Rarity) => lea.sheets[r]!.cards.filter((c) => !c.isBasicLand).length;
  assert.equal(nonLand('common'), 74);
  assert.equal(nonLand('uncommon'), 95);
  assert.equal(nonLand('rare'), 116);
});

test('common-sheet basic-land fill is 9P / 10I / 9S / 9M / 10F', () => {
  const counts: Record<string, number> = {};
  for (const c of lea.sheets.common!.cards) {
    if (c.isBasicLand) counts[c.name] = (counts[c.name] ?? 0) + 1;
  }
  assert.deepEqual(counts, { Plains: 9, Island: 10, Swamp: 9, Mountain: 9, Forest: 10 });
});

test('all basic-land variants are resolved to A or B (no anomalies remain)', () => {
  for (const r of RARITIES) {
    for (const c of lea.sheets[r]!.cards) {
      if (!c.isBasicLand) continue;
      assert.equal(c.variantUnresolved, undefined, `${r}: ${c.name} still unresolved`);
      assert.ok(c.variant === 'A' || c.variant === 'B', `${r}: ${c.name} has variant ${c.variant}`);
    }
  }
});

test('the former "Mountain (C)" (uncommon r7c11) is now Mountain (B) = lea/293', () => {
  const cell = lea.sheets.uncommon!.cards[6 * 11 + 10]; // row 7, col 11 (0-indexed 6,10)
  assert.equal(cell.name, 'Mountain');
  assert.equal(cell.variant, 'B');
});

test('a pack is 15 cards: 11 common + 3 uncommon + 1 rare', () => {
  const pack = openPack(lea, { seed: 42 });
  assert.equal(pack.length, 15);
  const bySlot = (r: Rarity) => pack.filter((c) => c.fromSheet === r).length;
  assert.equal(bySlot('common'), 11);
  assert.equal(bySlot('uncommon'), 3);
  assert.equal(bySlot('rare'), 1);
});

test('every drawn card actually lives on the sheet it was drawn from', () => {
  const onSheet: Record<Rarity, Set<string>> = {
    common: new Set(lea.sheets.common!.cards.map((c) => c.name)),
    uncommon: new Set(lea.sheets.uncommon!.cards.map((c) => c.name)),
    rare: new Set(lea.sheets.rare!.cards.map((c) => c.name)),
  };
  for (const pack of openPacks(lea, 200, { seed: 7 })) {
    for (const card of pack as OpenedCard[]) {
      assert.ok(onSheet[card.fromSheet].has(card.name), `${card.name} not on ${card.fromSheet} sheet`);
    }
  }
});

test('pack 0 is the canonical first-ever Alpha pack (position 1 on all sheets)', () => {
  const pack = openPacks(lea, 1, { startPack: 0 })[0];
  const bySlot = (r: Rarity) =>
    pack.filter((c) => c.fromSheet === r).map((c) => (c.isBasicLand && c.variant ? `${c.name} (${c.variant})` : c.name));
  assert.deepEqual(bySlot('rare'), ['Timetwister']);
  assert.deepEqual(bySlot('uncommon'), ['Psionic Blast', 'Goblin Balloon Brigade', 'Phantasmal Forces']);
  assert.deepEqual(bySlot('common'), [
    'Island (B)', 'Stone Rain', 'Flight', 'Gray Ogre', 'Psychic Venom', 'Mountain (A)',
    'Island (A)', 'Earthbind', 'Circle of Protection: Green', 'Weakness', 'Plains (A)',
  ]);
});

test('a rare determines its pack — pack N is fully fixed by its index', () => {
  // Same index → identical pack; the rare, uncommons and commons move together.
  assert.deepEqual(openPacks(lea, 1, { startPack: 7 }), openPacks(lea, 1, { startPack: 7 }));
});

test('openings are reproducible for a fixed seed', () => {
  const a = openPacks(lea, 10, { seed: 123 });
  const b = openPacks(lea, 10, { seed: 123 });
  assert.deepEqual(a, b);
});

test('different seeds generally produce different packs', () => {
  const a = JSON.stringify(openPacks(lea, 3, { seed: 1 }));
  const b = JSON.stringify(openPacks(lea, 3, { seed: 2 }));
  assert.notEqual(a, b);
});
