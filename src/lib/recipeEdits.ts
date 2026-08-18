import { RECIPES } from '../data/recipes'
import type { Equipment, Keeps, Recipe, RecipeIngredient, Tag } from '../types'

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
  blurb?: string
  emoji?: string
  baseServings?: number
  minutes?: number
  proteinPerServing?: number
  equipment?: Equipment[]
  tags?: Tag[]
  keeps?: Keeps
  ingredients?: RecipeIngredient[]
  steps?: string[]
  tip?: string
}

export type RecipeOverrides = Record<string, RecipeOverride>

export type RecipeBook = Record<string, Recipe>

export function buildRecipeBook(
  overrides: RecipeOverrides,
  custom: Recipe[] = [],
): RecipeBook {
  const book: RecipeBook = {}
  for (const base of [...RECIPES, ...custom]) {
    const o = overrides[base.id]
    book[base.id] = o ? { ...base, ...stripEmpty(o) } : base
  }
  return book
}

/** Your own recipes sort to the top - you added them, you want to see them. */
export function bookList(book: RecipeBook, custom: Recipe[] = []): Recipe[] {
  const customIds = new Set(custom.map(r => r.id))
  const mine = custom.map(r => book[r.id] ?? r)
  const shipped = RECIPES.map(r => book[r.id] ?? r).filter(r => !customIds.has(r.id))
  return [...mine, ...shipped]
}

/** A blank recipe to start editing. Defaults are deliberately permissive so a
 *  half-finished recipe still shows up in the deck rather than vanishing. */
export function blankRecipe(): Recipe {
  return {
    id: `own_${Date.now().toString(36)}`,
    name: 'My recipe',
    blurb: '',
    emoji: '🍳',
    baseServings: 2,
    minutes: 20,
    skill: 1,
    equipment: [],
    tags: ['no_pork', 'no_beef', 'no_fish'],
    proteinPerServing: 20,
    keeps: 'fridge',
    ingredients: [],
    steps: [''],
  }
}

/** Ignore keys set to undefined so a partial edit doesn't blank a field. */
function stripEmpty(o: RecipeOverride): Partial<Recipe> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<Recipe>
}



export function isRecipeEdited(overrides: RecipeOverrides, id: string): boolean {
  const o = overrides[id]
  return !!o && Object.values(o).some(v => v !== undefined)
}

export function recipeEditCount(overrides: RecipeOverrides): number {
  return RECIPES.filter(r => isRecipeEdited(overrides, r.id)).length
}
