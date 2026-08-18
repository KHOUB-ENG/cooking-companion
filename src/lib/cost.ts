import { INGREDIENT_BY_ID } from '../data/ingredients'
import type { Ingredient, PlanSetup, Recipe } from '../types'
import { AISLE_ORDER, AISLE_LABEL, type Aisle } from '../types'

/** A recipe you picked, and how many portions of it you want to end up with. */
export interface Selection {
  recipeId: string
  portions: number
}

export interface BasketLine {
  ingredient: Ingredient
  /** Total amount the recipes actually use, in the ingredient's unit. */
  needed: number
  /** Whole packs you have to put in the trolley. */
  packs: number
  /** What leaves your bank account: whole packs, in pence. */
  buyCost: number
  /** What you actually eat: the used fraction, in pence. */
  eatenCost: number
  /** What is left over in the cupboard afterwards, in the ingredient's unit. */
  leftover: number
  /** Which of your recipes need this. Drives the leftover-chaining hints. */
  usedBy: string[]
}

export interface Basket {
  lines: BasketLine[]
  /** Cost of the shop, staples excluded (you already own the salt). */
  buyTotal: number
  /** Cost of the food you will actually eat. Always <= buyTotal. */
  eatenTotal: number
  /** What the staples would cost if you had to buy them from scratch. */
  stapleTotal: number
  /** Money sitting in leftovers you have not eaten yet. Not waste - yet. */
  leftoverValue: number
  /** eatenTotal / buyTotal, 0-1. Below ~0.6 means the plan shape is wrong. */
  efficiency: number
}

/** £3.45, or 92p for anything under a pound. */
export function money(pence: number): string {
  if (pence < 100) return `${Math.round(pence)}p`
  return `£${(pence / 100).toFixed(2)}`
}

/** Amount of one ingredient needed once a recipe is scaled to `portions`. */
export function scaledQty(recipe: Recipe, qty: number, portions: number): number {
  return (qty / recipe.baseServings) * portions
}

/**
 * The core of the app. Works out, across every recipe you picked:
 * what you must BUY (whole packs) vs what you will EAT (the fraction used).
 *
 * Everyone else only shows you the second number, which is why their
 * "£1.20 a portion" never matches your receipt.
 */
export function buildBasket(
  selections: Selection[],
  recipeById: Record<string, Recipe>,
): Basket {
  const needed = new Map<string, { qty: number; usedBy: string[] }>()

  for (const sel of selections) {
    const recipe = recipeById[sel.recipeId]
    if (!recipe) continue
    for (const ri of recipe.ingredients) {
      const amount = scaledQty(recipe, ri.qty, sel.portions)
      const entry = needed.get(ri.ingredientId) ?? { qty: 0, usedBy: [] }
      entry.qty += amount
      if (!entry.usedBy.includes(recipe.name)) entry.usedBy.push(recipe.name)
      needed.set(ri.ingredientId, entry)
    }
  }

  const lines: BasketLine[] = []
  let buyTotal = 0
  let eatenTotal = 0
  let stapleTotal = 0
  let leftoverValue = 0

  for (const [id, entry] of needed) {
    const ingredient = INGREDIENT_BY_ID[id]
    if (!ingredient) continue

    const packs = Math.ceil(entry.qty / ingredient.pack.size)
    const buyCost = packs * ingredient.pack.price
    const eatenCost = Math.round((entry.qty / ingredient.pack.size) * ingredient.pack.price)
    const leftover = packs * ingredient.pack.size - entry.qty

    lines.push({
      ingredient,
      needed: entry.qty,
      packs,
      buyCost,
      eatenCost,
      leftover,
      usedBy: entry.usedBy,
    })

    if (ingredient.staple) {
      stapleTotal += buyCost
    } else {
      buyTotal += buyCost
      eatenTotal += eatenCost
      leftoverValue += buyCost - eatenCost
    }
  }

  lines.sort((a, b) => b.buyCost - a.buyCost)
  const efficiency = buyTotal > 0 ? eatenTotal / buyTotal : 1
  return { lines, buyTotal, eatenTotal, stapleTotal, leftoverValue, efficiency }
}

// --- plan shape -------------------------------------------------------------
//
// The waste trap: asking for 3 recipes across 5 days works out at 2 portions
// each, but these recipes are written for 4. Scaling one DOWN means buying a
// 1kg pack of chicken to use 400g of it - you spend £21 to eat £6.
//
// Two rules fix it:
//   1. You never cook a fraction of a recipe. You cook whole batches.
//   2. The number of recipes should follow from the days, not the other way
//      round. Fewer recipes over more days is what batch cooking IS.

/**
 * Portions you actually end up with when you cook this recipe for a target.
 * Always a whole number of batches - nobody makes half a pasta bake.
 */
export function portionsForRecipe(recipe: Recipe, target: number): number {
  const batches = Math.max(1, Math.round(target / recipe.baseServings))
  return batches * recipe.baseServings
}

