import { INGREDIENTS } from '../data/ingredients'
import type { Ingredient } from '../types'

/**
 * Your corrections to the shipped price table.
 *
 * The shipped prices are estimates - there is no public Aldi price feed, and
 * scraping one is fragile and against their terms. So the app treats its own
 * numbers as provisional and lets you overwrite any of them from a shelf label.
 * Your edits live on your phone and win over whatever ships in the code.
 */
export interface PriceOverride {
  /** Pence for one pack. */
  price?: number
  /** Pack size in the ingredient's unit - a wrong size breaks every recipe. */
  size?: number
  /** How the pack reads on the shelf, e.g. "750g bag". */
  packLabel?: string
  /** When you checked it, so stale corrections are obvious later. */
  checked?: string
}

export type Overrides = Record<string, PriceOverride>

/** The ingredient list the app should actually use: defaults + your edits. */
export type PriceBook = Record<string, Ingredient>

export function buildPriceBook(overrides: Overrides): PriceBook {
  const book: PriceBook = {}
  for (const base of INGREDIENTS) {
    const o = overrides[base.id]
    book[base.id] = o
      ? {
          ...base,
          pack: {
            size: o.size ?? base.pack.size,
            price: o.price ?? base.pack.price,
          },
          packLabel: o.packLabel ?? base.packLabel,
        }
      : base
  }
  return book
}

export function bookAsList(book: PriceBook): Ingredient[] {
  return INGREDIENTS.map(i => book[i.id] ?? i)
}

/** Has this ingredient been corrected by hand? */
export function isEdited(overrides: Overrides, id: string): boolean {
  const o = overrides[id]
  return !!o && (o.price !== undefined || o.size !== undefined)
}

export function editedCount(overrides: Overrides): number {
  return INGREDIENTS.filter(i => isEdited(overrides, i.id)).length
}

/**
 * Reads what someone types on a price field. Accepts "2.49", "£2.49", "89p".
 * Returns pence, or null if it isn't a price.
 */
export function parsePrice(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/[£\s,]/g, '')
  const m = cleaned.match(/^(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!isFinite(n) || n <= 0) return null
  // "89p" is pence; "2.49" is pounds; a bare big number is already pence.
  if (/p$/i.test(cleaned)) return Math.round(n)
  if (cleaned.includes('.') || n < 20) return Math.round(n * 100)
  return Math.round(n)
}
