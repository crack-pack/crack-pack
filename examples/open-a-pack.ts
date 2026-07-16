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
import type { CardEntry, OpenedCard, Rarity, Sheet, SetDefinition } from '../src/index.ts';

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

// --- argument parsing ------------------------------------------------------

interface Args {
  code: string;
  seed?: number;
  startPack?: number;
  sheetRarity?: Rarity | 'auto';
  neighboursRarity?: Rarity | 'auto';
  copyText: boolean;
  copyJson: boolean;
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
      case 'copy':
        args.copyText = true;
        break;
      case 'copy-json':
      case 'json':
        args.copyJson = true;
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

// --- clipboard -------------------------------------------------------------

function copyToClipboard(text: string, what: string): void {
  const res = spawnSync('pbcopy', { input: text });
  if (res.error || res.status !== 0) {
    console.log(`\n(couldn't copy ${what} — 'pbcopy' unavailable on this platform)`);
    return;
  }
  console.log(`\n📋 copied ${what} to the clipboard`);
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
  --copy              copy the pack to the clipboard as text
  --copy-json         copy the pack to the clipboard as JSON
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

  const striped = set.collation === 'striped';
  const startPack = striped ? resolveStartPack(set, args) : (args.startPack ?? 0);

  const pack = openPack(set, { startPack });

  console.log(`\n=== Opening one ${set.name} pack (pack ${startPack}) ===\n`);
  for (const rarity of RARITY_ORDER) {
    const cards = pack.filter((c) => c.fromSheet === rarity).map(label);
    if (cards.length) console.log(`${rarity.padEnd(9)} ${cards.join(', ')}`);
  }

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
