import type { PriceBook } from './prices'
import type { Ingredient, PlanSetup, Recipe } from '../types'
import {
  AISLE_ORDER, AISLE_LABEL, KEEPS_RANK, mainMeals,
  type Aisle, type Keeps,
} from '../types'

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
  /** Is this actually going in the trolley? Cupboard staples usually are not. */
  inShop: boolean
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
/**
 * Your cupboard. `true` means you already have it, `false` means you told the
 * app you need to buy it. Anything missing has not been asked about yet, and
 * is kept out of the shop until you answer - guessing would quietly inflate
 * every total with olive oil you already own.
 */
export type Pantry = Record<string, boolean | undefined>

export function buildBasket(
  selections: Selection[],
  recipeById: Record<string, Recipe>,
  book: PriceBook,
  pantry: Pantry = {},
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
    const ingredient = book[id]
    if (!ingredient) continue

    const packs = Math.ceil(entry.qty / ingredient.pack.size)
    const buyCost = packs * ingredient.pack.price
    const eatenCost = Math.round((entry.qty / ingredient.pack.size) * ingredient.pack.price)
    const leftover = packs * ingredient.pack.size - entry.qty

    // A staple only joins the shop once you've said you need it.
    const inShop = !ingredient.staple || pantry[ingredient.id] === false

    lines.push({
      ingredient,
      needed: entry.qty,
      packs,
      buyCost,
      eatenCost,
      leftover,
      usedBy: entry.usedBy,
      inShop,
    })

    if (inShop) {
      buyTotal += buyCost
      eatenTotal += eatenCost
      leftoverValue += buyCost - eatenCost
    } else {
      stapleTotal += buyCost
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

// --- the shape of a week ----------------------------------------------------
//
// A week isn't a uniform pile of meals, it's a set of COOKS. What each cook has
// to satisfy comes from one question: how long does the food have to survive?
//
//   1 portion   - you eat it tonight. Anything goes.
//   2-3 portions - eaten over the next few days, so it has to be good from the
//                  fridge, which is most cooked food.
//   4+ portions - cooked Sunday, still being eaten Thursday. It has to freeze.
//
// That's derived, not asked. The app already knows the portions per cook, so it
// can rule out the smash burger for a Sunday batch without a questionnaire.

export interface Slot {
  index: number
  kind: 'main' | 'breakfast'
  /** Portions this cook is meant to produce. */
  portions: number
  /** The minimum a recipe must survive to fill this slot. */
  needs: Keeps
  /** Filled once you pick something for it. */
  recipeId?: string
}

function needsFor(portions: number): Keeps {
  // Calibrated against how long a fridge actually holds cooked food. The first
  // cut of this demanded 'freezer' from 3 portions up, which meant the default
  // plan (6 meals over 2 cooks) asked every slot to freeze and hid two thirds
  // of the book. Three portions eaten Mon-Tue-Wed is a fridge job.
  if (portions <= 1) return 'fresh'
  if (portions <= 3) return 'fridge'
  return 'freezer'
}

/** Can this recipe survive long enough to fill this slot? */
export function fitsSlot(recipe: Recipe, slot: Slot): boolean {
  return KEEPS_RANK[recipe.keeps] >= KEEPS_RANK[slot.needs]
}

const isBreakfast = (r: Recipe) => r.tags.includes('breakfast')

/**
 * The week broken into cooks, with your picks slotted in. This is the single
 * description of a plan - the deck fills it, the week screen reads it, and
 * buildSelections turns it into portions. Nothing else gets to have an opinion.
 */
export function planSlots(
  setup: PlanSetup,
  recipeBook: Record<string, Recipe>,
  liked: string[],
): Slot[] {
  const meals = mainMeals(setup)
  const cooks = Math.max(1, setup.recipeCount)
  const slots: Slot[] = []

  // Spread the meals across the cooks, remainder to the earlier ones.
  for (let i = 0; i < cooks; i++) {
    const portions = Math.floor(meals / cooks) + (i < meals % cooks ? 1 : 0)
    slots.push({ index: i, kind: 'main', portions, needs: needsFor(portions) })
  }

  if (setup.breakfasts > 0) {
    // Breakfast gets made fresh each morning, so it never needs to keep.
    slots.push({
      index: slots.length,
      kind: 'breakfast',
      portions: setup.breakfasts,
      needs: 'fresh',
    })
  }

  const picked = liked.map(id => recipeBook[id]).filter(Boolean)
  const mains = picked.filter(r => !isBreakfast(r))
  const breakfasts = picked.filter(isBreakfast)
  let m = 0
  let b = 0
  for (const slot of slots) {
    if (slot.kind === 'main' && mains[m]) slot.recipeId = mains[m++].id
    else if (slot.kind === 'breakfast' && breakfasts[b]) slot.recipeId = breakfasts[b++].id
  }
  return slots
}

/** The slot the deck is currently filling, or null when the week is full. */
export function nextSlot(slots: Slot[]): Slot | null {
  return slots.find(s => !s.recipeId) ?? null
}

/**
 * Turn a plan into portions. Reads the slots so the shopping list, the costs
 * and the saved session can never disagree about how much gets cooked.
 */
export function buildSelections(
  setup: PlanSetup,
  liked: string[],
  recipeBook: Record<string, Recipe>,
): Selection[] {
  return planSlots(setup, recipeBook, liked)
    .filter(s => s.recipeId)
    .map(s => ({
      recipeId: s.recipeId!,
      portions: portionsForRecipe(recipeBook[s.recipeId!], s.portions),
    }))
}

/** Typical batch size of the recipes you could actually cook. */
export function averageServings(recipes: Recipe[]): number {
  if (recipes.length === 0) return 4
  return recipes.reduce((sum, r) => sum + r.baseServings, 0) / recipes.length
}

/**
 * How many different recipes this many meals actually wants. More than this and
 * you are cooking small batches of everything and binning the difference.
 */
export function recommendRecipeCount(meals: number, avgServings: number): number {
  return Math.max(1, Math.min(5, Math.round(meals / avgServings)))
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
  const meals = mainMeals(setup)
  const avg = averageServings(eligible)
  const recommended = recommendRecipeCount(meals, avg)
  const target = meals / setup.recipeCount
  const totalPortions = Math.round(
    setup.recipeCount * Math.max(1, Math.round(target / avg)) * avg,
  )
  const spare = totalPortions - meals

  if (setup.recipeCount > recommended) {
    return {
      recommended, totalPortions, spare, level: 'over',
      message: `${setup.recipeCount} recipes for ${meals} meals means small batches of each, so you buy full packs and use a fraction. ${recommended} would cover it with far less waste.`,
    }
  }
  if (spare > meals) {
    return {
      recommended, totalPortions, spare, level: 'under',
      message: `That leaves ${spare} spare portions. Fine if you'll freeze them, wasteful if you won't.`,
    }
  }
  return {
    recommended, totalPortions, spare,
    level: 'good',
    message: spare > 0
      ? `${totalPortions} portions - covers your ${meals} meals with ${spare} spare for the freezer.`
      : `${totalPortions} portions, covering all ${meals} meals.`,
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
      lines: basket.lines.filter(l => l.ingredient.aisle === aisle && l.inShop),
    }))
    .filter(g => g.lines.length > 0)
}

