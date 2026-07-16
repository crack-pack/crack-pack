import { spawnSync } from 'node:child_process';
import {
  getSet,
  makeRng,
  openPack,
  openPacks,
  stripedWalk,
  cyclicWidths,
  stripedPeriod,
} from '../src/index.ts';
import type { CardEntry, OpenedCard, Rarity, Sheet, SetDefinition, SheetHalf } from '../src/index.ts';

// ---------------------------------------------------------------------------
// crack-pack demo — open a pack and explore how it was cut from the print sheet.
//
//   npm run demo                     one Alpha pack (random position)
//   npm run demo 42                  Alpha, seeded (reproducible)
//   npm run demo mir 42              any set by code, seeded
//   npm run demo leg --start-pack 0  open an exact pack index
//   npm run demo ice --sheet         show the sheet with the pack's walk drawn on it
//   npm run demo mir --sheet=rare    visualise a specific rarity's sheet
//   npm run demo --copy              copy the pack to the clipboard as text
//   npm run demo --copy-json         copy the pack as JSON (OpenedCard[])
//   npm run demo --help              usage
// ---------------------------------------------------------------------------

const DEFAULT_STRIPE_CYCLE = [2, 3, 4, 5];
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare'];

const label = (c: OpenedCard | CardEntry): string =>
  c.isBasicLand && c.variant ? `${c.name} (${c.variant})` : c.name;

// Notable packs worth a callout when you happen to open them. Keyed by set code
// then pack index. Anything not listed falls back to the generic pack-0 note.
const FAMOUS: Record<string, Record<number, string>> = {
  lea: {
    0: 'The first pack a fresh Alpha print run ever produced. Because every sheet starts at position 1 together, this exact pack is fixed — and its rare, Timetwister, is the very first card off the rare sheet.',
  },
};

function famousNote(set: SetDefinition, startPack: number): string | null {
  const specific = FAMOUS[set.code]?.[startPack];
  if (specific) return specific;
  if (startPack === 0) return `Pack 0 — the first pack a fresh ${set.name} print run produces (position 1 on every sheet).`;
  return null;
}

// --- argument parsing ------------------------------------------------------

interface Args {
  code: string;
  seed?: number;
  startPack?: number;
  sheetRarity?: Rarity | 'auto';
  neighboursRarity?: Rarity | 'auto';
  reconstructRarity?: Rarity | 'auto';
  /** `--complete` → 'all' (whole set); `--complete=rare` → that rarity. */
  completeArg?: Rarity | 'all';
  /** `--rates` → 'all'; `--rates=common` → that rarity. */
  ratesArg?: Rarity | 'all';
  /** `--diff` → 'auto'; `--diff=orientation` / `--diff=cycle:2,3,4,5`. */
  diffArg?: string;
  /** `--card="Serra Angel"` → find that card's sheet cells and packs. */
  cardArg?: string;
  /** `--csv` → '' (default box size); `--csv=60` → that many packs. */
  csvArg?: string;
  copyText: boolean;
  copyJson: boolean;
  /** `--find="a, b"` → a query string; bare `--find` → true (read clipboard). */
  find?: string | true;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const positionals: string[] = [];
  const args: Args = { code: 'lea', copyText: false, copyJson: false, help: false };

  for (const raw of argv) {
    if (!raw.startsWith('-')) {
      positionals.push(raw);
      continue;
    }
    const [flag, value] = raw.replace(/^--?/, '').split('=', 2);
    switch (flag) {
      case 'help':
      case 'h':
        args.help = true;
        break;
      case 'seed':
        if (value !== undefined) args.seed = Number(value);
        break;
      case 'start-pack':
        if (value !== undefined) args.startPack = Number(value);
        break;
      case 'sheet':
        args.sheetRarity = (value as Rarity) ?? 'auto';
        break;
      case 'neighbours':
      case 'neighbors':
      case 'adjacent':
        args.neighboursRarity = (value as Rarity) ?? 'auto';
        break;
      case 'reconstruct':
      case 'rebuild':
        args.reconstructRarity = (value as Rarity) ?? 'auto';
        break;
      case 'complete':
        args.completeArg = (value as Rarity) ?? 'all';
        break;
      case 'rates':
      case 'pull-rates':
      case 'odds':
        args.ratesArg = (value as Rarity) ?? 'all';
        break;
      case 'diff':
        args.diffArg = value ?? 'auto';
        break;
      case 'card':
      case 'find-card':
        args.cardArg = value ?? '';
        break;
      case 'csv':
      case 'export-csv':
        args.csvArg = value ?? '';
        break;
      case 'copy':
        args.copyText = true;
        break;
      case 'copy-json':
      case 'json':
        args.copyJson = true;
        break;
      case 'find':
        args.find = value ?? true;
        break;
      default:
        console.error(`unknown flag: --${flag}`);
    }
  }

