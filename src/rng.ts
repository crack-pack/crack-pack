import type { Rng } from './types.ts';

/**
 * Deterministic, seeded RNG (mulberry32). Small, fast, dependency-free, and
 * good enough for simulation. Same seed always yields the same stream, which
 * is what makes pack openings reproducible and Monte-Carlo runs repeatable.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const nextFloat = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    nextFloat,
    int(minInclusive: number, maxInclusive: number): number {
      return minInclusive + Math.floor(nextFloat() * (maxInclusive - minInclusive + 1));
    },
  };
}
