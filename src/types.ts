// ---------------------------------------------------------------------------
// Data model. Money is ALWAYS integer pence - never floats, so totals can't
// drift by a penny. Quantities are always in the ingredient's own `unit`.
// ---------------------------------------------------------------------------

/** Shopping-list order. Roughly the walk through a UK supermarket. */
export type Aisle =
  | 'fruit_veg'
  | 'bakery'
  | 'meat_fish'
  | 'dairy_eggs'
  | 'tins_jars'
  | 'pasta_rice'
  | 'cupboard'
  | 'frozen'

export const AISLE_ORDER: Aisle[] = [
  'fruit_veg', 'bakery', 'meat_fish', 'dairy_eggs',
  'tins_jars', 'pasta_rice', 'cupboard', 'frozen',
]

export const AISLE_LABEL: Record<Aisle, string> = {
  fruit_veg: 'Fruit & veg',
  bakery: 'Bakery',
  meat_fish: 'Meat & fish',
  dairy_eggs: 'Dairy & eggs',
  tins_jars: 'Tins & jars',
  pasta_rice: 'Pasta & rice',
  cupboard: 'Cupboard',
  frozen: 'Frozen',
}

export type Equipment =
  | 'hob' | 'oven' | 'microwave' | 'airfryer'
  | 'kettle' | 'freezer' | 'blender' | 'toaster'

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  hob: 'Hob', oven: 'Oven', microwave: 'Microwave', airfryer: 'Air fryer',
  kettle: 'Kettle', freezer: 'Freezer', blender: 'Blender', toaster: 'Toaster',
}

export const EQUIPMENT_ICON: Record<Equipment, string> = {
  hob: '🔥', oven: '🌡️', microwave: '📻', airfryer: '🌀',
  kettle: '🫖', freezer: '❄️', blender: '🥤', toaster: '🍞',
}

export type Unit = 'g' | 'ml' | 'each'

export interface Ingredient {
  id: string
  name: string
  aisle: Aisle
  unit: Unit
  /** The pack the shop actually sells: `size` is in `unit`, `price` in pence. */
  pack: { size: number; price: number }
  /** How the pack reads on the shelf, e.g. "500g pack". */
  packLabel: string
  /**
   * Cupboard staples (salt, oil, spices). Assumed already owned, so they are
   * kept off the shopping list and out of the weekly total by default.
   */
  staple?: boolean
}

export type Goal = 'high_protein' | 'cheapest' | 'batch_freeze' | 'quick'

export const GOAL_LABEL: Record<Goal, string> = {
  high_protein: 'High protein',
  cheapest: 'As cheap as possible',
  batch_freeze: 'Batch cook & freeze',
  quick: 'Fast, minimum effort',
}

export type Diet = 'veggie' | 'no_pork' | 'no_beef' | 'no_fish' | 'no_nuts'

export const DIET_LABEL: Record<Diet, string> = {
  veggie: 'Vegetarian',
  no_pork: 'No pork',
  no_beef: 'No beef',
  no_fish: 'No fish',
  no_nuts: 'No nuts',
}

export type Tag = Goal | Diet | 'spicy' | 'one_pot' | 'breakfast'

export interface RecipeIngredient {
  ingredientId: string
  /** Amount for the whole recipe at `baseServings`, in the ingredient's unit. */
  qty: number
}

export interface Recipe {
  id: string
  name: string
  blurb: string
  /** Filename in /public/recipes. Missing images fall back to an emoji card. */
  image?: string
  emoji: string
  baseServings: number
  minutes: number
  /** 1 = anyone can do it, 3 = needs a bit of attention. */
  skill: 1 | 2 | 3
  /** ALL of these are required to cook it. Drives the hard equipment filter. */
  equipment: Equipment[]
  tags: Tag[]
  proteinPerServing: number
  ingredients: RecipeIngredient[]
  steps: string[]
  /** Shown on the week screen - the "you can't get this wrong" note. */
  tip?: string
}

// --- what the user builds up as they move through the app -------------------

export interface PlanSetup {
  goals: Goal[]
  diets: Diet[]
  equipment: Equipment[]
  /**
   * Meals you need covered, counted as meals rather than days - two dinners
   * and two lunches is four portions, however they fall across the week.
   */
  lunches: number
  dinners: number
  /** Breakfasts are picked separately, from breakfast recipes only. */
  breakfasts: number
  /** How many DIFFERENT main recipes. Fewer over more meals = batch cooking. */
  recipeCount: number
}

/** Lunches + dinners. Breakfasts are planned on their own. */
export function mainMeals(setup: PlanSetup): number {
  return setup.lunches + setup.dinners
}

export const DEFAULT_SETUP: PlanSetup = {
  goals: [],
  diets: [],
  equipment: ['hob', 'microwave', 'kettle', 'freezer'],
  lunches: 2,
  dinners: 4,
  breakfasts: 0,
  recipeCount: 2,
}
