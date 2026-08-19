import { buildBasket, type Selection } from './cost'
import type { PriceBook } from './prices'
import type { Recipe } from '../types'

export interface FridgeMatch {
  recipe: Recipe
  /** Ids of the things you already have that this recipe uses. */
  matched: string[]
  /** Names of them, for showing. */
  matchedNames: string[]
  /** Pence for everything else the recipe needs. */
  restCost: number
  /** How many other non-staple things you'd still have to buy. */
  restCount: number
}

/**
 * What can I make with what's in the fridge?
 *
 * Ranked by how many of your ingredients a recipe uses, most first - three of
 * yours beats two, two beats one, always. Recipes that use none of them are
 * dropped entirely; if you wanted the whole book you'd be on the recipe screen.
 *
 * Within a tier, the cheapest to complete wins: if two recipes both use your
 * lentils and onion, the one that needs £1 more shopping beats the one that
 * needs £4.
 */
export function matchFridge(
  have: string[],
  recipes: Recipe[],
  book: PriceBook,
): FridgeMatch[] {
  if (have.length === 0) return []
  const haveSet = new Set(have)

  const out: FridgeMatch[] = []
  for (const recipe of recipes) {
    const matched = recipe.ingredients
      .map(ri => ri.ingredientId)
      .filter(id => haveSet.has(id))
    if (matched.length === 0) continue

    // Everything else it needs, priced as a shop. Staples stay out of it - you
    // aren't buying salt to make one dinner.
    const selection: Selection[] = [{ recipeId: recipe.id, portions: recipe.baseServings }]
    const basket = buildBasket(selection, { [recipe.id]: recipe }, book)
    const rest = basket.lines.filter(l => l.inShop && !haveSet.has(l.ingredient.id))

    out.push({
      recipe,
      matched,
      matchedNames: matched.map(id => book[id]?.name ?? id),
      restCost: rest.reduce((n, l) => n + l.buyCost, 0),
      restCount: rest.length,
    })
  }

  out.sort((a, b) =>
    b.matched.length - a.matched.length ||
    a.restCost - b.restCost ||
    a.recipe.minutes - b.recipe.minutes,
  )
  return out
}
