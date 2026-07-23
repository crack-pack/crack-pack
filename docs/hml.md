# Homelands (`hml`) — known gaps & assumptions

Part of [crack-pack](../README.md) · see the [status matrix](../ASSUMPTIONS.md#status-matrix).

**Status:** sheet data ✅ validated · collation 🔴 provisional.

## What's solid
- Two 11×11 sheets (common + uncommon; **no rare sheet**), hand-transcribed from
  uncut-sheet photos on [magiclibrarities.net](https://www.magiclibrarities.net/)
  (The Collation Project has no Homelands page).
- Validated by collector number and by rarity colour-balance against MTGJSON:
  common = 71 printings (21×C1 + 50×C2, over 46 base cards); uncommon = 69
  (26 true-uncommons ×3 "U3" + 43 de-facto rares ×1 "U1").
- 25 commons have two versions, kept verbatim as `(A)`/`(B)`; basic lands are on
  a separate land sheet (not in boosters). Pack = 6 commons + 2 uncommons.

## A rarity data bug we found (upstream)
- **Sengir Autocrat** is labelled *uncommon* by MTGJSON/Scryfall, but every colour
  has 4 uncommons / 8 rares **except Black (5 / 7)** — and Sengir Autocrat appears
  only **once** on the sheet (U1 frequency). Both point to it being a de-facto
  **rare**. Reported: [mtgjson/mtgjson#1687](https://github.com/mtgjson/mtgjson/issues/1687).
- crack-pack derives rarity from **sheet frequency**, so this is modelled correctly
  regardless of the upstream label.

## The gap
- The source gives **no per-sheet stripe-width sequence** for Homelands (Belgian /
  Carta Mundi printing). We know it's striped on 11×11 sheets, but not the widths
  that determine which cards land together in a pack.
- Card **positions** rest on a manual read of a low-res photo — the card set and
  frequencies are certain, but an individual cell could be off.

## What we assumed
- Stripe cycle **`[2,3,4,5]`** on both sheets — a stand-in. The card grids and
  frequencies are correct; only the pack *grouping* is unconfirmed.

## How you can help
- The **real per-sheet stripe widths** and a **clearer sheet scan**, from a
  box-opening video or a physical/uncut sheet.
- [Open an issue or PR](https://github.com/crack-pack/crack-pack/issues).
