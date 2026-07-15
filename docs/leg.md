# Legends (`leg`) — known gaps & assumptions

Part of [crack-pack](../README.md) · see the [status matrix](../ASSUMPTIONS.md#status-matrix).

**Status:** sheet data ✅ validated · collation 🔴 provisional.

## What's solid
- Three 11×11 sheets, grids checksum-validated: common 75, uncommon 114
  (107×U1 + 7×U2), rare 121.
- The **half-sheet mechanic**: the uncommon sheet is collated as two independent
  halves and a whole box draws its uncommons from one of them (the famous
  "Mana Drain half" vs "Karakas half"). Modelled via `openPacks(leg, n, { half })`.

## The gap
- **Exact half boundary / grid orientation.** The source says *"only Hammerheim
  appears on both halves,"* but our row-major, top-6 / bottom-5 split puts
  Hammerheim **plus Pendelhaven and Tolaria** on both (column-major gives two).
  So the true orientation / boundary is unconfirmed.
- **Stripe widths** aren't given by the source.

## What we assumed
- Uncommon split = **row-major, top 6 rows (A, Mana Drain) / bottom 5 rows
  (B, Karakas)**.
- Stripe cycle **`[2,3,4,5]`** on all sheets.

## How you can help
- The correct sheet **orientation / half boundary** and **stripe widths**, from
  box openings. (Three Legends box openings are already on hand to validate against.)
- [Open an issue or PR](https://github.com/crack-pack/crack-pack/issues).
