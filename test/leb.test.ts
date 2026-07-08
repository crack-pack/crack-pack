import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Rarity } from '../src/types.ts';
import { leb } from '../src/sets/leb/index.ts';
import { unlimited } from '../src/sets/2ed/index.ts';
import { getSet } from '../src/sets/index.ts';
import { openPack } from '../src/assembler.ts';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];
const EXPECTED_NONLAND = { common: 75, uncommon: 95, rare: 117 };

test('Beta sheets are 11×11 with the right non-land (rarity) totals', () => {
  for (const r of RARITIES) {
    const s = leb.sheets[r];
    assert.equal(s.rows, 11);
    assert.equal(s.cols, 11);
    assert.equal(s.cards.length, 121);
    const nonLand = s.cards.filter((c) => !c.isBasicLand).length;
    assert.equal(nonLand, EXPECTED_NONLAND[r]);
  }
});

test('Beta basic lands use variants A/B/C only', () => {
  for (const r of RARITIES) {
    for (const c of leb.sheets[r].cards) {
      if (c.isBasicLand) assert.ok(c.variant === 'A' || c.variant === 'B' || c.variant === 'C', `${c.name} variant ${c.variant}`);
    }
  }
});

test('Beta has the two cards Alpha lacked: CoP: Black (common) and Volcanic Island (rare)', () => {
  assert.ok(leb.sheets.common.cards.some((c) => c.name === 'Circle of Protection: Black'));
  assert.ok(leb.sheets.rare.cards.some((c) => c.name === 'Volcanic Island'));
});

test('set registry resolves leb and 2ed', () => {
  assert.equal(getSet('leb'), leb);
  assert.equal(getSet('2ed'), unlimited);
  assert.equal(leb.code, 'leb');
  assert.equal(unlimited.code, '2ed');
});

test('Unlimited reuses Beta’s exact sheet layout', () => {
  for (const r of RARITIES) {
    const a = leb.sheets[r].cards.map((c) => (c.isBasicLand ? `${c.name} (${c.variant})` : c.name));
    const b = unlimited.sheets[r].cards.map((c) => (c.isBasicLand ? `${c.name} (${c.variant})` : c.name));
    assert.deepEqual(b, a);
  }
});

test('Beta and Unlimited open valid 15-card packs (11C/3U/1R)', () => {
  for (const set of [leb, unlimited]) {
    const pack = openPack(set, { startPack: 0 });
    assert.equal(pack.length, 15);
    assert.equal(pack.filter((c) => c.fromSheet === 'common').length, 11);
    assert.equal(pack.filter((c) => c.fromSheet === 'uncommon').length, 3);
    assert.equal(pack.filter((c) => c.fromSheet === 'rare').length, 1);
  }
});