  // First positional is a set code — unless it's all digits, in which case it's
  // a seed for Alpha (preserves the old `npm run demo 42`).
  let rest = positionals;
  if (rest[0] !== undefined && !/^\d+$/.test(rest[0])) {
    args.code = rest[0];
    rest = rest.slice(1);
  }
  // A leftover bare number (and `--start-pack` wasn't given) is a seed.
  if (rest[0] !== undefined && args.seed === undefined && args.startPack === undefined) {
    args.seed = Number(rest[0]);
  }
  return args;
}

// --- collation helpers (mirror assembler.ts so the demo can resolve the same
//     pack index it visualises) -------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

function widthsFor(set: SetDefinition, rarity: Rarity): number[] {
  const s = set.stripeCycle;
  if (s === undefined) return DEFAULT_STRIPE_CYCLE;
  if (Array.isArray(s)) return s;
  return s[rarity] ?? DEFAULT_STRIPE_CYCLE;
}

/** Cards each sheet supplies per pack (a sheet may feed more than one slot). */
function perPackBySheet(set: SetDefinition): Map<Rarity, number> {
  const perPack = new Map<Rarity, number>();
  for (const slot of set.layout.slots) {
    perPack.set(slot.sheet, (perPack.get(slot.sheet) ?? 0) + slot.count);
  }
  return perPack;
}

/** The set's whole-pack period — the LCM of each sheet's pack sub-period. */
function packPeriod(set: SetDefinition): number {
  let period = 1;
  for (const [rarity, n] of perPackBySheet(set)) {
    const sheet = set.sheets[rarity];
    if (!sheet) continue;
    const cp = stripedPeriod(widthsFor(set, rarity), sheet.rows, sheet.cols);
    period = lcm(period, cp / gcd(cp, n));
  }
  return period;
}

/** Resolve the concrete pack index this run will open (so viz + pack agree). */
function resolveStartPack(set: SetDefinition, args: Args): number {
  const period = packPeriod(set);
  if (args.startPack !== undefined) return ((args.startPack % period) + period) % period;
  if (args.seed !== undefined) return makeRng(args.seed).int(0, period - 1);
  return Math.floor(Math.random() * period);
}

// --- pack rendering --------------------------------------------------------

function packToText(set: SetDefinition, pack: OpenedCard[], startPack: number): string {
  const lines = [`${set.name} — pack ${startPack}`];
  for (const rarity of RARITY_ORDER) {
    const cards = pack.filter((c) => c.fromSheet === rarity).map(label);
    if (cards.length) lines.push(`${rarity.padEnd(9)} ${cards.join(', ')}`);
  }
  return lines.join('\n');
}

// --- sheet + walk-path visualization --------------------------------------

/** Row-major card list → 2-D grid (same layout the assembler walks). */
function toGrid(sheet: Sheet): CardEntry[][] {
  const grid: CardEntry[][] = [];
  for (let r = 0; r < sheet.rows; r++) {
    grid.push(sheet.cards.slice(r * sheet.cols, (r + 1) * sheet.cols));
  }
  return grid;
}

/**
 * The walk's (row, col) sequence for one full period of a sheet. We reuse the
 * REAL walk: stripedWalk returns the exact grid cell object by reference, so a
 * Map keyed on cell identity turns each returned card back into its coordinate.
 */
function walkPath(sheet: Sheet, cycle: number[]): { order: Array<{ r: number; c: number }>; period: number } {
  const grid = toGrid(sheet);
  const coordOf = new Map<CardEntry, { r: number; c: number }>();
  grid.forEach((row, r) => row.forEach((card, c) => coordOf.set(card, { r, c })));

  const period = stripedPeriod(cycle, sheet.rows, sheet.cols);
  const next = stripedWalk(grid, { nextWidth: cyclicWidths(cycle) });
  const order: Array<{ r: number; c: number }> = [];
  for (let i = 0; i < period; i++) order.push(coordOf.get(next())!);
  return { order, period };
}

/** The cells feeding one pack's slot for a rarity, in draw order (handles wrap). */
function packCoords(
  order: Array<{ r: number; c: number }>,
  period: number,
  perPack: number,
  packIndex: number,
): Array<{ r: number; c: number }> {
  const base = (((perPack * packIndex) % period) + period) % period;
  const out: Array<{ r: number; c: number }> = [];
  for (let i = 0; i < perPack; i++) out.push(order[(base + i) % period]);
  return out;
}

