import type { CardEntry } from '../types.ts';

export interface StripedWalkOptions {
  /** Where in the pattern to begin. Defaults to position 1 = (col 11, row 11). */
  start?: { bandStartRow: number; col: number; k: number };
  /** Supplies the width (in rows) of each successive stripe, in order. */
  nextWidth: () => number;
}

/**
 * Deterministic striped-collation walk over an rows×cols print sheet — the core
 * Alpha mechanism. Starting bottom-right (position 1 = col 11, row 11), each
 * column yields `width` cards going UP (successor = the slot directly above,
 * wrapping from the top of the sheet back to the bottom); columns are traversed
 * right-to-left; when a stripe finishes the leftmost column the band advances
 * UP by that stripe's width and the next width is drawn. The stream is
 * continuous over successive identical sheets, so positions recur — feeding an
 * endless supply into pack assembly.
 *
 * Verified against Steven's physical Alpha sheets: with the width cycle
 * [2,3,4,5] the walk reproduces his stated positions (1→col11,row11;
 * 22→col1,row10; 23–25→col11 rows 9,8,7; 55→col1,row7) and realigns
 * bottom-right on the 15th sheet.
 */
export function stripedWalk(grid: CardEntry[][], opts: StripedWalkOptions): () => CardEntry {
  const rows = grid.length;
  const cols = grid[0].length;
  const mod = (n: number, m: number): number => ((n % m) + m) % m;

  let bandStartRow = opts.start ? opts.start.bandStartRow : rows - 1;
  let col = opts.start ? opts.start.col : cols - 1;
  let k = opts.start ? opts.start.k : 0;
  let width = opts.nextWidth();

  return function next(): CardEntry {
    const card = grid[mod(bandStartRow - k, rows)][col];
    k += 1;
    if (k >= width) {
      k = 0;
      col -= 1;
      if (col < 0) {
        col = cols - 1;
        bandStartRow = mod(bandStartRow - width, rows);
        width = opts.nextWidth();
      }
    }
    return card;
  };
}

/** A `nextWidth` source that repeats a fixed stripe-width cycle forever (e.g. [2,3,4,5]). */
export function cyclicWidths(cycle: number[]): () => number {
  let i = 0;
  return (): number => cycle[i++ % cycle.length];
}

/**
 * Number of cards in one full period of a striped walk — the point at which the
 * walk realigns to its starting position with the width cycle back at the top.
 * For Alpha ([2,3,4,5] over an 11×11 sheet) this is 1694 cards = 14 sheets.
 */
export function stripedPeriod(cycle: number[], rows: number, cols: number): number {
  const mod = (n: number, m: number): number => ((n % m) + m) % m;
  let bandStartRow = rows - 1;
  let stripeIdx = 0;
  let cards = 0;
  for (let guard = 0; guard < 1_000_000; guard++) {
    const w = cycle[stripeIdx % cycle.length];
    cards += cols * w;
    bandStartRow = mod(bandStartRow - w, rows);
    stripeIdx += 1;
    if (bandStartRow === rows - 1 && stripeIdx % cycle.length === 0) return cards;
  }
  return cards;
}
