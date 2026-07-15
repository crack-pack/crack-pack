# Mirage (`mir`) — known gaps & assumptions

Part of [crack-pack](../README.md) · see the [status matrix](../ASSUMPTIONS.md#status-matrix).

**Status:** sheet data ✅ validated (Belgian) · collation 🔴 provisional.

## What's solid
- Three 10×11 sheets, grids checksum-validated (110 distinct each): common,
  uncommon, and rare are all real sheet data. Basic lands (four variations) are
  not in boosters. Pack = 11 commons + 3 uncommons + 1 rare.

## The gaps
- **Two printings.** Mirage had a **US** printing (*sequential*, four common runs
  A/B/C/D with probabilistic per-pack splits) and a **Belgian** printing
  (*striped*). We model the **Belgian striped** one; the US multi-run, random-split
  assembly isn't modelled (and the source shows no US uncommon sheet).
- **Orientation.** The sheets are **10×11** (non-square), so — unlike the square
  11×11 sets — the striped walk depends on which dimension is rows vs columns, and
  the source doesn't pin this down.
- **Stripe widths** aren't given.

## What we assumed
- Belgian printing; **10 rows × 11 columns** orientation; stripe cycle **`[2,3,4,5]`**.

## How you can help
- Confirmation of the **10×11 orientation** and the real **stripe widths**.
- For the US printing: the **US uncommon sheet** and the real **split
  probabilities** (the source gives rough estimates only).
- [Open an issue or PR](https://github.com/crack-pack/crack-pack/issues).
