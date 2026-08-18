import { mainMeals, type Ingredient, type PlanSetup, type Recipe } from '../types'
import { buildBasket, type Basket, type Pantry, type Selection } from './cost'
import type { PriceBook } from './prices'
import type { RecipeBook } from './recipeEdits'

/**
 * A session is a plan you committed to: this is what I'm cooking, this is what
 * I'm buying.
 *
 * It stores its own COPY of the recipes and prices it was built from. That
 * matters: if you later add chilli to the bolognese, or correct the price of
 * mince, last month's session should still show what you actually cooked and
 * what you actually paid. History shouldn't quietly rewrite itself.
 *
 * The copies are small - only the recipes you picked and the ingredients they
 * use, not the whole book.
 */
export interface Session {
  id: string
  /** ISO date, so sorting is just a string compare. */
  createdAt: string
  kind: 'week' | 'single'
  label: string
  /** Meals this was meant to cover. 1 for a single meal. */
  meals: number
  selections: Selection[]
  /** Frozen recipes, keyed by id. */
  recipes: Record<string, Recipe>
  /** Frozen prices for the ingredients used. */
  prices: Record<string, Ingredient>
  /** What you said you had in the cupboard when you saved it. */
  pantry: Pantry
  /** What the shop came to when you saved it. */
  buyTotal: number
  eatenTotal: number
  /** Ingredient ids you've ticked off in the shop. */
  bought: string[]
  /** Recipe ids you've actually cooked. */
  cooked: string[]
}

/** Keep storage bounded - localStorage is small and this is a phone. */
export const MAX_SESSIONS = 60

function makeId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function formatLabel(kind: Session['kind'], date: Date, recipes: Recipe[]): string {
  if (kind === 'single') return recipes[0]?.name ?? 'One meal'
  return `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export function createSession(
  kind: Session['kind'],
  setup: PlanSetup,
  selections: Selection[],
  recipeBook: RecipeBook,
  priceBook: PriceBook,
  pantry: Pantry,
): Session {
  const now = new Date()

  // Freeze only what this session used.
  const recipes: Record<string, Recipe> = {}
  const prices: Record<string, Ingredient> = {}
  for (const sel of selections) {
    const recipe = recipeBook[sel.recipeId]
    if (!recipe) continue
    recipes[recipe.id] = structuredCloneSafe(recipe)
    for (const ri of recipe.ingredients) {
      const ing = priceBook[ri.ingredientId]
      if (ing) prices[ing.id] = structuredCloneSafe(ing)
    }
  }

  const frozenPantry: Pantry = { ...pantry }
  const basket = buildBasket(selections, recipes, prices, frozenPantry)

  return {
    id: makeId(),
    createdAt: now.toISOString(),
    kind,
    label: formatLabel(kind, now, Object.values(recipes)),
    meals: kind === 'single' ? 1 : mainMeals(setup),
    selections,
    recipes,
    prices,
    pantry: frozenPantry,
    buyTotal: basket.buyTotal,
    eatenTotal: basket.eatenTotal,
    bought: [],
    cooked: [],
  }
}

/** structuredClone isn't everywhere yet; these are plain JSON objects anyway. */
function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Recompute a session's basket from its own frozen data, never today's. */
export function sessionBasket(session: Session): Basket {
  return buildBasket(session.selections, session.recipes, session.prices, session.pantry ?? {})
}

export function sessionPortions(session: Session): number {
  return session.selections.reduce((n, s) => n + s.portions, 0)
}

/** Newest first. */
export function sortedSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function shoppingProgress(session: Session): { done: number; total: number } {
  const basket = sessionBasket(session)
  const lines = basket.lines.filter(l => l.inShop)
  return {
    done: lines.filter(l => session.bought.includes(l.ingredient.id)).length,
    total: lines.length,
  }
}

export function relativeDay(iso: string): string {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
