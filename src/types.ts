/** Which slot type a sheet feeds in a pack. */
export type Rarity = 'common' | 'uncommon' | 'rare';

/** Alpha basic lands come in exactly two versions each. */
export type BasicLandVariant = 'A' | 'B';

/** A single position on a print sheet. */
export interface CardEntry {
  name: string;
  isBasicLand: boolean;
  /** Only present for basic lands, and only when known to be A or B. */
  variant?: BasicLandVariant;
  /**
   * True when the source data recorded a basic-land variant outside A/B
   * (e.g. Alpha's uncommon-sheet "Mountain (C)"), i.e. a real card whose
   * A/B version is not yet resolved. Kept so we never silently guess.
   */
  variantUnresolved?: boolean;
}

/** An ordered print sheet, stored row-major (top-to-bottom, left-to-right). */
export interface Sheet {
  rarity: Rarity;
  rows: number;
  cols: number;
  /** length === rows * cols */
  cards: CardEntry[];
}

/** How many cards a pack draws from a given sheet. */
export interface SlotSpec {
  sheet: Rarity;
  count: number;
}

/** The full slot recipe for one pack, applied in order. */
export interface PackLayout {
  slots: SlotSpec[];
}

export type CollationMethod = 'striped' | 'sequential';

/** Everything needed to open packs of one set. */
export interface SetDefinition {
  code: string;
  name: string;
  collation: CollationMethod;
  sheets: Record<Rarity, Sheet>;
  layout: PackLayout;
  /**
   * For striped collation: the repeating stripe-width cycle (Alpha = [2,3,4,5]).
   * Collation is deterministic given this cycle; the RNG only picks the
   * pack-aligned starting offset. Defaults to [2,3,4,5] if omitted.
   */
  stripeCycle?: number[];
}

/** A card as it comes out of a pack. */
export interface OpenedCard {
  name: string;
  isBasicLand: boolean;
  variant?: BasicLandVariant;
  /** Which sheet/slot this card was drawn from. */
  fromSheet: Rarity;
}

export type Pack = OpenedCard[];

/** Injectable random source, so runs are reproducible and testable. */
export interface Rng {
  /** float in [0, 1) */
  nextFloat(): number;
  /** integer in [minInclusive, maxInclusive] */
  int(minInclusive: number, maxInclusive: number): number;
}
