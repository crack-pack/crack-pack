# crackpack

A low-level, dependency-free TypeScript library that simulates **Magic: The Gathering** pack openings *realistically* — by modelling the physical **print-sheet collation** process, not flat rarity odds.

Packs weren't 15 independent random cards. Cards were cut from ordered print sheets in patterns, so a pack contains correlated runs of cards and a box is not 36 independent packs. `crackpack` reproduces that.

> `crackpack` is the collation engine; it ships with a self-contained visual pack-opening demo (`web/pack.html`).

## Status

First set: **Limited Edition Alpha (1993)** — striped collation on three 11×11 sheets.

## Core model

| Concept | Meaning |
| --- | --- |
| `Sheet` | An ordered 11×11 grid of card positions (basic lands are filler, so they can land in any slot). |
| `CollationMethod` | How a sheet is walked into a stream. `striped` (Alpha) is implemented; `sequential` is planned. |
| `stripeCycle` | The repeating stripe-width cycle. Alpha = `[2,3,4,5]`; collation is **deterministic** given the cycle. |
| `PackLayout` | Which sheets feed which slots, in order. Alpha: 11 common + 3 uncommon + 1 rare. |
| assembler | Cuts packs consecutively from continuous per-sheet streams, preserving box-level correlation. |

Alpha's collation is **deterministic**: each sheet is cut by a striped walk whose stripe widths cycle `2, 3, 4, 5`, starting at position 1 = (col 11, row 11); the pattern realigns bottom-right every 14 sheets. The only randomness is where each sheet's stream **starts**, and that start is **pack-aligned** — commons at multiples of 11, uncommons at multiples of 3, rares anywhere — because pack assembly consumes whole groups. The seeded `Rng` picks only those aligned offsets, so openings are reproducible and Monte-Carlo runs repeatable.

## Usage

```ts
import { alpha, openPack, openPacks } from 'crackpack';

const pack = openPack(alpha, { seed: 42 });   // one reproducible pack
const box = openPacks(alpha, 36);              // a correlated 36-pack box (random)
```

Run with Node 22.18+ (no build step — Node strips the types):

```sh
npm test          # sheet + collation tests
npm run demo 42   # open a pack with an optional seed
```

## Data sources & accuracy

Sheet layouts come from [The Collation Project](https://www.lethe.xyz/mtg/collation/) (common sheet) and confirmed observation data (uncommon & rare). Each sheet is checksum-validated against Alpha's known rarity totals (74 / 95 / 116) and basic-land fills.

Confirmed:
- **Collation is deterministic**: stripe widths cycle `2,3,4,5` per stripe from position 1 = (col 11, row 11); the walk reproduces the exact sheet positions read off the physical Alpha sheet and realigns bottom-right on sheet 15. Pack starts are pack-aligned (common ×11, uncommon ×3, rare any).
- Sheet orientation is row 1 = top, column 1 = left, row-major.
- Rare sheet largely matches Beta's; the one Alpha difference — Island `lea/288` (Island A) where Beta had Volcanic Island — is already reflected in the data.
- Alpha never used half-sheet splitting; the engine walks whole 11-row sheets only.

Resolved / validated:
- **Striped walk validated against real pack data.** Six Alpha uncommon pack-opening sequences (from observation notes) each appear as a contiguous run in the constant-width striped walk over the uncommon sheet — confirming both the sheet transcription and the collation algorithm (see `test/collation-observed.test.ts`). One pack matches in reverse because it was filmed upside-down, i.e. pack orientation can flip the observed order.
- The uncommon sheet's `Mountain (C)` (row 7, col 11) was resolved to **Mountain (B)** = Scryfall `lea/293` (Douglas Shuler). Alpha has exactly two Mountains: cn 292 (A) and 293 (B).
