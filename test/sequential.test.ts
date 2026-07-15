import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OpenedCard, SetDefinition } from '../src/types.ts';
import { buildSheet } from '../src/sets/parse.ts';
import { sequentialWalk, sequentialPeriod } from '../src/collation/sequential.ts';
import { openPacks } from '../src/assembler.ts';

const GRID = [
  ['A', 'B', 'C'],
  ['D', 'E', 'F'],
]; // 2 rows × 3 cols

test('sequentialWalk reads row-major (left→right, top→bottom) and wraps', () => {
  const g = buildSheet('common', GRID).cards;
  const grid2d = [g.slice(0, 3), g.slice(3, 6)];
  const next = sequentialWalk(grid2d);
  const seen = Array.from({ length: 8 }, () => next().name);
  assert.deepEqual(seen, ['A', 'B', 'C', 'D', 'E', 'F', 'A', 'B']); // wraps after F back to A
});

test('sequentialWalk honours a start offset', () => {
  const grid2d = [buildSheet('common', GRID).cards.slice(0, 3), buildSheet('common', GRID).cards.slice(3, 6)];
  const next = sequentialWalk(grid2d, { start: 4 });
  assert.deepEqual([next().name, next().name, next().name], ['E', 'F', 'A']);
});

test('sequentialPeriod is the sheet size (rows × cols)', () => {
  assert.equal(sequentialPeriod(2, 3), 6);
  assert.equal(sequentialPeriod(10, 11), 110);
});

// A minimal sequential-collation set exercised through openPacks.
const seqSet: SetDefinition = {
  code: 'seq-test',
  name: 'Sequential Test',
  collation: 'sequential',
  sheets: { common: buildSheet('common', GRID) },
  layout: { slots: [{ sheet: 'common', count: 1 }] },
};

test('openPacks draws a sequential set in row-major order, wrapping each period', () => {
  const cards = openPacks(seqSet, 6, { startPack: 0 }).map((p) => (p[0] as OpenedCard).name);
  assert.deepEqual(cards, ['A', 'B', 'C', 'D', 'E', 'F']);
  // period is the 6-card sheet; pack 6 wraps to pack 0.
  assert.deepEqual(openPacks(seqSet, 1, { startPack: 6 }), openPacks(seqSet, 1, { startPack: 0 }));
});

test('sequential openings are deterministic', () => {
  assert.deepEqual(openPacks(seqSet, 6, { startPack: 2 }), openPacks(seqSet, 6, { startPack: 2 }));
  assert.deepEqual(openPacks(seqSet, 4, { seed: 9 }), openPacks(seqSet, 4, { seed: 9 }));
});