function renderSheet(set: SetDefinition, rarity: Rarity, startPack: number): void {
  const sheet = set.sheets[rarity];
  if (!sheet) {
    console.log(`\n(${set.name} has no ${rarity} sheet.)`);
    return;
  }
  const perPack = perPackBySheet(set).get(rarity) ?? 0;
  const { order, period } = walkPath(sheet, widthsFor(set, rarity));
  const coords = packCoords(order, period, perPack, startPack);

  // cell "r,c" -> 1-based draw order.
  const pick = new Map<string, number>();
  coords.forEach(({ r, c }, i) => pick.set(`${r},${c}`, i + 1));

  console.log(
    `\n=== ${set.name} — ${rarity} sheet (${sheet.rows}×${sheet.cols}), pack ${startPack}'s ${perPack} ${rarity}s ===\n`,
  );
  console.log('(numbers = the order these cards are cut into the pack; the stripe walks up each column, right→left)\n');

  const grid = toGrid(sheet);
  for (let r = 0; r < sheet.rows; r++) {
    let line = '';
    for (let c = 0; c < sheet.cols; c++) {
      const n = pick.get(`${r},${c}`);
      line += n !== undefined ? String(n).padStart(3) : '  ·';
    }
    console.log(line);
  }

  console.log('\n  drawn in order:');
  coords.forEach(({ r, c }, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${label(grid[r][c])}  (row ${r + 1}, col ${c + 1})`);
  });
}

/**
 * Adjacent-pack reveal: draw the sheet with THREE consecutive packs (N-1, N,
 * N+1) marked. Consecutive packs never share a card — each cell is cut once per
 * period — but their cells are contiguous, so the three runs snake up the sheet
 * as one continuous walk. That physical correlation is the whole point of the
 * library (a box is not 36 independent packs).
 */
function renderNeighbours(set: SetDefinition, rarity: Rarity, startPack: number): void {
  const sheet = set.sheets[rarity];
  if (!sheet) {
    console.log(`\n(${set.name} has no ${rarity} sheet.)`);
    return;
  }
  const perPack = perPackBySheet(set).get(rarity) ?? 0;
  const { order, period } = walkPath(sheet, widthsFor(set, rarity));
  const grid = toGrid(sheet);

  const prev = packCoords(order, period, perPack, startPack - 1);
  const here = packCoords(order, period, perPack, startPack);
  const next = packCoords(order, period, perPack, startPack + 1);

  // cell "r,c" -> marker. The focus pack shows draw order; neighbours show < / >.
  const mark = new Map<string, string>();
  for (const { r, c } of prev) mark.set(`${r},${c}`, '  <');
  for (const { r, c } of next) mark.set(`${r},${c}`, '  >');
  here.forEach(({ r, c }, i) => mark.set(`${r},${c}`, String(i + 1).padStart(3)));

  console.log(
    `\n=== ${set.name} — ${rarity} sheet: packs ${startPack - 1} · ${startPack} · ${startPack + 1} ===\n`,
  );
  console.log('(< = previous pack   1..n = this pack, in draw order   > = next pack)');
  console.log('three consecutive packs cut one continuous run up the sheet — no card is shared\n');

  for (let r = 0; r < sheet.rows; r++) {
    let line = '';
    for (let c = 0; c < sheet.cols; c++) line += mark.get(`${r},${c}`) ?? '  ·';
    console.log(line);
  }

  const names = (coords: Array<{ r: number; c: number }>): string =>
    coords.map(({ r, c }) => label(grid[r][c])).join(', ');
  console.log(`\n  pack ${startPack - 1} (<): ${names(prev)}`);
  console.log(`  pack ${startPack} (this): ${names(here)}`);
  console.log(`  pack ${startPack + 1} (>): ${names(next)}`);
}

/**
 * Reconstruct a whole print sheet purely from opened packs — the "…and it runs
 * backwards" proof. Draw a full period of one rarity's cards from consecutive
 * packs, drop each card back onto its walk coordinate, and show the original
 * sheet reappears: every cell recovered exactly once, matching the source, and
 * every repeat draw agreeing (which is what "deterministic collation" means).
 */
function renderReconstruct(set: SetDefinition, rarity: Rarity, half: SheetHalf): void {
  const sheet = set.sheets[rarity];
  if (!sheet) {
    console.log(`\n(${set.name} has no ${rarity} sheet.)`);
    return;
  }
  if (set.splitSheets?.[rarity]) {
    console.log(`\n(sheet reconstruction skips split sheets; ${set.name}'s ${rarity} sheet is collated in halves.)`);
    return;
  }
  const perPack = perPackBySheet(set).get(rarity) ?? 0;
  const { order, period } = walkPath(sheet, widthsFor(set, rarity));
  const total = sheet.rows * sheet.cols;

  // Draw a full period of this rarity's cards from consecutive packs (from pack 0).
  const packsToOpen = Math.ceil(period / perPack);
  const stream: string[] = [];
  for (const p of openPacks(set, packsToOpen, { startPack: 0, half })) {
    for (const c of p) if (c.fromSheet === rarity) stream.push(label(c));
  }

  // Drop each drawn card back onto its walk coordinate.
  const recon: (string | null)[] = new Array(total).fill(null);
  let filled = 0;
  let coverAt = -1;
  let clashes = 0; // a cell that emitted two different cards → NOT deterministic
  for (let i = 0; i < stream.length; i++) {
    const { r, c } = order[i % period];
    const key = r * sheet.cols + c;
    if (recon[key] === null) {
      recon[key] = stream[i];
      if (++filled === total) coverAt = i;
    } else if (recon[key] !== stream[i]) {
      clashes++;
    }
  }
  const packsToCover = coverAt >= 0 ? Math.ceil((coverAt + 1) / perPack) : packsToOpen;

  // Compare the reconstruction against the real sheet.
  const grid = toGrid(sheet);
  let mismatches = 0;
  for (let r = 0; r < sheet.rows; r++) {
    for (let c = 0; c < sheet.cols; c++) if (recon[r * sheet.cols + c] !== label(grid[r][c])) mismatches++;
  }

  console.log(`\n=== Rebuilding ${set.name}'s ${rarity} sheet (${sheet.rows}×${sheet.cols}) from packs alone ===\n`);
  console.log(
    `opened ${packsToOpen} consecutive packs from pack 0 (${stream.length} ${rarity}s); all ${total} sheet ` +
      `positions were recovered after the first ${packsToCover} packs — the rest are repeats.\n`,
  );

  // Coverage grid: every cell should come back as ✓.
  for (let r = 0; r < sheet.rows; r++) {
    let line = '';
    for (let c = 0; c < sheet.cols; c++) line += recon[r * sheet.cols + c] !== null ? '  ✓' : '  ·';
    console.log(line);
  }

  console.log('');
  if (filled === total && mismatches === 0 && clashes === 0) {
    console.log(
      `✓ lossless: every cell recovered exactly once, the rebuilt sheet matches the original, and all ` +
        `${stream.length - total} repeat draws agreed — the collation is fully deterministic.`,
    );
  } else {
    console.log(`✗ ${total - filled} cells missing · ${mismatches} differ from the original · ${clashes} inconsistent repeats.`);
  }
  console.log(`\n  rebuilt row 1: ${grid[0].map((_, c) => recon[c]).join(' · ')}`);
}

/**
 * "Complete the set" walk: how many consecutive packs (from pack 0) until every
 * distinct card of a rarity — and of the whole set — has been seen at least
 * once. Because collation is deterministic this is a FIXED number, far below
 * the coupon-collector expectation a uniform-random opener would face. The
 * target ("all distinct cards") is taken from a full period, so short-printed
 * cards and split sheets (which reduce the reachable pool) are handled honestly.
 */
function renderComplete(set: SetDefinition, only: Rarity | undefined): void {
  const half: SheetHalf = 'A';
  const period = packPeriod(set);
  const packs = openPacks(set, period, { startPack: 0, half });

  const rarities = (only ? [only] : [...perPackBySheet(set).keys()])
    .filter((r) => set.sheets[r])
    .sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));

  const harmonic = (n: number): number => {
    let h = 0;
    for (let i = 1; i <= n; i++) h += 1 / i;
    return h;
  };

  console.log(`\n=== Completing ${set.name} from pack 0${only ? ` (${only} only)` : ''} ===\n`);

  const rows: Array<{ rarity: Rarity; target: number; perPack: number; packsN: number }> = [];
  for (const rarity of rarities) {
    const perPack = perPackBySheet(set).get(rarity) ?? 0;
    const target = new Set<string>();
    for (const p of packs) for (const c of p) if (c.fromSheet === rarity) target.add(label(c));

    const seen = new Set<string>();
    let at = 0;
    for (let i = 0; i < packs.length; i++) {
      for (const c of packs[i]) if (c.fromSheet === rarity) seen.add(label(c));
      if (seen.size === target.size) {
        at = i + 1;
        break;
      }
    }
    const split = set.splitSheets?.[rarity] ? ' (half A)' : '';
    console.log(`  ${rarity.padEnd(9)} ${String(target.size).padStart(3)} distinct${split} · complete after ${at} packs`);
    rows.push({ rarity, target: target.size, perPack, packsN: at });
  }

  const bind = rows.reduce((a, b) => (b.packsN > a.packsN ? b : a));
  const est = Math.round((bind.target * harmonic(bind.target)) / bind.perPack);
  console.log(
    `\n→ ${only ? `every ${only}` : 'every card in the set'} seen after ${bind.packsN} consecutive packs — ` +
      `fixed, because collation is deterministic (bound by the ${bind.rarity} slot).`,
  );
  console.log(`  a uniform-random opener would expect ~${est} packs for that slot (coupon-collector).`);
}

