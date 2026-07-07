import type { CardEntry, OpenedCard, Pack, Rarity, SetDefinition, Sheet } from './types.ts';
import { makeRng } from './rng.ts';
import { stripedWalk, cyclicWidths, stripedPeriod } from './collation/striped.ts';

const DEFAULT_STRIPE_CYCLE = [2, 3, 4, 5];

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
 * the set's stripe-width cycle, and — crucially — all three sheets start at
 * position 1 together. So a whole pack is fixed by a single **pack index** N:
 * the rare is rare-position N, the uncommons are uncommon-positions 3N…3N+2, the
 * commons are common-positions 11N…11N+10. Pack 0 is the first pack a fresh run
 * ever produces. The only choice is where the run starts (which N); packs are
 * then cut consecutively, reproducing real box-level correlation.
 */
export function openPacks(set: SetDefinition, count: number, opts: OpenOptions = {}): Pack[] {
  if (set.collation !== 'striped') {
    throw new Error(`collation method '${set.collation}' is not implemented yet`);
  }
  const cycle = set.stripeCycle ?? DEFAULT_STRIPE_CYCLE;

  // How many cards each sheet supplies per pack (summed in case a sheet feeds
  // more than one slot).
  const perPack = new Map<Rarity, number>();
  for (const slot of set.layout.slots) {
    perPack.set(slot.sheet, (perPack.get(slot.sheet) ?? 0) + slot.count);
  }

  // The whole pack sequence repeats every `period` packs (rare consumes 1/pack).
  const first = set.sheets[set.layout.slots[0].sheet];
  const period = stripedPeriod(cycle, first.rows, first.cols);

  // Choose the starting pack index. All sheets share it (they are phase-locked,
  // starting together at position 1), which is what ties a rare to its commons
  // and uncommons.
  let startPack: number;
  if (opts.startPack !== undefined) startPack = ((opts.startPack % period) + period) % period;
  else if (opts.seed !== undefined) startPack = makeRng(opts.seed).int(0, period - 1);
  else startPack = Math.floor(Math.random() * period);

  // One deterministic stream per sheet, advanced to the shared pack index.
  const streams = new Map<Rarity, () => CardEntry>();
  for (const slot of set.layout.slots) {
    if (streams.has(slot.sheet)) continue;
    const sheet = set.sheets[slot.sheet];
    const next = stripedWalk(toGrid(sheet), { nextWidth: cyclicWidths(cycle) });
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
