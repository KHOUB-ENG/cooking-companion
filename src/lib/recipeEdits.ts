import { RECIPES } from '../data/recipes'
import type { Recipe, RecipeIngredient } from '../types'

/**
 * Your changes to a shipped recipe.
 *
 * Recipes are opinions, not facts. Once you've actually cooked something you
 * know it needs more chilli, or that you never bother with the spinach. This
 * stores those changes on your phone, layered over what ships in the code, so
 * an app update never wipes them.
 */
export interface RecipeOverride {
  name?: string
  baseServings?: number
  minutes?: number
  ingredients?: RecipeIngredient[]
  steps?: string[]
  tip?: string
}

export type RecipeOverrides = Record<string, RecipeOverride>

export type RecipeBook = Record<string, Recipe>

export function buildRecipeBook(overrides: RecipeOverrides): RecipeBook {
  const book: RecipeBook = {}
  for (const base of RECIPES) {
    const o = overrides[base.id]
    book[base.id] = o ? { ...base, ...stripEmpty(o) } : base
  }
  return book
}

/** Ignore keys set to undefined so a partial edit doesn't blank a field. */
function stripEmpty(o: RecipeOverride): Partial<Recipe> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<Recipe>
}

export function bookAsList(book: RecipeBook): Recipe[] {
  return RECIPES.map(r => book[r.id] ?? r)
}

export function isRecipeEdited(overrides: RecipeOverrides, id: string): boolean {
  const o = overrides[id]
  return !!o && Object.values(o).some(v => v !== undefined)
}

export function recipeEditCount(overrides: RecipeOverrides): number {
  return RECIPES.filter(r => isRecipeEdited(overrides, r.id)).length
}