/**
 * Pull-rate table: the real per-pack odds each card has under the collation
 * model, grouped by how many times it's printed on the sheet. Measured
 * exactly by scanning the full period of distinct packs. The point: a card's
 * chance is proportional to its print count — a card printed 4× is 4× as
 * likely as a singly-printed one — which flat per-card rarity odds miss.
 */
function renderRates(set: SetDefinition, only: Rarity | undefined): void {
  const half: SheetHalf = 'A';
  const N = packPeriod(set);
  const packs = openPacks(set, N, { startPack: 0, half });

  const rarities = (only ? [only] : [...perPackBySheet(set).keys()])
    .filter((r) => set.sheets[r])
    .sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));

  console.log(`\n=== ${set.name} pull rates — measured over ${N} distinct packs ===`);

  for (const rarity of rarities) {
    const sheet = set.sheets[rarity] as Sheet;
    const perPack = perPackBySheet(set).get(rarity) ?? 0;

    // How many times each card is printed on the sheet.
    const printed = new Map<string, number>();
    for (const cell of sheet.cards) printed.set(label(cell), (printed.get(label(cell)) ?? 0) + 1);

    // Appearances and packs-containing, measured across the period.
    const appears = new Map<string, number>();
    const inPack = new Map<string, number>();
    for (const p of packs) {
      const here = new Set<string>();
      for (const c of p) {
        if (c.fromSheet !== rarity) continue;
        const L = label(c);
        appears.set(L, (appears.get(L) ?? 0) + 1);
        here.add(L);
      }
      for (const L of here) inPack.set(L, (inPack.get(L) ?? 0) + 1);
    }

    // Group by print count (skip cards that can't appear — e.g. the other half).
    const tiers = new Map<number, { cards: number; prob: number; copies: number }>();
    for (const [L, count] of printed) {
      if (!inPack.has(L)) continue;
      const t = tiers.get(count) ?? { cards: 0, prob: 0, copies: 0 };
      t.cards += 1;
      t.prob += (inPack.get(L) ?? 0) / N;
      t.copies += (appears.get(L) ?? 0) / N;
      tiers.set(count, t);
    }

    const split = set.splitSheets?.[rarity] ? ' (half A)' : '';
    console.log(`\n  ${rarity} sheet${split} — ${sheet.rows * sheet.cols} cells, ${perPack} drawn/pack`);
    console.log('    printed   cards   chance/pack   avg copies/pack');
    for (const count of [...tiers.keys()].sort((a, b) => a - b)) {
      const t = tiers.get(count) as { cards: number; prob: number; copies: number };
      const chance = ((t.prob / t.cards) * 100).toFixed(1) + '%';
      const copies = (t.copies / t.cards).toFixed(3);
      console.log(`    ${(count + '×').padStart(5)}   ${String(t.cards).padStart(5)}   ${chance.padStart(9)}   ${copies.padStart(13)}`);
    }
  }
  console.log('\n  → flat per-card odds treat every card as equal; collation makes the chance scale with print count.');
}

