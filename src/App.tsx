import { useMemo, useState } from 'react'
import { INGREDIENTS } from './data/ingredients'
import { buildPriceBook, editedCount } from './lib/prices'
import { bookAsList, buildRecipeBook, isRecipeEdited } from './lib/recipeEdits'
import { exportData, useAppState, type Step } from './lib/store'
import { EditRecipeScreen } from './screens/EditRecipe'
import { ComingSoonScreen, HomeScreen } from './screens/Home'
import { EquipmentScreen, GoalsScreen, PlanScreen, StoreScreen } from './screens/Setup'
import { PricesScreen } from './screens/Prices'
import { RecipeListScreen } from './screens/RecipeList'
import { SwipeScreen } from './screens/Swipe'
import { WeekScreen } from './screens/Week'

/** The linear planning flow. Everything else hangs off the home screen. */
const STEPS: Step[] = ['store', 'goals', 'equipment', 'plan', 'swipe', 'week']

export default function App() {
  const {
    state, patchSetup, like, pass, resetSwipes,
    setPrice, resetPrices, setRecipeEdit, resetRecipe,
  } = useAppState()
  const [step, setStep] = useState<Step>('home')
  const [returnTo, setReturnTo] = useState<Step>('home')
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const canAdvance =
    step === 'equipment' ? state.setup.equipment.length > 0
    : step === 'swipe' ? state.liked.length > 0
    : true

  // --- screens that stand on their own -------------------------------------

  if (step === 'home') {
    return (
      <div className="app">
        <HomeScreen
          hasPlan={state.liked.length > 0}
          recipeCount={recipeList.length}
          pricesChecked={corrected}
          pricesTotal={INGREDIENTS.length}
          onStart={() => setStep('store')}
          onShoppingList={() => setStep('week')}
          onSingleMeal={() => openAside('single')}
          onPastWeeks={() => openAside('sessions')}
          onRecipes={() => openAside('recipes')}
          onPrices={() => openAside('prices')}
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

  if (step === 'single') {
    return (
      <div className="app">
        <ComingSoonScreen
          title="Just one meal"
          body="Pick one recipe, get its shopping list, cook it tonight — no weekly plan. Not built yet: it needs somewhere to keep a one-off separate from your week."
          onBack={() => setStep('home')}
        />
      </div>
    )
  }

  if (step === 'sessions') {
    return (
      <div className="app">
        <ComingSoonScreen
          title="Past weeks"
          body="Every week you've planned, so you can pull up a recipe you cooked a fortnight ago. Not built yet: the app currently keeps only the week you're in."
          onBack={() => setStep('home')}
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
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => exportData(state)}>
            Back up my data
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
