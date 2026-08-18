import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETUP, type PlanSetup } from '../types'
import type { Selection } from './cost'
import type { Overrides, PriceOverride } from './prices'
import type { RecipeOverride, RecipeOverrides } from './recipeEdits'
import { MAX_SESSIONS, type Session } from './sessions'

const KEY = 'cooking-companion-v1'

export type Step =
  /** The kitchen. Everything hangs off here. */
  | 'home'
  /** One committed plan: its shopping list and its recipes. */
  | 'session'
  /** The linear planning flow. */
  | 'store' | 'goals' | 'equipment' | 'plan' | 'swipe' | 'week'
  /** Reached from home: browse the book, one-off meal, previous weeks. */
  | 'recipes' | 'single' | 'sessions'
  /** Off the linear flow: dip in from anywhere, come back where you were. */
  | 'prices'
  /** Editing one recipe, reached from your week. */
  | 'edit'

export interface AppState {
  setup: PlanSetup
  /** Recipes swiped right, most recent first. This is the "saved" pile. */
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
  /** Plans you committed to, newest last. Each one is self-contained. */
  sessions: Session[]
  /** The one you're currently shopping for and cooking from. */
  currentSessionId: string | null
}

const EMPTY: AppState = {
  setup: DEFAULT_SETUP,
  liked: [],
  passed: [],
  selections: [],
  cooked: [],
  prices: {},
  recipeEdits: {},
  sessions: [],
  currentSessionId: null,
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    // Merge over EMPTY so adding a field later never breaks an old save.
    return { ...EMPTY, ...JSON.parse(raw) }
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
      liked: s.liked.includes(id) ? s.liked : [id, ...s.liked],
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

  const setCurrentSession = useCallback((id: string | null) => {
    setState(s => ({ ...s, currentSessionId: id }))
  }, [])

  const resetRecipe = useCallback((id: string) => {
    setState(s => {
      const recipeEdits = { ...s.recipeEdits }
      delete recipeEdits[id]
      return { ...s, recipeEdits }
    })
  }, [])

  return {
    state, setState, patchSetup, like, pass, resetSwipes, setSelections,
    setPrice, resetPrices, setRecipeEdit, resetRecipe,
    addSession, updateSession, deleteSession, toggleIn, setCurrentSession,
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