/**
 * Assumption A/B diff: open the same pack index under the set's default and
 * under a variant assumption, then diff the cards. Makes the 🔴 provisional
 * choices in ASSUMPTIONS.md tangible — you see exactly what changes if we
 * guessed the sheet orientation or stripe cycle wrong.
 *   --diff=orientation      swap rows/cols (non-square sheets, e.g. Mirage)
 *   --diff=cycle:2,3,4,5     use a different stripe-width cycle
 */
function buildVariant(set: SetDefinition, spec: string): { set?: SetDefinition; desc?: string; error?: string } {
  if (spec === 'auto' || spec === 'orientation') {
    const nonSquare = RARITY_ORDER.some((r) => {
      const sh = set.sheets[r];
      return sh !== undefined && sh.rows !== sh.cols;
    });
    if (!nonSquare) return { error: `${set.name}'s sheets are square, so orientation is unambiguous — try --diff=cycle:W,W,...` };
    const sheets = { ...set.sheets };
    for (const r of RARITY_ORDER) {
      const sh = set.sheets[r];
      if (sh) sheets[r] = { ...sh, rows: sh.cols, cols: sh.rows };
    }
    const sample = RARITY_ORDER.map((r) => set.sheets[r]).find(Boolean) as Sheet;
    return { set: { ...set, sheets }, desc: `orientation ${sample.cols}×${sample.rows} (rows/cols swapped)` };
  }
  if (spec.startsWith('cycle:')) {
    const cyc = spec
      .slice(6)
      .split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!cyc.length) return { error: 'bad --diff=cycle spec; use e.g. --diff=cycle:2,3,4,5' };
    return { set: { ...set, stripeCycle: cyc }, desc: `stripe cycle [${cyc.join(',')}]` };
  }
  return { error: `unknown --diff spec '${spec}'; use 'orientation' or 'cycle:W,W,...'` };
}

function renderDiff(set: SetDefinition, startPack: number, spec: string): void {
  const v = buildVariant(set, spec);
  if (v.error || !v.set) {
    console.log(`\n(${v.error})`);
    return;
  }
  const A = openPack(set, { startPack, half: 'A' });
  const B = openPack(v.set, { startPack, half: 'A' });

  console.log(`\n=== ${set.name} pack ${startPack} — default vs ${v.desc} ===\n`);
  let diffs = 0;
  let slots = 0;
  for (const rarity of RARITY_ORDER) {
    const a = A.filter((c) => c.fromSheet === rarity).map(label);
    const b = B.filter((c) => c.fromSheet === rarity).map(label);
    if (!a.length && !b.length) continue;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      slots++;
      if (a[i] !== b[i]) diffs++;
    }
    const mark = (xs: string[], other: string[]): string => xs.map((x, i) => (x === other[i] ? x : `${x} *`)).join(', ');
    console.log(`${rarity.padEnd(9)} A: ${mark(a, b)}`);
    console.log(`${' '.repeat(9)} B: ${mark(b, a)}`);
  }
  console.log(
    `\n${diffs} of ${slots} slots differ (* = changed). ` +
      (diffs
        ? 'The assumption is not neutral — it changes which cards land in the pack.'
        : 'The two assumptions happen to agree for this pack.'),
  );
}

