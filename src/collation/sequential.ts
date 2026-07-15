import type { CardEntry } from '../types.ts';

export interface SequentialWalkOptions {
  /** Where in the sequence to begin (0-based). Defaults to 0 = (row 1, col 1). */
  start?: number;
}

/**
 * Deterministic sequential-collation walk over a rows×cols print sheet — the
 * simplest ordering. Cards are read row-major: left→right within a row, rows
 * top→bottom, and after the bottom-right card it wraps back to the top-left. The
 * stream is continuous over successive identical sheets, so positions recur.
 *
 * Per The Collation Project: "Each row of cards appears in order from left to
 * right. The rows are ordered from top to bottom. The bottom right card will be
 * followed again by the top left card."
 */
export function sequentialWalk(grid: CardEntry[][], opts: SequentialWalkOptions = {}): () => CardEntry {
  const rows = grid.length;
  const cols = grid[0].length;
  const total = rows * cols;
  let pos = ((opts.start ?? 0) % total + total) % total;

  return function next(): CardEntry {
    const card = grid[Math.floor(pos / cols)][pos % cols];
    pos = (pos + 1) % total;
    return card;
  };
}

/**
 * Number of cards in one full period of a sequential walk — simply the sheet
 * size (rows × cols), after which the row-major read wraps to the start.
 */
export function sequentialPeriod(rows: number, cols: number): number {
  return rows * cols;
}
