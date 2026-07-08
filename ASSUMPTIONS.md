# Modelling assumptions

`crack-pack` reproduces physical print-sheet collation. Some of that is firmly
established (validated against observed pack openings, framed sheet replicas, or
the source's own checksums); some is a reasonable modelling choice; and some is a
deliberate placeholder awaiting validation. This file tracks all of it so nothing
provisional is mistaken for confirmed.

**Status legend**

- ✅ **Validated** — checked against real pack openings, physical sheet replicas, or the source's stated checksums.
- 🟡 **Assumed** — a reasonable modelling choice, consistent with the source but not independently confirmed.
- 🔴 **Provisional** — an explicit placeholder, pending a named validation source.

Sheet **card grids** for every set are ✅ checksum-validated against the source's
stated rarity frequencies. Where a set is marked provisional, it's the
**collation order** (which cards land together in a pack), not the grid contents,
that is unconfirmed.

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

---

## Open validation tasks

- **`atq` stripe widths** — determine the real per-sheet width sequence from a box-opening video, then update `src/sets/atq/index.ts`.
- **`leg` uncommon split + stripe widths** — determine the true grid orientation / half boundary and stripe widths from three box openings, then update `src/sets/leg/index.ts` (and the demo).

When a provisional item is validated, correct the set definition, flip its status here, and cut a release.