/**
 * Find-my-card: given a name, show every cell it occupies (across all rarity
 * sheets — basic lands appear as filler on several) and every pack index in
 * the period that contains it. Matches on the variant-stripped key, so "Island"
 * finds all its variants.
 */
function renderFindCard(set: SetDefinition, query: string): void {
  const key = nameKey(query);
  console.log(`\n=== Finding "${query}" in ${set.name} ===\n`);

  // Sheet cells, grouped by rarity.
  const cells: Record<string, string[]> = {};
  for (const rarity of RARITY_ORDER) {
    const sheet = set.sheets[rarity];
    if (!sheet) continue;
    for (let i = 0; i < sheet.cards.length; i++) {
      if (nameKey(label(sheet.cards[i])) !== key) continue;
      (cells[rarity] ??= []).push(`row ${Math.floor(i / sheet.cols) + 1}, col ${(i % sheet.cols) + 1}`);
    }
  }
  const found = Object.keys(cells).length > 0;
  if (!found) {
    console.log('  not found on any sheet — check the spelling and set code.');
    return;
  }
  for (const rarity of RARITY_ORDER) {
    if (cells[rarity]) console.log(`  ${rarity} sheet (${cells[rarity].length}×): ${cells[rarity].join(' · ')}`);
  }

  // Pack membership over the full period.
  const N = packPeriod(set);
  const packs = openPacks(set, N, { startPack: 0, half: 'A' });
  const hits: number[] = [];
  for (let n = 0; n < packs.length; n++) {
    if (packs[n].some((c) => nameKey(label(c)) === key)) hits.push(n);
  }
  const sample = hits.slice(0, 12).join(', ');
  const split = set.splitSheets ? ' (uncommon half A)' : '';
  console.log(
    `\n  appears in ${hits.length} of ${N} packs${split} — e.g. ${sample}${hits.length > 12 ? ', …' : ''}`,
  );
}

/** The walk over a rarity's grid, using the chosen half for a split sheet. */
function walkForRarity(set: SetDefinition, rarity: Rarity, half: SheetHalf): { order: Array<{ r: number; c: number }>; period: number } {
  const sheet = set.sheets[rarity] as Sheet;
  const split = set.splitSheets?.[rarity];
  let rows = sheet.rows;
  let cards = sheet.cards;
  if (split) {
    if (half === 'A') {
      rows = split.topRows;
      cards = sheet.cards.slice(0, split.topRows * sheet.cols);
    } else {
      rows = sheet.rows - split.topRows;
      cards = sheet.cards.slice(split.topRows * sheet.cols);
    }
  }
  return walkPath({ rarity, rows, cols: sheet.cols, cards }, widthsFor(set, rarity));
}

