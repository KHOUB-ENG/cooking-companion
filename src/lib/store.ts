import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETUP, type PlanSetup } from '../types'
import type { Pantry, Selection } from './cost'
import type { Overrides, PriceOverride } from './prices'
import type { RecipeOverride, RecipeOverrides } from './recipeEdits'
import type { Recipe } from '../types'
import { MAX_SESSIONS, type Session } from './sessions'

const KEY = 'cooking-companion-v1'

export type Step =
  /** The kitchen. Everything hangs off here. */
  | 'home'
  /** One committed plan: its shopping list and its recipes. */
  | 'session'
  /** The linear planning flow. */
  | 'goals' | 'equipment' | 'plan' | 'swipe' | 'week'
  /** Reached from home: browse the book, one-off meal, previous weeks. */
  | 'recipes' | 'single' | 'sessions'
  /** Full-screen, one step at a time, while you're actually cooking. */
  | 'cook'
  /** Off the linear flow: dip in from anywhere, come back where you were. */
  | 'prices'
  /** Editing one recipe, reached from your week. */
  | 'edit'

export interface AppState {
  setup: PlanSetup
  /** Recipes swiped right, in pick order - they fill the week's cooks in turn. */
  liked: string[]
  /** Swiped left. Kept so the deck does not keep showing them. */
  passed: string[]
  /** What is actually in this week's plan. */
  selections: Selection[]
  /** Recipes you have cooked and would cook again. Resurfaces them first. */
  cooked: string[]
  /** Your shelf-checked prices. These beat whatever ships in the code. */
  prices: Overrides
  /** Your changes to recipes you've cooked. Also beat the shipped versions. */
  recipeEdits: RecipeOverrides
  /** Recipes you added yourself. */
  customRecipes: Recipe[]
  /** Plans you committed to, newest last. Each one is self-contained. */
  sessions: Session[]
  /** The one you're currently shopping for and cooking from. */
  currentSessionId: string | null
  /**
   * What's in your cupboard. Remembered across weeks - buy olive oil once and
   * you shouldn't be asked about it every Sunday.
   */
  pantry: Pantry
}

const EMPTY: AppState = {
  setup: DEFAULT_SETUP,
  liked: [],
  passed: [],
  selections: [],
  cooked: [],
  prices: {},
  recipeEdits: {},
  customRecipes: [],
  sessions: [],
  currentSessionId: null,
  pantry: {},
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw) as Partial<AppState>

    // Merge over the defaults so adding a field later never breaks an old save.
    // `setup` needs its own merge, not the top-level one: a save written before
    // lunches/dinners existed would otherwise replace the whole object and
    // leave those fields undefined, which reaches the UI as NaN.
    return {
      ...EMPTY,
      ...saved,
      setup: { ...DEFAULT_SETUP, ...(saved.setup ?? {}) },
    }
  } catch {
    return EMPTY
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked (private browsing). The app still works for
      // this session - it just will not remember. Not worth interrupting.
    }
  }, [state])

  const patchSetup = useCallback((patch: Partial<PlanSetup>) => {
    setState(s => ({ ...s, setup: { ...s.setup, ...patch } }))
  }, [])

  const like = useCallback((id: string) => {
    setState(s => ({
      ...s,
      // Appended, not prepended: the first thing you pick is cook one.
      liked: s.liked.includes(id) ? s.liked : [...s.liked, id],
      passed: s.passed.filter(p => p !== id),
    }))
  }, [])

  const pass = useCallback((id: string) => {
    setState(s => ({
      ...s,
      passed: s.passed.includes(id) ? s.passed : [id, ...s.passed],
      liked: s.liked.filter(l => l !== id),
    }))
  }, [])

  /** Take a pick back out of the plan without banishing it from the deck. */
  const unlike = useCallback((id: string) => {
    setState(s => ({ ...s, liked: s.liked.filter(l => l !== id) }))
  }, [])

  const resetSwipes = useCallback(() => {
    setState(s => ({ ...s, liked: [], passed: [], selections: [] }))
  }, [])

  const setSelections = useCallback((selections: Selection[]) => {
    setState(s => ({ ...s, selections }))
  }, [])

  const setPrice = useCallback((id: string, patch: PriceOverride | null) => {
    setState(s => {
      const prices = { ...s.prices }
      // null means "forget my correction and go back to the shipped estimate".
      if (patch === null) delete prices[id]
      else prices[id] = { ...prices[id], ...patch, checked: new Date().toISOString().slice(0, 10) }
      return { ...s, prices }
    })
  }, [])

  const resetPrices = useCallback(() => {
    setState(s => ({ ...s, prices: {} }))
  }, [])

  const setRecipeEdit = useCallback((id: string, patch: RecipeOverride) => {
    setState(s => ({ ...s, recipeEdits: { ...s.recipeEdits, [id]: patch } }))
  }, [])

  const addSession = useCallback((session: Session) => {
    setState(s => ({
      ...s,
      // Oldest first, capped - localStorage is small and this is a phone.
      sessions: [...s.sessions, session].slice(-MAX_SESSIONS),
      currentSessionId: session.id,
      // The plan is committed, so the deck starts clean next time. Without this
      // your second week opens with last week's picks already made.
      liked: [],
      passed: [],
    }))
  }, [])

  const updateSession = useCallback((id: string, patch: Partial<Session>) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(x => (x.id === id ? { ...x, ...patch } : x)),
    }))
  }, [])

  const deleteSession = useCallback((id: string) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.filter(x => x.id !== id),
      currentSessionId: s.currentSessionId === id ? null : s.currentSessionId,
    }))
  }, [])

  /** Tick an ingredient off in the shop, or a recipe off once you've cooked it. */
  const toggleIn = useCallback((id: string, field: 'bought' | 'cooked', value: string) => {
    setState(s => ({
      ...s,
      sessions: s.sessions.map(x => {
        if (x.id !== id) return x
        const list = x[field]
        return {
          ...x,
          [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
        }
      }),
    }))
  }, [])

  const setPantry = useCallback((id: string, have: boolean | undefined) => {
    setState(s => {
      const pantry = { ...s.pantry }
      if (have === undefined) delete pantry[id]
      else pantry[id] = have
      return { ...s, pantry }
    })
  }, [])

  const setCurrentSession = useCallback((id: string | null) => {
    setState(s => ({ ...s, currentSessionId: id }))
  }, [])

  const addCustomRecipe = useCallback((recipe: Recipe) => {
    setState(s => ({ ...s, customRecipes: [...s.customRecipes, recipe] }))
  }, [])

  const deleteCustomRecipe = useCallback((id: string) => {
    setState(s => ({
      ...s,
      customRecipes: s.customRecipes.filter(r => r.id !== id),
      liked: s.liked.filter(l => l !== id),
    }))
  }, [])

  const resetRecipe = useCallback((id: string) => {
    setState(s => {
      const recipeEdits = { ...s.recipeEdits }
      delete recipeEdits[id]
      return { ...s, recipeEdits }
    })
  }, [])

  return {
    state, setState, patchSetup, like, pass, unlike, resetSwipes, setSelections,
    setPrice, resetPrices, setRecipeEdit, resetRecipe, addCustomRecipe, deleteCustomRecipe,
    addSession, updateSession, deleteSession, toggleIn, setCurrentSession, setPantry,
  }
}

/**
 * Backup. Everything lives in this phone's browser storage, so there is one
 * copy and no server holding a spare. This dumps the lot to a file.
 */
export function exportData(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cooking-companion-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
