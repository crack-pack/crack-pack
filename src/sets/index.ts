import type { SetDefinition } from '../types.ts';
import { lea } from './lea/index.ts';
import { leb } from './leb/index.ts';
import { unlimited } from './2ed/index.ts';
import { arn } from './arn/index.ts';
import { atq } from './atq/index.ts';
import { leg } from './leg/index.ts';
import { drk } from './drk/index.ts';

/**
 * All known sets, keyed by their lowercase set code (the Scryfall / MTGJSON
 * code — e.g. `lea` for Limited Edition Alpha). Codes are usually three
 * characters, though a few historical ones differ (e.g. Unlimited is `2ed`).
 */
export const sets: Record<string, SetDefinition> = {
  lea,
  leb,
  '2ed': unlimited,
  arn,
  atq,
  leg,
  drk,
};

/** Look up a set by its code (case-insensitive). Throws if the code is unknown. */
export function getSet(code: string): SetDefinition {
  const set = sets[code.toLowerCase()];
  if (!set) throw new Error(`unknown set code: ${code}`);
  return set;
}