/** Escape a CSV field (quote if it contains a comma, quote, or newline). */
function csvField(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Box CSV export: dump `count` consecutive packs (from `start`) as CSV, one row
 * per card — pack index, slot, card, and its sheet position (row/col + walk
 * position). Prints only the CSV, so `npm run demo lea --csv > box.csv` works.
 * Pack and walk indices are 0-based/1-based to match the rest of the CLI.
 */
function emitBoxCsv(set: SetDefinition, start: number, count: number, half: SheetHalf): void {
  const perPack = perPackBySheet(set);
  const walks = new Map<Rarity, { order: Array<{ r: number; c: number }>; period: number }>();
  for (const rarity of perPack.keys()) walks.set(rarity, walkForRarity(set, rarity, half));

  const lines = ['pack,slot,slot_index,card,is_land,sheet_row,sheet_col,walk_pos'];
  const packs = openPacks(set, count, { startPack: start, half });
  packs.forEach((pack, i) => {
    const packIndex = start + i;
    const counters = new Map<Rarity, number>();
    for (const c of pack) {
      const rarity = c.fromSheet;
      const j = counters.get(rarity) ?? 0;
      counters.set(rarity, j + 1);
      const w = walks.get(rarity) as { order: Array<{ r: number; c: number }>; period: number };
      const idx = ((perPack.get(rarity) as number) * packIndex + j) % w.period;
      const { r, c: col } = w.order[idx];
      lines.push(
        [packIndex, rarity, j + 1, csvField(label(c)), c.isBasicLand, r + 1, col + 1, idx + 1].join(','),
      );
    }
  });
  console.log(lines.join('\n'));
}

// --- clipboard -------------------------------------------------------------

function copyToClipboard(text: string, what: string): void {
  const res = spawnSync('pbcopy', { input: text });
  if (res.error || res.status !== 0) {
    console.log(`\n(couldn't copy ${what} — 'pbcopy' unavailable on this platform)`);
    return;
  }
  console.log(`\n📋 copied ${what} to the clipboard`);
}

function readClipboard(): string | undefined {
  const res = spawnSync('pbpaste', { encoding: 'utf8' });
  if (res.error || res.status !== 0) return undefined;
  return res.stdout;
}

// --- reverse lookup: which pack did these cards come from? -----------------

/** Card name → comparison key: lowercased, trailing "(variant/art)" suffix dropped. */
function nameKey(name: string): string {
  return name.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Pull card names out of a query string. Accepts a bare comma list
 * ("Timetwister, Psionic Blast") or the multi-line text `--copy` produces
 * (a "Set — pack N" header + "common …/uncommon …/rare …" lines).
 */
function parseFindQuery(text: string): string[] {
  const names: string[] = [];
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;
    if (line.includes('—') || /\bpack\b/i.test(line)) continue; // header line
    line = line.replace(/^(common|uncommon|rare)\b\s*/i, ''); // slot label
    for (const part of line.split(',')) {
      const name = part.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/** Is the query multiset a subset of the pack's card keys? */
function packContains(packKeys: string[], queryKeys: string[]): boolean {
  const pool = [...packKeys];
  for (const q of queryKeys) {
    const i = pool.indexOf(q);
    if (i === -1) return false;
    pool.splice(i, 1);
  }
  return true;
}

function reverseLookup(set: SetDefinition, queryNames: string[]): void {
  if (set.collation !== 'striped') {
    console.log(`\n(reverse lookup supports striped collation only; ${set.name} is ${set.collation})`);
    return;
  }
  const queryKeys = queryNames.map(nameKey);
  console.log(`\n=== Where in ${set.name}'s print run did this come from? ===\n`);
  console.log(`  looking for: ${queryNames.join(', ')}`);

  const period = packPeriod(set);
  const halves: SheetHalf[] = set.splitSheets ? ['A', 'B'] : ['A'];
  const matches: Array<{ n: number; half: SheetHalf }> = [];
  for (const half of halves) {
    const packs = openPacks(set, period, { startPack: 0, half });
    packs.forEach((pack, n) => {
      if (packContains(pack.map((c) => nameKey(label(c))), queryKeys)) matches.push({ n, half });
    });
  }

  if (matches.length === 0) {
    console.log('\n  no matching pack — check the set code and card spellings.');
    return;
  }
  if (matches.length > 1) {
    const shown = matches.slice(0, 8).map((m) => `${m.n}${halves.length > 1 ? ` (half ${m.half})` : ''}`);
    console.log(`\n  ${matches.length} packs match — add more cards (especially commons) to pin it down:`);
    console.log(`  ${shown.join(', ')}${matches.length > shown.length ? ', …' : ''}`);
    return;
  }

  // Unique match → show it and its neighbours.
  const { n, half } = matches[0];
  console.log(`\n  ✓ pack ${n}${halves.length > 1 ? ` (uncommon half ${half})` : ''} of ${period}`);
  for (const [idx, tag] of [
    [n - 1, 'before'],
    [n, 'THIS pack'],
    [n + 1, 'after'],
  ] as const) {
    const p = openPack(set, { startPack: ((idx % period) + period) % period, half });
    console.log(`\n  pack ${((idx % period) + period) % period} (${tag}):`);
    for (const rarity of RARITY_ORDER) {
      const cards = p.filter((c) => c.fromSheet === rarity).map(label);
      if (cards.length) console.log(`    ${rarity.padEnd(9)} ${cards.join(', ')}`);
    }
  }
}

// --- main ------------------------------------------------------------------

const HELP = `crack-pack demo — open a pack and see how it was cut from the print sheet

usage: npm run demo [set] [seed] [options]

  set                 set code (lea, leb, 2ed, arn, atq, 3ed, 4ed, leg, drk,
                      fem, ice, mir). default: lea
  seed                integer; reproducible random pack

options:
  --seed=N            same as the positional seed
  --start-pack=N      open an exact pack index (0 = first-ever pack)
  --sheet[=rarity]    draw the sheet with this pack's walk marked on it
                      (rarity: common|uncommon|rare; default: the biggest slot)
  --neighbours[=rar]  draw the sheet with packs N-1, N, N+1 marked, showing
                      how consecutive packs cut one continuous run
  --reconstruct[=rar] rebuild the whole print sheet from opened packs alone,
                      proving the collation is lossless and deterministic
  --complete[=rar]    how many consecutive packs to see every distinct card
                      (fixed, vs a random opener's coupon-collector estimate)
  --rates[=rar]       per-pack pull rates grouped by print count, showing
                      odds scale with how many times a card is printed
  --diff=<spec>       open this pack under a variant assumption and diff it;
                      spec: 'orientation' or 'cycle:W,W,...' (see ASSUMPTIONS)
  --card="Name"       show a card's sheet cell(s) and every pack containing it
  --csv[=packs]       dump a box as CSV (pack, slot, card, sheet position);
                      prints only CSV, so 'npm run demo lea --csv > box.csv'
  --copy              copy the pack to the clipboard as text
  --copy-json         copy the pack to the clipboard as JSON
  --find="a, b, …"    reverse lookup: find which pack these cards came from
                      (bare --find reads the clipboard — pairs with --copy)
  --help              this message`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  let set: SetDefinition;
  try {
    set = getSet(args.code);
  } catch {
    console.error(`unknown set code '${args.code}'. try one of: lea leb 2ed arn atq 3ed 4ed leg drk fem ice mir`);
    process.exitCode = 1;
    return;
  }

  // Reverse-lookup mode: find which pack a set of cards came from, then stop.
  if (args.find !== undefined) {
    const text = args.find === true ? readClipboard() : args.find;
    if (!text) {
      console.error("--find: nothing to search (clipboard empty or 'pbpaste' unavailable). Try --find=\"Card A, Card B\".");
      process.exitCode = 1;
      return;
    }
    const query = parseFindQuery(text);
    if (query.length === 0) {
      console.error('--find: no card names found in the query.');
      process.exitCode = 1;
      return;
    }
    reverseLookup(set, query);
    return;
  }

  const striped = set.collation === 'striped';
  const startPack = striped ? resolveStartPack(set, args) : (args.startPack ?? 0);

  // CSV export mode: emit only the CSV (redirectable), then stop.
  if (args.csvArg !== undefined) {
    if (!striped) {
      console.error(`--csv supports striped collation only; ${set.name} is ${set.collation}`);
      process.exitCode = 1;
      return;
    }
    const count = Number(args.csvArg) > 0 ? Math.floor(Number(args.csvArg)) : 36;
    emitBoxCsv(set, startPack, count, 'A');
    return;
  }

  const pack = openPack(set, { startPack });

  console.log(`\n=== Opening one ${set.name} pack (pack ${startPack}) ===\n`);
  for (const rarity of RARITY_ORDER) {
    const cards = pack.filter((c) => c.fromSheet === rarity).map(label);
    if (cards.length) console.log(`${rarity.padEnd(9)} ${cards.join(', ')}`);
  }
  const famous = famousNote(set, startPack);
  if (famous) console.log(`\n★ ${famous}`);

  // biggest slot → the most illustrative walk (used for auto sheet/neighbours).
  const biggestSlot = (): Rarity => [...perPackBySheet(set).entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Sheet visualization ----------------------------------------------------
  if (args.sheetRarity !== undefined) {
    if (!striped) {
      console.log(`\n(sheet visualization supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderSheet(set, args.sheetRarity === 'auto' ? biggestSlot() : args.sheetRarity, startPack);
    }
  }

  // Adjacent-pack reveal ---------------------------------------------------
  if (args.neighboursRarity !== undefined) {
    if (!striped) {
      console.log(`\n(adjacent-pack reveal supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderNeighbours(set, args.neighboursRarity === 'auto' ? biggestSlot() : args.neighboursRarity, startPack);
    }
  }

  // Sheet reconstruction ---------------------------------------------------
  if (args.reconstructRarity !== undefined) {
    if (!striped) {
      console.log(`\n(sheet reconstruction supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderReconstruct(set, args.reconstructRarity === 'auto' ? biggestSlot() : args.reconstructRarity, 'A');
    }
  }

  // "Complete the set" walk ------------------------------------------------
  if (args.completeArg !== undefined) {
    if (!striped) {
      console.log(`\n("complete the set" supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderComplete(set, args.completeArg === 'all' ? undefined : args.completeArg);
    }
  }

  // Pull-rate table --------------------------------------------------------
  if (args.ratesArg !== undefined) {
    if (!striped) {
      console.log(`\n(pull rates support striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderRates(set, args.ratesArg === 'all' ? undefined : args.ratesArg);
    }
  }

  // Assumption A/B diff ----------------------------------------------------
  if (args.diffArg !== undefined) {
    if (!striped) {
      console.log(`\n(assumption diff supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderDiff(set, startPack, args.diffArg);
    }
  }

  // Find-my-card -----------------------------------------------------------
  if (args.cardArg !== undefined) {
    if (!args.cardArg) {
      console.error('--card: give a name, e.g. --card="Serra Angel"');
      process.exitCode = 1;
    } else if (!striped) {
      console.log(`\n(find-my-card supports striped collation only; ${set.name} is ${set.collation})`);
    } else {
      renderFindCard(set, args.cardArg);
    }
  }

  // A tiny Monte-Carlo peek: how does the rarest slot distribute over a box?
  const headline = [...perPackBySheet(set).keys()].sort(
    (a, b) => RARITY_ORDER.indexOf(b) - RARITY_ORDER.indexOf(a),
  )[0];
  console.log(`\n=== ${headline} slot across a 36-pack box (seed 2026) ===\n`);
  const box = openPacks(set, 36, { seed: 2026 });
  for (const p of box) {
    const card = p.find((c) => c.fromSheet === headline);
    if (card) console.log('  ' + label(card));
  }

  // Clipboard --------------------------------------------------------------
  if (args.copyText) copyToClipboard(packToText(set, pack, startPack), 'pack (text)');
  if (args.copyJson) copyToClipboard(JSON.stringify(pack, null, 2), 'pack (JSON)');
}

main();
