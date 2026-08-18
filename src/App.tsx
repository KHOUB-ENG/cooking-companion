import { useMemo, useState } from 'react'
import { INGREDIENTS } from './data/ingredients'
import { portionsForRecipe, type Selection } from './lib/cost'
import { buildPriceBook, editedCount } from './lib/prices'
import { bookAsList, buildRecipeBook, isRecipeEdited } from './lib/recipeEdits'
import { createSession, shoppingProgress } from './lib/sessions'
import { exportData, useAppState, type Step } from './lib/store'
import { EditRecipeScreen } from './screens/EditRecipe'
import { HomeScreen } from './screens/Home'
import { EquipmentScreen, GoalsScreen, PlanScreen, StoreScreen } from './screens/Setup'
import { PricesScreen } from './screens/Prices'
import { RecipeListScreen } from './screens/RecipeList'
import { SessionScreen } from './screens/Session'
import { SessionListScreen } from './screens/SessionList'
import { SingleMealScreen } from './screens/SingleMeal'
import { SwipeScreen } from './screens/Swipe'
import { WeekScreen } from './screens/Week'

/** The linear planning flow. Everything else hangs off the home screen. */
const STEPS: Step[] = ['store', 'goals', 'equipment', 'plan', 'swipe', 'week']

export default function App() {
  const {
    state, patchSetup, like, pass, resetSwipes,
    setPrice, resetPrices, setRecipeEdit, resetRecipe,
    addSession, deleteSession, toggleIn,
  } = useAppState()
  const [step, setStep] = useState<Step>('home')
  const [returnTo, setReturnTo] = useState<Step>('home')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)

  // Your corrections, layered over what ships in the code. Everything that
  // costs or cooks reads from these, never from the raw data files.
  const book = useMemo(() => buildPriceBook(state.prices), [state.prices])
  const recipeBook = useMemo(() => buildRecipeBook(state.recipeEdits), [state.recipeEdits])
  const recipeList = useMemo(() => bookAsList(recipeBook), [recipeBook])
  const editedRecipes = useMemo(
    () => new Set(Object.keys(state.recipeEdits).filter(id => isRecipeEdited(state.recipeEdits, id))),
    [state.recipeEdits],
  )
  const corrected = editedCount(state.prices)

  const current = state.sessions.find(s => s.id === state.currentSessionId) ?? null
  const viewing = state.sessions.find(s => s.id === viewingId) ?? null

  const shopNote = useMemo(() => {
    if (!current) return state.liked.length > 0 ? 'Plan not saved yet' : 'No plan yet'
    const p = shoppingProgress(current)
    return p.done === p.total ? 'All bought' : `${p.done}/${p.total} bought`
  }, [current, state.liked.length])

  const index = STEPS.indexOf(step)
  const inFlow = index >= 0
  const go = (delta: number) => {
    const next = STEPS[index + delta]
    if (next) setStep(next)
    else if (index + delta < 0) setStep('home')
  }

  const openAside = (target: Step) => {
    setReturnTo(step)
    setStep(target)
  }

  const openEditor = (id: string) => {
    setReturnTo(step)
    setEditingId(id)
    setStep('edit')
  }

  const openSession = (id: string, from: Step) => {
    setReturnTo(from)
    setViewingId(id)
    setStep('session')
  }

  /** Freeze the current plan into a session and go straight to shopping. */
  const saveWeek = () => {
    const chosen = state.liked.slice(0, state.setup.recipeCount)
    const target = state.setup.days / Math.max(1, chosen.length)
    const selections: Selection[] = chosen
      .map(id => recipeBook[id])
      .filter(Boolean)
      .map(r => ({ recipeId: r.id, portions: portionsForRecipe(r, target) }))
    if (selections.length === 0) return
    const session = createSession('week', state.setup, selections, recipeBook, book)
    addSession(session)
    setViewingId(session.id)
    setReturnTo('home')
    setStep('session')
  }

  const cookSingle = (recipeId: string, portions: number) => {
    const session = createSession(
      'single', state.setup, [{ recipeId, portions }], recipeBook, book,
    )
    addSession(session)
    setViewingId(session.id)
    setReturnTo('home')
    setStep('session')
  }

  const canAdvance =
    step === 'equipment' ? state.setup.equipment.length > 0
    : step === 'swipe' ? state.liked.length > 0
    : true

  // --- screens that stand on their own -------------------------------------

  if (step === 'home') {
    return (
      <div className="app">
        <HomeScreen
          shopNote={shopNote}
          pastCount={state.sessions.length}
          recipeCount={recipeList.length}
          pricesChecked={corrected}
          pricesTotal={INGREDIENTS.length}
          onStart={() => setStep('store')}
          onShoppingList={() => {
            if (current) openSession(current.id, 'home')
            else setStep(state.liked.length > 0 ? 'week' : 'store')
          }}
          onSingleMeal={() => openAside('single')}
          onPastWeeks={() => openAside('sessions')}
          onRecipes={() => openAside('recipes')}
          onPrices={() => openAside('prices')}
          onExport={() => exportData(state)}
        />
      </div>
    )
  }

  if (step === 'session' && viewing) {
    return (
      <div className="app">
        <SessionScreen
          session={viewing}
          onToggle={toggleIn}
          onDelete={id => { deleteSession(id); setViewingId(null); setStep('home') }}
          onBack={() => { setViewingId(null); setStep(returnTo) }}
          backLabel={returnTo === 'sessions' ? 'Back to past weeks' : 'Back to the kitchen'}
        />
      </div>
    )
  }

  if (step === 'sessions') {
    return (
      <div className="app">
        <SessionListScreen
          sessions={state.sessions}
          currentId={state.currentSessionId}
          onOpen={id => openSession(id, 'sessions')}
          onBack={() => setStep('home')}
        />
      </div>
    )
  }

  if (step === 'single') {
    return (
      <div className="app">
        <SingleMealScreen
          recipes={recipeList}
          book={book}
          onCook={cookSingle}
          onBack={() => setStep('home')}
        />
      </div>
    )
  }

  if (step === 'prices') {
    return (
      <div className="app">
        <PricesScreen
          overrides={state.prices}
          book={book}
          onSet={setPrice}
          onResetAll={resetPrices}
          onDone={() => setStep(returnTo)}
        />
      </div>
    )
  }

  if (step === 'recipes') {
    return (
      <div className="app">
        <RecipeListScreen
          recipes={recipeList}
          book={book}
          editedRecipes={editedRecipes}
          onEdit={openEditor}
          onBack={() => setStep('home')}
        />
      </div>
    )
  }

  if (step === 'edit' && editingId && recipeBook[editingId]) {
    return (
      <div className="app">
        <EditRecipeScreen
          recipe={recipeBook[editingId]}
          edited={editedRecipes.has(editingId)}
          onSave={setRecipeEdit}
          onReset={resetRecipe}
          onClose={() => { setEditingId(null); setStep(returnTo) }}
        />
      </div>
    )
  }

  // --- the planning flow ----------------------------------------------------

  return (
    <div className="app">
      <div className="progress">
        {STEPS.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}
      </div>

      {step === 'store' && (
        <StoreScreen setup={state.setup} patch={patchSetup} onCheckPrices={() => openAside('prices')} corrected={corrected} />
      )}
      {step === 'goals' && <GoalsScreen setup={state.setup} patch={patchSetup} />}
      {step === 'equipment' && <EquipmentScreen setup={state.setup} patch={patchSetup} />}
      {step === 'plan' && <PlanScreen setup={state.setup} patch={patchSetup} recipes={recipeList} />}

      {step === 'swipe' && (
        <SwipeScreen
          setup={state.setup}
          recipes={recipeList}
          book={book}
          liked={state.liked}
          passed={state.passed}
          onLike={like}
          onPass={pass}
          onReset={resetSwipes}
        />
      )}

      {step === 'week' && (
        <WeekScreen
          setup={state.setup}
          liked={state.liked}
          recipeById={recipeBook}
          book={book}
          corrected={corrected}
          editedRecipes={editedRecipes}
          onBack={() => setStep('swipe')}
          onCheckPrices={() => openAside('prices')}
          onEditRecipe={openEditor}
        />
      )}

      <div className="footer">
        {inFlow && (
          <button className="btn ghost" onClick={() => (step === 'week' ? setStep('home') : go(-1))}>
            {step === 'store' || step === 'week' ? 'Home' : 'Back'}
          </button>
        )}

        {step === 'week' ? (
          <button className="btn" onClick={saveWeek} disabled={state.liked.length === 0}>
            Lock in this week
          </button>
        ) : (
          <button className="btn" disabled={!canAdvance} onClick={() => go(1)}>
            {step === 'swipe'
              ? `Build my week (${state.liked.length})`
              : step === 'plan'
                ? 'Start swiping'
                : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}
