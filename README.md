# crack-pack

A dependency-free TypeScript library that simulates Magic: The Gathering pack
openings by modelling physical **print-sheet collation** rather than flat rarity
odds. Cards are cut from ordered print sheets in a deterministic striped pattern,
so a pack is a correlated run of cards and a box is not N independent packs.

## Sets

| Code | Set | Collation |
| --- | --- | --- |
| `lea` | Limited Edition Alpha (1993) | striped, three 11×11 sheets |
| `leb` | Limited Edition Beta (1993) | striped, three 11×11 sheets |
| `2ed` | Unlimited Edition (1993) | striped; reuses Beta's sheet layout |

## Core model

| Type | Meaning |
| --- | --- |
| `Sheet` | Ordered 11×11 grid of card positions; basic lands are filler and can appear in any slot. |
| `CollationMethod` | How a sheet is walked into a stream. `striped` implemented; `sequential` planned. |
| `stripeCycle` | Repeating stripe-width cycle (Alpha `[2,3,4,5]`); collation is deterministic given it. |
| `PackLayout` | Cards drawn per sheet, in order. Booster: 11C / 3U / 1R. Starter: 45C / 13U / 2R. |
| `SetDefinition` | `code`, `name`, `sheets`, `layout`, `stripeCycle`; resolved via `getSet(code)` / `sets`. |

### Striped collation

Each sheet is cut by a striped walk: start at position 1 = (col 11, row 11);
take `width` cards up each column; traverse columns right → left; advance the band
up by `width` when a stripe finishes the leftmost column; wrap top→bottom and
across sheets. Widths follow the fixed cycle `2, 3, 4, 5`, so the walk is
deterministic and realigns to position 1 every 14 sheets (1694 cards).

All sheets are phase-locked to one **pack index** `N`: rare = rare-position `N`,
uncommons = uncommon-positions `3N…3N+2`, commons = common-positions `11N…11N+10`.
Pack 0 is the first pack of a fresh run; there are 1694 distinct packs. The only
free choice is `N` — supplied explicitly via `startPack`, or derived from `seed`.

## Usage

```ts
import { getSet, openPack, openPacks } from 'crack-pack';

const lea = getSet('lea');
const first = openPack(lea, { startPack: 0 }); // the canonical first-ever pack
const box = openPacks(lea, 36, { seed: 42 });  // 36 correlated packs, reproducible
```

Runs on Node 22.18+ with no build step (native TypeScript type-stripping):

```sh
npm test          # sheet + collation tests
npm run demo 42   # open a pack
```

## Demo

`node build-web.mjs` generates a self-contained `web/index.html` that opens
booster packs, booster boxes (36), starter decks, and starter boxes (10) across
a set selector (LEA / LEB / 2ED), with card art from Scryfall. The build verifies
the in-page engine reproduces the library's canonical first pack before writing.

## Data & validation

Sheet layouts come from [The Collation Project](https://www.lethe.xyz/mtg/collation/)
and observation data. Each sheet is checksum-validated against known rarity totals
(Alpha: 74 / 95 / 116) and basic-land fills. The striped model is validated against
real pack-opening sequences (`test/collation-observed.test.ts`) and against known
sheet positions and the 14-sheet period (`test/collation-model.test.ts`).

- Orientation: row 1 = top, column 1 = left, row-major.
- Alpha has two basic-land variants (A/B); Beta and Unlimited have three (A/B/C).
- Beta/Unlimited add `Circle of Protection: Black` (common) and `Volcanic Island` (rare); Alpha replaced the latter with a basic Island.
- Unlimited reuses Beta's exact sheet layout and collation (only the printed cards differ — white border).
- No half-sheet splitting; whole 11-row sheets only.
