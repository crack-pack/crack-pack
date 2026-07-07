import { alpha, openPack, openPacks } from '../src/index.ts';
import type { OpenedCard } from '../src/index.ts';

const label = (c: OpenedCard): string =>
  c.isBasicLand && c.variant ? `${c.name} (${c.variant})` : c.name;

const seed = process.argv[2] ? Number(process.argv[2]) : undefined;

console.log(`\n=== Opening one ${alpha.name} pack${seed !== undefined ? ` (seed ${seed})` : ''} ===\n`);
const pack = openPack(alpha, seed !== undefined ? { seed } : {});
for (const slot of ['common', 'uncommon', 'rare'] as const) {
  const cards = pack.filter((c) => c.fromSheet === slot).map(label);
  console.log(`${slot.padEnd(9)} ${cards.join(', ')}`);
}

// A tiny Monte-Carlo peek: how do the rare-slot cards distribute over a box?
console.log('\n=== Rare slot across a 36-pack box (seed 2026) ===\n');
const box = openPacks(alpha, 36, { seed: 2026 });
const rares = box.map((p) => label(p.find((c) => c.fromSheet === 'rare') as OpenedCard));
for (const name of rares) console.log('  ' + name);
