# Modelling assumptions

`crack-pack` reproduces physical print-sheet collation. Some of that is firmly
established (validated against observed pack openings, framed sheet replicas, or
the source's own checksums); some is a reasonable modelling choice; and some is a
deliberate placeholder awaiting validation. This file tracks all of it so nothing
provisional is mistaken for confirmed.

**Can you help close a gap?** If you have specialist knowledge of MtG print-sheet
collation, or images/data for any sheet or collation pattern marked 🟡 or 🔴
below, please [open an issue or PR](https://github.com/crack-pack/crack-pack/issues).
See the project's "Help wanted" section for what's most needed.

**Status legend**

- ✅ **Validated** — checked against real pack openings, physical sheet replicas, or the source's stated checksums.
- 🟡 **Assumed** — a reasonable modelling choice, consistent with the source but not independently confirmed.
- 🔴 **Provisional** — an explicit placeholder, pending a named validation source.

Sheet **card grids** for every set are ✅ checksum-validated against the source's
stated rarity frequencies. Where a set is marked provisional, it's the
**collation order** (which cards land together in a pack), not the grid contents,
that is unconfirmed.

---

## Status matrix

At-a-glance status per set. **Sheet data** = are the print sheets themselves real
(vs a placeholder); **Collation** = is the walk/stripe pattern validated,
assumed, or simplified. Per-sheet detail is given where sheets or stripe patterns
differ between rarities, or where a sheet is split. See the per-set sections
below for the full story.

| Set (year) | Sheets | Collation | Sheet data | Collation |
|---|---|---|---|---|
| `lea` — Alpha (1993) | rare 11×11 · uncommon 11×11 · common 11×11 | striped — all sheets `[2,3,4,5]` | ✅ validated | ✅ validated |
| `leb` — Beta (1993) | rare 11×11 · uncommon 11×11 · common 11×11 | striped — all sheets `[2,3,4,5]` | ✅ validated | 🟡 assumed (cycle as Alpha) |
| `2ed` — Unlimited (1993) | rare 11×11 · uncommon 11×11 · common 11×11 (Beta layout) | striped — all sheets `[2,3,4,5]` | ✅ validated (reuses Beta) | 🟡 assumed |
| `3ed` — Revised (1994) | rare 11×11 · uncommon 11×11 · common 11×11 | striped — all sheets `[2,3,4,5]` | ✅ validated | 🟡 assumed |
| `arn` — Arabian Nights (1993) | uncommon 11×11 · common 11×11 (no rare sheet) | striped — common `[3,4,5]`, uncommon `[3,4]` | ✅ validated | 🟡 modelled approximation |
| `atq` — Antiquities (1994) | uncommon 11×11 · common 11×11 (no rare sheet) | striped — common `[3,4,5]`, uncommon `[3,4]` | ✅ validated | 🔴 provisional (assumed = ARN) |
| `leg` — Legends (1994) | rare 11×11 · uncommon 11×11 (half-split: top-6 "A" / bottom-5 "B") · common 11×11 | striped — all sheets `[2,3,4,5]`; **uncommon** drawn from one half-sheet per box (`half: 'A'\|'B'`) | ✅ validated | 🔴 provisional (widths + split orientation) |
| `drk` — The Dark (1994) | uncommon 11×11 · common 11×11 (no rare sheet) | striped — all sheets `[2,3,4,5]` | ✅ validated | 🔴 simplified (real collation varies per box) |
| `fem` — Fallen Empires (1994) | uncommon 11×11 · common 11×11 (no rare sheet) | striped — all sheets `[2,3,4,5]` | ✅ validated | 🔴 simplified (uncommon split varies per box) |
| `ice` — Ice Age (1995) | rare 11×11 · uncommon 11×11 · common 11×11 | striped — all sheets `[2,3,4,5]` | 🔴 **rare sheet = placeholder** (common/uncommon ✅) | 🔴 provisional |
| `mir` — Mirage (1996) | rare 10×11 · uncommon 10×11 · common 10×11 | striped — all sheets `[2,3,4,5]` (Belgian printing; **10×11 orientation assumed**) | ✅ validated (Belgian) | 🔴 provisional |

---

## Engine-wide

| Assumption | Status | Notes |
|---|---|---|
| Striped-walk geometry: start bottom-right (col 11, row 11), columns right→left, cards upward per column (wrap top→bottom), band advances up by the stripe width, continuous across sheets | ✅ for Alpha → 🟡 for the rest | Validated for Alpha against 6 observed uncommon pack sequences, Steven's stated positions, the 14-sheet / 1694-card realignment, and framed replicas. Assumed identical for every other striped set. |
| Phase-lock: all sheets in a product start at position 1 together, so one pack index fixes the whole pack | ✅ for Alpha → 🟡 for the rest | Validated: Alpha pack 0 is the canonical first-ever pack (Timetwister + its exact commons/uncommons). |
| Collation is deterministic given the stripe widths; the only randomness is the run's start index (and, for Legends, the half) | ✅ | By design. |
| Within-pack card **order** emitted as slot order (commons → uncommons → rare) | 🟡 | Real packs can be front/back-facing, and some sets' uncommons can precede or follow the commons (see per-set). We emit one canonical order. Affects only printed order, not which cards are in the pack. |
| Box alignment: a box is consecutive packs; box _b_ starts at pack index (boxSize × _b_), box 0 at pack 0 | 🟡 | Per Steven ("as far as I know") for Alpha; assumed for all. |

---

## Per set

### `lea` — Limited Edition Alpha (1993)
- ✅ Grids (3 × 11×11): non-land totals 74 / 95 / 116; common land fill 9P/10I/9S/9M/10F.
- ✅ Stripe cycle `[2,3,4,5]`: from Steven / framed replicas; reproduces stated walk positions and the 1694-card (14-sheet) period.
- ✅ Basic-land variants A/B (lower collector number = A); the uncommon-sheet "Mountain (C)" resolved to Mountain (B) = `lea/293`.
- ✅ Whole-sheet collation (Alpha never used half-sheets).
- ✅ Products: 15-card booster (11/3/1) and 60-card starter (45/13/2), both starting at position 1; 1694 distinct units.

### `leb` — Limited Edition Beta (1993)
- ✅ Grids: non-land totals 75 / 95 / 117; three land variants A/B/C; adds `Circle of Protection: Black` (common) and `Volcanic Island` (rare).
- 🟡 Stripe cycle `[2,3,4,5]`: assumed identical to Alpha.

### `2ed` — Unlimited Edition (1993)
- ✅ Reuses Beta's exact sheet layout and collation (the source states they are identical; only the printed faces differ — white border).
- 🟡 Stripe cycle `[2,3,4,5]`: assumed (inherited from Beta).

### `3ed` — Revised Edition (1994)
- ✅ Grids (3 × 11×11): non-land totals 75 / 95 / 121; three basic-land variants A/B/C. Basic lands fill the common (46) and uncommon (26) sheets; the rare sheet has none — the Beta rare-Islands were removed, leaving Islands slightly short-printed (uncommon Islands = 2 vs 6 of the others).
- ✅ Products: 15-card booster (11/3/1), 36-pack boxes; 60-card starters. (The source notes two starter variants — a 2-rare 45/13/2 and a 3-rare 45/12/3; only the standard 2-rare starter is modelled in the demo.)
- 🟡 Stripe cycle `[2,3,4,5]`: assumed, as for the other base sets (the source gives no explicit cycle). Layout is "very similar to Beta and Unlimited."
- 🟡 Pack ordering ("back-facing, uncommon-rare-common") not modelled; canonical slot order emitted.

### `arn` — Arabian Nights (1993)
- ✅ Grids (2 × 11×11, **no rare**): common 16×C4 + 9×C5 + Desert×11 + Mountain×1; uncommon 33×U2 + 17×U3 + Oasis×4.
- 🟡 **Stripe cycles** common `[3,4,5]` / uncommon `[3,4]`: a deliberate modelling choice. The source describes the widths as "all width 3 and 4 except for one case of a width 5 stripe on the common sheet" — not a clean repeating cycle — so these cycles are an approximation (Steven's call), not the exact observed sequence.
- ✅ 15 common cards have "Light"/"Dark" versions (the earlier bottom-right 6×6 quadrant); kept verbatim in the grid, merged to the base name for rarity.
- ✅ Pack: 8 cards = 6 commons + 2 uncommons; 60-pack boxes.

### `atq` — Antiquities (1994)
- ✅ Grids (2 × 11×11, **no rare**): common 11×C1 + 5×C2 + 25×C4; uncommon 26×U1 + 4×U2 + 29×U3.
- ✅ Five non-basic lands (Urza's Mine / Power Plant / Tower, Mishra's Factory, Strip Mine) have four art variants each, notated `(A)`–`(D)`; kept verbatim.
- 🔴 **Stripe cycles** common `[3,4,5]` / uncommon `[3,4]`: **provisional** — assumed equal to Arabian Nights; the source gives no width sequence. Pending validation against a ~55-minute box-opening video.
- ✅ Pack: 8 cards = 6 commons + 2 uncommons; 60-pack boxes.

### `leg` — Legends (1994)
- ✅ Grids (3 × 11×11): common 75 (29×C1 + 46×C2); uncommon 114 (107×U1 + 7×U2); rare 121.
- ✅ Pack: 15 cards = 11 commons + 3 uncommons + 1 rare; 36-pack boxes.
- ✅ **Uncommon half-sheet mechanic**: the uncommon sheet is collated as two independent halves — top 6 rows ("A", incl. Mana Drain) and bottom 5 rows ("B", incl. Karakas) — and a whole box draws its uncommons from one half. Modelled via `splitSheets.uncommon` + the `half: 'A' | 'B'` open option. Commons and rares use the full sheet.
- 🔴 **Half membership / grid orientation**: **provisional** — assumed row-major, top-6 / bottom-5. This puts Hammerheim, Pendelhaven and Tolaria on both halves, whereas the source says *only Hammerheim* spans both (column-major gives Hammerheim + Tolaria). Neither reading matches exactly, so the exact orientation / boundary is unconfirmed. Pending validation against three box openings.
- 🔴 **Stripe cycle** `[2,3,4,5]` on all three sheets: **provisional** — Steven's assumption; the source gives no width sequence (it notes uncommon widths are "only 2 to 4").
- 🟡 Pack ordering (rare-uncommon-common vs uncommon-rare-common): not modelled; a single canonical order is emitted.

### `drk` — The Dark (1994)
- ✅ Grids (2 × 11×11, **no rare**): common 40×C3 + Maze of Ith ×1; uncommon 43×U2 + 35×U1 (the 35 U1s are the de-facto rares).
- ✅ Pack: 8 cards = 6 commons + 2 uncommons; 60-pack boxes.
- 🔴 **Collation simplified.** The Dark's real collation is *variable per box*: sheets may or may not split (common as top-5 / bottom-6), boxes carry "2 or 3 independent sequences of commons," and non-split boxes show width-7 stripes — so there is no single deterministic walk to reproduce. We model it as a plain two-sheet striped set with an assumed `[2,3,4,5]` cycle (Steven's call). The card grids are validated; the pack grouping is a deliberate approximation of an inherently non-deterministic process, not a provisional value awaiting one "correct" answer.
- 🟡 The "Runesword" printing variant (an errant line in the text box) is not modelled; its distribution is unknown.

### `fem` — Fallen Empires (1994)
- ✅ Grids (2 × 11×11, **no rare**): common merges to 36 base cards (15×C4 + 20×C3 + Delif's Cone ×1); uncommon 25×U3 + 5×U2 + 36×U1 (the 36 U1s are the de-facto rares).
- ✅ Multi-art commons: a common has a distinct artwork for each of its appearances (C4 → four, C3 → three), notated `(A)`–`(D)`; each art variant occupies one slot; kept verbatim. Uncommons are single-art.
- ✅ Pack: 8 cards = 6 commons + 2 uncommons; 60-pack boxes.
- 🔴 **Collation simplified.** Like The Dark, the uncommon sheet may or may not be split depending on the box, so there is no single deterministic walk. Modelled as a plain two-sheet striped set with an assumed `[2,3,4,5]` cycle (a deliberate approximation, not a value awaiting one "correct" answer).

### `ice` — Ice Age (1995)
- ✅ Grids for **common and uncommon** (2 × 11×11, 121 distinct each). Basic/snow-covered lands are on a separate land sheet and don't appear in boosters, so these are pure card grids. Common uses "version 1" (the source shows two common-sheet printings with the same 121 cards in different layouts).
- 🔴 **Rare sheet is FABRICATED.** The Collation Project page has no rare-sheet gallery, so the rare grid is the 121 real Ice Age rares in **Scryfall collector-number order**, not the true print-sheet order. Ice Age **rare collation is not accurate** — it is an explicit placeholder until the real rare sheet is sourced. Pack composition and the common/uncommon collation are unaffected.
- 🔴 **Stripe cycle** `[2,3,4,5]` assumed; the source notes variable collation (some boxes split the first common sheet top-5/bottom-6; width-1 stripes observed).
- 🟡 Two common-sheet printings exist; only version 1 is modelled.

### `mir` — Mirage (1996)
- ✅ Grids (3 × 10×11, 110 distinct each): common, uncommon, and rare are all real sheet data. Basic lands (four art variations) are not in boosters, so these are pure card grids.
- 🟡 **Belgian printing modelled.** Mirage had two printings — US (*sequential*, four common runs with variable splits) and Belgian (*striped*). We model the Belgian striped one; the engine doesn't implement sequential collation. Common + uncommon are the Belgian sheets; the rare grid is the single rare sheet the source shows (listed under the US section) — real 110-rare data.
- 🔴 **Sheet orientation assumed.** 10×11 sheets are non-square, so the striped walk depends on which dimension is rows vs columns; the source doesn't pin it down. We assume **10 rows × 11 columns** (gallery read row-major).
- 🔴 **Stripe cycle** `[2,3,4,5]` assumed (source gives no cycle). Period = 770 packs.

---

## Open validation tasks

- **`atq` stripe widths** — determine the real per-sheet width sequence from a box-opening video, then update `src/sets/atq/index.ts`.
- **`leg` uncommon split + stripe widths** — determine the true grid orientation / half boundary and stripe widths from three box openings, then update `src/sets/leg/index.ts` (and the demo).
- **`ice` rare sheet** — source the real Ice Age rare sheet (the Collation Project page lacks it) and replace the fabricated placeholder grid in `src/sets/ice/sheets.json`.

When a provisional item is validated, correct the set definition, flip its status here, and cut a release.
