import type { CardEntry, OpenedCard, Pack, Rarity, SetDefinition, Sheet } from './types.ts';
import { makeRng } from './rng.ts';
import { stripedWalk, cyclicWidths, stripedPeriod } from './collation/striped.ts';

const DEFAULT_STRIPE_CYCLE = [2, 3, 4, 5];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/** The stripe-width cycle for one sheet: the set-wide array, or its per-rarity entry. */
function widthsFor(set: SetDefinition, rarity: Rarity): number[] {
  const s = set.stripeCycle;
  if (s === undefined) return DEFAULT_STRIPE_CYCLE;
  if (Array.isArray(s)) return s;
  return s[rarity] ?? DEFAULT_STRIPE_CYCLE;
}

/** Look up a sheet the layout references; throws if the set is missing it. */
function sheetFor(set: SetDefinition, rarity: Rarity): Sheet {
  const sheet = set.sheets[rarity];
  if (!sheet) throw new Error(`set '${set.code}' has no ${rarity} sheet for its pack layout`);
  return sheet;
}

/** Rebuild a row-major card list into a 2-D grid for the collation walk. */
function toGrid(sheet: Sheet): CardEntry[][] {
  const grid: CardEntry[][] = [];
  for (let r = 0; r < sheet.rows; r++) {
    grid.push(sheet.cards.slice(r * sheet.cols, (r + 1) * sheet.cols));
  }
  return grid;
}

export interface OpenOptions {
  /**
   * Which pack index to start the run at. Pack 0 is the very first pack a fresh
   * production run would produce (position 1 on every sheet). Given the same
   * startPack, openPacks() returns byte-for-byte identical results.
   */
  startPack?: number;
  /**
   * Seed used to pick a random startPack when startPack is not given. Same seed
   * → same run. Omit both for a random pack.
   */
  seed?: number;
}

/**
 * Open `count` packs of a set as one continuous production run.
 *
 * Collation is deterministic: every sheet is cut by the fixed striped walk with
 * its stripe-width cycle, and — crucially — all sheets start at position 1
 * together. So a whole pack is fixed by a single **pack index** N: each sheet's
 * slots for pack N are the next `count` cards from that sheet's stream at offset
 * count·N (e.g. Alpha's commons are common-positions 11N…11N+10). Pack 0 is the
 * first pack a fresh run ever produces. The only choice is where the run starts
 * (which N); packs are then cut consecutively, reproducing box-level correlation.
 */
export function openPacks(set: SetDefinition, count: number, opts: OpenOptions = {}): Pack[] {
  if (set.collation !== 'striped') {
    throw new Error(`collation method '${set.collation}' is not implemented yet`);
  }

  // How many cards each sheet supplies per pack (summed in case a sheet feeds
  // more than one slot).
  const perPack = new Map<Rarity, number>();
  for (const slot of set.layout.slots) {
    perPack.set(slot.sheet, (perPack.get(slot.sheet) ?? 0) + slot.count);
  }

  // The whole pack sequence repeats when every sheet realigns simultaneously.
  // Each sheet's walk realigns after `stripedPeriod` cards; drawing `perPack`
  // cards/pack, its pack sub-period is period/gcd(period, perPack). The set's
  // period is the LCM across sheets. (For a 1-per-pack rare this collapses to
  // that sheet's card period — e.g. Alpha's 1694.)
  let period = 1;
  for (const [rarity, n] of perPack) {
    const sheet = sheetFor(set, rarity);
    const cardPeriod = stripedPeriod(widthsFor(set, rarity), sheet.rows, sheet.cols);
    period = lcm(period, cardPeriod / gcd(cardPeriod, n));
  }

  // Choose the starting pack index. All sheets share it (they are phase-locked,
  // starting together at position 1), which is what ties a pack's slots together.
  let startPack: number;
  if (opts.startPack !== undefined) startPack = ((opts.startPack % period) + period) % period;
  else if (opts.seed !== undefined) startPack = makeRng(opts.seed).int(0, period - 1);
  else startPack = Math.floor(Math.random() * period);

  // One deterministic stream per sheet, advanced to the shared pack index.
  const streams = new Map<Rarity, () => CardEntry>();
  for (const slot of set.layout.slots) {
    if (streams.has(slot.sheet)) continue;
    const sheet = sheetFor(set, slot.sheet);
    const next = stripedWalk(toGrid(sheet), { nextWidth: cyclicWidths(widthsFor(set, slot.sheet)) });
    const skip = (perPack.get(slot.sheet) as number) * startPack;
    for (let i = 0; i < skip; i++) next();
    streams.set(slot.sheet, next);
  }

  const packs: Pack[] = [];
  for (let p = 0; p < count; p++) {
    const pack: Pack = [];
    for (const slot of set.layout.slots) {
      const next = streams.get(slot.sheet) as () => CardEntry;
      for (let i = 0; i < slot.count; i++) {
        const c = next();
        const card: OpenedCard = { name: c.name, isBasicLand: c.isBasicLand, fromSheet: slot.sheet };
        if (c.variant !== undefined) card.variant = c.variant;
        pack.push(card);
      }
    }
    packs.push(pack);
  }
  return packs;
}

/** Convenience: open a single pack. */
export function openPack(set: SetDefinition, opts: OpenOptions = {}): Pack {
  return openPacks(set, 1, opts)[0];
}
