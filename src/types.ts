/** Which slot type a sheet feeds in a pack. */
export type Rarity = 'common' | 'uncommon' | 'rare';

/** Basic-land art variant: Alpha has A/B, Beta and Unlimited add C. */
export type BasicLandVariant = 'A' | 'B' | 'C';

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

/**
 * Stripe-width source for striped collation. Either a single repeating cycle
 * applied to every sheet (Alpha = [2,3,4,5]), or a per-rarity map when sheets
 * stripe differently (Arabian Nights: common [3,4,5], uncommon [3,4]).
 */
export type StripeWidths = number[] | Partial<Record<Rarity, number[]>>;

/**
 * A sheet collated as two independent horizontal half-sheets, each walked on its
 * own. Legends' uncommon sheet works this way: the top `topRows` rows are the
 * "A" half and the remaining rows are the "B" half, and a whole booster box
 * draws its cards for that rarity from a single half.
 */
export interface SheetSplit {
  /** Rows in the top ("A") half; the rest form the bottom ("B") half. */
  topRows: number;
}

/** Which half of a split sheet a run/box draws from. */
export type SheetHalf = 'A' | 'B';

/** Everything needed to open packs of one set. */
export interface SetDefinition {
  code: string;
  name: string;
  collation: CollationMethod;
  /**
   * The print sheets, keyed by the slot they feed. Most sets have all three
   * (common/uncommon/rare); some — e.g. Arabian Nights — have no rare sheet.
   */
  sheets: Partial<Record<Rarity, Sheet>>;
  layout: PackLayout;
  /**
   * For striped collation: the repeating stripe-width cycle. Collation is
   * deterministic given the widths; the RNG only picks the pack-aligned starting
   * offset. A bare array applies to every sheet; a per-rarity map lets sheets
   * stripe independently. Defaults to [2,3,4,5] if omitted.
   */
  stripeCycle?: StripeWidths;
  /**
   * Rarities whose sheet is collated as two half-sheets (Legends uncommons).
   * A run draws that rarity from one half, chosen via OpenOptions.half.
   */
  splitSheets?: Partial<Record<Rarity, SheetSplit>>;
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
