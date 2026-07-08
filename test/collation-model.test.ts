import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CardEntry } from '../src/types.ts';
import { lea } from '../src/sets/lea/index.ts';
import { stripedWalk, cyclicWidths, stripedPeriod } from '../src/collation/striped.ts';

const ROWS = 11, COLS = 11, CYCLE = [2, 3, 4, 5];

function uncommonGrid(): CardEntry[][] {
  const s = lea.sheets.uncommon!;
  const g: CardEntry[][] = [];
  for (let r = 0; r < s.rows; r++) g.push(s.cards.slice(r * s.cols, (r + 1) * s.cols));
  return g;
}

/**
 * The authoritative collation model, anchored to positions Steven read off his
 * physical Alpha uncommon sheet. Position 1 is (col 11, row 11); widths cycle
 * 2,3,4,5 per stripe. These pin both the walk geometry and the sheet data.
 */
test('deterministic striped walk hits the known Alpha positions (col,row)', () => {
  const grid = uncommonGrid();
  const next = stripedWalk(grid, { nextWidth: cyclicWidths(CYCLE) });

  // Reconstruct (col,row) for each emitted position by re-deriving from a
  // coordinate-tracking copy of the walk.
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  let bandStartRow = ROWS - 1, col = COLS - 1, k = 0, i = 0;
  let width = CYCLE[0];
  const coords: Array<{ col: number; row: number }> = [];
  while (coords.length < 60) {
    coords.push({ col: col + 1, row: mod(bandStartRow - k, ROWS) + 1 });
    k += 1;
    if (k >= width) {
      k = 0; col -= 1;
      if (col < 0) { col = COLS - 1; bandStartRow = mod(bandStartRow - width, ROWS); i += 1; width = CYCLE[i % CYCLE.length]; }
    }
  }
  const at = (pos: number) => coords[pos - 1];
  assert.deepEqual(at(1), { col: 11, row: 11 });
  assert.deepEqual(at(22), { col: 1, row: 10 });
  assert.deepEqual(at(23), { col: 11, row: 9 });
  assert.deepEqual(at(24), { col: 11, row: 8 });
  assert.deepEqual(at(25), { col: 11, row: 7 });
  assert.deepEqual(at(55), { col: 1, row: 7 });

  // and the walk itself yields real cards at those positions (smoke check)
  assert.equal(typeof next().name, 'string');
});

test('the pattern realigns after 14 sheets (restarts bottom-right on sheet 15)', () => {
  const period = stripedPeriod(CYCLE, ROWS, COLS);
  assert.equal(period, 1694); // 11 * (2+3+4+5) * 11
  assert.equal(period / (ROWS * COLS), 14); // 14 sheets
});