/** Typical batch size of the recipes you could actually cook. */
export function averageServings(recipes: Recipe[]): number {
  if (recipes.length === 0) return 4
  return recipes.reduce((sum, r) => sum + r.baseServings, 0) / recipes.length
}

/**
 * How many different recipes this many days actually wants. More than this and
 * you are cooking small batches of everything and binning the difference.
 */
export function recommendRecipeCount(days: number, avgServings: number): number {
  return Math.max(1, Math.min(5, Math.round(days / avgServings)))
}

export interface ShapeAdvice {
  recommended: number
  /** Portions you will end up with at the current shape. */
  totalPortions: number
  /** Portions beyond the days you asked for. Freezer food, or waste. */
  spare: number
  level: 'good' | 'over' | 'under'
  message: string
}

export function shapeAdvice(setup: PlanSetup, eligible: Recipe[]): ShapeAdvice {
  const avg = averageServings(eligible)
  const recommended = recommendRecipeCount(setup.days, avg)
  const target = setup.days / setup.recipeCount
  const totalPortions = Math.round(
    setup.recipeCount * Math.max(1, Math.round(target / avg)) * avg,
  )
  const spare = totalPortions - setup.days

  if (setup.recipeCount > recommended) {
    return {
      recommended, totalPortions, spare, level: 'over',
      message: `${setup.recipeCount} recipes over ${setup.days} days means small batches of each, so you buy full packs and use a fraction. ${recommended} would cover it with far less waste.`,
    }
  }
  if (spare > setup.days) {
    return {
      recommended, totalPortions, spare, level: 'under',
      message: `That leaves ${spare} spare portions. Fine if you'll freeze them, wasteful if you won't.`,
    }
  }
  return {
    recommended, totalPortions, spare,
    level: 'good',
    message: spare > 0
      ? `${totalPortions} portions - covers your ${setup.days} days with ${spare} spare for the freezer.`
      : `${totalPortions} portions, covering ${setup.days} days.`,
  }
}

export interface AisleGroup {
  aisle: Aisle
  label: string
  lines: BasketLine[]
}

/** The shopping list, in the order you walk the shop. Staples are dropped. */
export function groupByAisle(basket: Basket): AisleGroup[] {
  return AISLE_ORDER
    .map(aisle => ({
      aisle,
      label: AISLE_LABEL[aisle],
      lines: basket.lines.filter(l => l.ingredient.aisle === aisle && !l.ingredient.staple),
    }))
    .filter(g => g.lines.length > 0)
}

/** Ingredients that more than one of your recipes uses - nothing goes to waste. */
export function sharedIngredients(basket: Basket): BasketLine[] {
  return basket.lines.filter(l => l.usedBy.length > 1 && !l.ingredient.staple)
}

/** Cost per portion, using the honest "what you ate" number. */
export function costPerPortion(recipe: Recipe): number {
  const basket = buildBasket(
    [{ recipeId: recipe.id, portions: recipe.baseServings }],
    { [recipe.id]: recipe },
  )
  return Math.round(basket.eatenTotal / recipe.baseServings)
}

// --- filtering --------------------------------------------------------------

/** Diet tags a recipe must carry to survive each restriction. */
const DIET_REQUIRES: Record<string, string> = {
  veggie: 'veggie',
  no_pork: 'no_pork',
  no_beef: 'no_beef',
  no_fish: 'no_fish',
}

/**
 * The hard filter behind the swipe deck. A recipe only ever appears if you
 * can physically cook it with the kit you ticked and it fits your diet.
 */
export function filterRecipes(
  recipes: Recipe[],
  setup: PlanSetup,
  search = '',
): Recipe[] {
  const q = search.trim().toLowerCase()

  return recipes.filter(recipe => {
    // Every piece of kit the recipe needs must be kit you have.
    const hasKit = recipe.equipment.every(e => setup.equipment.includes(e))
    if (!hasKit) return false

    for (const diet of setup.diets) {
      const required = DIET_REQUIRES[diet]
      if (required && !recipe.tags.includes(required as never)) return false
      if (diet === 'no_nuts' && recipe.ingredients.some(i => i.ingredientId === 'peanutbtr')) {
        return false
      }
    }

    if (q) {
      const haystack = `${recipe.name} ${recipe.blurb} ${recipe.tags.join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

/** Goal-aware ordering, so the deck opens with cards you are likely to want. */
export function rankRecipes(recipes: Recipe[], setup: PlanSetup): Recipe[] {
  const scored = recipes.map(recipe => {
    let score = 0
    for (const goal of setup.goals) {
      if (recipe.tags.includes(goal)) score += 10
    }
    if (setup.goals.includes('high_protein')) score += recipe.proteinPerServing / 5
    if (setup.goals.includes('cheapest')) score -= costPerPortion(recipe) / 20
    if (setup.goals.includes('quick')) score -= recipe.minutes / 10
    return { recipe, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.recipe)
}
