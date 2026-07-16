# crack-pack

[![npm version](https://img.shields.io/npm/v/crack-pack.svg)](https://www.npmjs.com/package/crack-pack)

A dependency-free TypeScript library that simulates Magic: The Gathering pack
openings **as realistically as the available print-sheet data allows** — by
modelling the physical **print-sheet collation** process rather than flat rarity
odds. Cards are cut from ordered print sheets in a deterministic walk, so a pack
is a correlated run of cards and a box is not N independent packs.

> **How realistic?** Only as realistic as the underlying data. For some sets the
> sheets and collation are validated against real openings; for others the sheet
> data is solid but the collation is assumed or simplified, and one rare sheet is
> reconstructed from a predecessor set. Every such gap is documented, per set, in
> **[ASSUMPTIONS.md](./ASSUMPTIONS.md)** — read it before trusting any given
> set's output. **Help closing these gaps is very welcome — see [Help wanted](#help-wanted).**

## Sets

Twelve sets, from Alpha (1993) through Mirage (1996). For each set's exact
per-sheet structure and how confident we are in its collation (validated /
assumed / simplified / placeholder), see the **[status matrix in
ASSUMPTIONS.md](./ASSUMPTIONS.md#status-matrix)**.

| Code | Set |
| --- | --- |
| `lea` | Limited Edition Alpha (1993) |
| `leb` | Limited Edition Beta (1993) |
| `2ed` | Unlimited Edition (1993) |
| `3ed` | Revised Edition (1994) |
| `4ed` | Fourth Edition (1995) |
| `arn` | Arabian Nights (1993) |
| `atq` | Antiquities (1994) |
| `leg` | Legends (1994) |
| `drk` | The Dark (1994) |
| `fem` | Fallen Empires (1994) |
| `ice` | Ice Age (1995) |
| `mir` | Mirage (1996) |

## Core model

| Type | Meaning |
| --- | --- |
| `Sheet` | Ordered 11×11 grid of card positions; basic lands are filler and can appear in any slot. |
| `CollationMethod` | How a sheet is walked into a stream. Both `striped` and `sequential` (plain row-major read, wrapping) are implemented. |
| `stripeCycle` | Repeating stripe-width cycle (Alpha `[2,3,4,5]`); collation is deterministic given it. Either one cycle for the whole set, or a per-rarity map when sheets stripe differently (Arabian Nights: common `[3,4,5]`, uncommon `[3,4]`). |
| `PackLayout` | Cards drawn per sheet, in order. Booster: 11C / 3U / 1R. Starter: 45C / 13U / 2R. Arabian Nights: 6C / 2U (no rare). |
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

## Install

```sh
npm install crack-pack
```

## Usage

```ts
import { getSet, openPack, openPacks } from 'crack-pack';

const lea = getSet('lea');
const first = openPack(lea, { startPack: 0 }); // the canonical first-ever pack
const box = openPacks(lea, 36, { seed: 42 });  // 36 correlated packs, reproducible
```

Runs on Node 22.18+ with no build step (native TypeScript type-stripping):

```sh
npm test                          # sheet + collation tests
npm run demo 42                   # open an Alpha pack, seeded
npm run demo mir 42               # any set by code
npm run demo lea --start-pack=0   # the canonical first-ever pack (Timetwister)
npm run demo ice --sheet          # draw the sheet with the pack's walk marked on it
npm run demo lea --neighbours     # show packs N-1/N/N+1 as one continuous run
npm run demo lea --find="Timetwister, Psionic Blast"  # which pack was this?
npm run demo lea --copy           # copy the pack to the clipboard (--copy-json for JSON)
npm run demo --help               # all options
```

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
- Revised (3ed) is a base-set reprint with a Beta/Unlimited-like layout (non-land totals 75 / 95 / 121; three basic-land variants A/B/C). Basic lands fill both the common and uncommon sheets; the rare sheet has none (the Beta rare-Islands were removed, so Islands are slightly short-printed). Stripe cycle assumed `[2,3,4,5]` (no explicit cycle in the source).
- No half-sheet splitting; whole 11-row sheets only.
- Arabian Nights has no rare sheet — rarity is emergent from how often a card repeats (common: 16×4 + 9×5 + Desert ×11 + Mountain ×1; uncommon: 33×2 + 17×3 + Oasis ×4, both checksum-validated). 15 common cards have "light"/"dark" versions (the earlier bottom-right 6×6 quadrant), kept verbatim in the sheet data. The two sheets stripe with different width cycles, giving 1694 distinct packs.
- Antiquities is like Arabian Nights: no rare sheet, rarity by repeat count (common: 11×C1 + 5×C2 + 25×C4; uncommon: 26×U1 + 4×U2 + 29×U3, both checksum-validated). Five non-basic lands (Urza's Mine/Power Plant/Tower, Mishra's Factory, Strip Mine) have four art variants each, notated `(A)`–`(D)`. **Stripe widths are provisional** — the sheet grids are validated, but the stripe order (which cards pack together) is assumed equal to Arabian Nights pending validation against a box-opening video.
- Legends has three sheets (common 75, uncommon 114, rare 121 — checksum-validated). Its uncommon sheet is collated as two half-sheets — top 6 rows ("A", incl. Mana Drain) and bottom 5 rows ("B", incl. Karakas) — and a whole box draws uncommons from one half; pass `openPacks(leg, n, { half: 'A' | 'B' })`. **Provisional**: stripe widths assumed `[2,3,4,5]`, and the half split assumed row-major top-6/bottom-5 (doesn't perfectly reproduce the source's "only Hammerheim on both halves"), pending validation against box openings.
- The Dark is like Arabian Nights/Antiquities: no rare sheet, rarity by repeat count (common: 40×C3 + Maze of Ith ×1; uncommon: 43×U2 + 35×U1, both checksum-validated). Its real collation is **variable per box** (sheets may or may not split, with 2–3 independent common sequences, or width-7 stripes when unsplit), so it can't be reproduced deterministically — we model it as a plain two-sheet striped set with an assumed `[2,3,4,5]` cycle. The grids are validated; the pack grouping is a deliberate simplification.
- Fallen Empires: no rare sheet (common: 15×C4 + 20×C3 + Delif's Cone ×1; uncommon: 25×U3 + 5×U2 + 36×U1, checksum-validated). Its commons are **multi-art** — a common has a distinct artwork for each time it appears (C4 → four, C3 → three), notated `(A)`–`(D)`. Like The Dark, the uncommon sheet may or may not split per box, so collation is simplified to a plain two-sheet striped model with an assumed `[2,3,4,5]` cycle.
- Ice Age (121 commons / 121 uncommons / 121 rares) has **real** sheet data for all three rarities. The common and uncommon sheets come from the Collation Project; the **rare sheet was transcribed by hand** from a photo of the uncut rare sheet on [magiclibrarities.net](https://www.magiclibrarities.net/) (the Collation Project page has no rare-sheet gallery), validated so all 121 rares appear exactly once, with positions eyeballed against the photo. Its individual rare *positions* rest on a manual read of a photograph, so a small number could be off by a cell — corrections welcome. Basic/snow-covered lands are on a separate land sheet and don't appear in boosters. Common uses "version 1" of two printings; stripe cycle `[2,3,4,5]` assumed.
- Mirage (110 commons / 110 uncommons / 110 rares, all real grids) had two printings — a US *sequential* one (four common runs) and a Belgian *striped* one. We model the **Belgian striped** printing; the engine now supports sequential collation, but the US printing's multi-run, probabilistic-split assembly isn't modelled yet. Sheets are **10×11** (non-square), so the walk depends on row/column orientation, which the source doesn't pin down — we assume 10 rows × 11 columns. Stripe cycle `[2,3,4,5]` assumed. Basic lands (four variations) aren't in boosters.

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for the full list of modelling assumptions and their validation status.

## Help wanted

**This project is only as accurate as the print-sheet data behind it — and there
are gaps.** If you have specialist knowledge of Magic's print-sheet collation, or
images/data for print sheets or collation patterns we're missing or only
approximating, please **[open an issue or PR](https://github.com/crack-pack/crack-pack/issues)**.

Particularly wanted (see [ASSUMPTIONS.md](./ASSUMPTIONS.md) for details):

- **Missing sheets** — any set's sheets not yet on [The Collation Project](https://www.lethe.xyz/mtg/collation/) (e.g. Chronicles, Homelands, Alliances).
- **Stripe-width sequences** — the real per-sheet widths for **Antiquities**, **Legends**, **The Dark**, **Fallen Empires**, **Mirage** (currently assumed).
- **Collation specifics** — e.g. the **Legends** uncommon half-split orientation, and the **Mirage US** sequential multi-run splits.
- **Anything** — corrections, box-opening footage, or physical-sheet scans that can validate or refine a set.

Contributions and expertise are hugely appreciated — the goal is to make this as realistic as the community's collective knowledge allows.