/** Ingredients that more than one of your recipes uses - nothing goes to waste. */
export function sharedIngredients(basket: Basket): BasketLine[] {
  return basket.lines.filter(l => l.usedBy.length > 1 && !l.ingredient.staple)
}

/** Cost per portion, using the honest "what you ate" number. */
export function costPerPortion(recipe: Recipe, book: PriceBook): number {
  const basket = buildBasket(
    [{ recipeId: recipe.id, portions: recipe.baseServings }],
    { [recipe.id]: recipe },
    book,
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

// --- overlap ---------------------------------------------------------------
//
// The student waste problem isn't "I bought food I didn't like", it's "I bought
// a 1kg bag of potatoes for one recipe and the rest went soft in the cupboard".
//
// The fix is to stop treating a recipe's cost as a fixed number. What a recipe
// actually costs depends on what you've ALREADY picked: if the potatoes are in
// the trolley anyway, a second recipe using them is close to free. That number
// is the marginal cost, and it's what the deck should sort on.

export interface Marginal {
  /** Pence this recipe would add to your shop, given what you've picked. */
  addedCost: number
  /** What it costs on its own, ignoring everything else. */
  standaloneCost: number
  /** Names of ingredients it shares with your existing picks. */
  reuses: string[]
}

export function marginalCost(
  already: Selection[],
  candidate: Selection,
  recipeById: Record<string, Recipe>,
  book: PriceBook,
): Marginal {
  const before = buildBasket(already, recipeById, book)
  const after = buildBasket([...already, candidate], recipeById, book)
  const alone = buildBasket([candidate], recipeById, book)

  const owned = new Set(
    before.lines.filter(l => !l.ingredient.staple).map(l => l.ingredient.id),
  )
  const recipe = recipeById[candidate.recipeId]
  const reuses = recipe
    ? recipe.ingredients
        .filter(ri => owned.has(ri.ingredientId))
        .map(ri => book[ri.ingredientId]?.name)
        .filter((n): n is string => !!n)
    : []

  return {
    addedCost: Math.max(0, after.buyTotal - before.buyTotal),
    standaloneCost: alone.buyTotal,
    reuses,
  }
}

/** Goal-aware ordering, so the deck opens with cards you are likely to want. */
/**
 * A stable pseudo-random number in [-1, 1] for a recipe under a given seed.
 * Stable matters: the deck must not reshuffle itself on every render, but it
 * should look different next week.
 */
function jitter(id: string, seed: number): number {
  let h = seed >>> 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0)
  return ((h % 2000) / 1000) - 1
}

export function rankRecipes(
  recipes: Recipe[],
  setup: PlanSetup,
  book: PriceBook,
  /** What you've already picked. Pass it and the deck becomes overlap-aware. */
  already: Selection[] = [],
  recipeById: Record<string, Recipe> = {},
  /** Changes each week, so you don't get chilli first every single time. */
  seed = 0,
): Recipe[] {
  const overlapAware = already.length > 0
  const target = mainMeals(setup) / Math.max(1, setup.recipeCount)

  const scored = recipes.map(recipe => {
    let score = 0
    for (const goal of setup.goals) {
      if (recipe.tags.includes(goal)) score += 10
    }
    if (setup.goals.includes('high_protein')) score += recipe.proteinPerServing / 5
    if (setup.goals.includes('cheapest')) score -= costPerPortion(recipe, book) / 20
    if (setup.goals.includes('quick')) score -= recipe.minutes / 10

    // Once something is in the trolley, what matters is what each new recipe
    // ADDS, not what it costs alone. Weighted to outrank a single goal match,
    // because saving £3 of waste beats a nominally better-matching dish.
    if (overlapAware) {
      const m = marginalCost(
        already,
        { recipeId: recipe.id, portions: portionsForRecipe(recipe, target) },
        { ...recipeById, [recipe.id]: recipe },
        book,
      )
      score -= m.addedCost / 25
    }

    // Enough to shuffle recipes that score similarly, not enough to push a
    // goal match (worth 10) below something that doesn't match at all.
    score += jitter(recipe.id, seed) * 8

    return { recipe, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.recipe)
}
