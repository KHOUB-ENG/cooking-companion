import { useMemo, useState } from 'react'
import { buildPriceBook, editedCount } from './lib/prices'
import { bookAsList, buildRecipeBook, isRecipeEdited } from './lib/recipeEdits'
import { exportData, useAppState, type Step } from './lib/store'
import { EditRecipeScreen } from './screens/EditRecipe'
import { EquipmentScreen, GoalsScreen, PlanScreen, StoreScreen } from './screens/Setup'
import { PricesScreen } from './screens/Prices'
import { SwipeScreen } from './screens/Swipe'
import { WeekScreen } from './screens/Week'

/** The linear flow. 'prices' and 'edit' sit outside it - dip in, come back. */
const STEPS: Step[] = ['store', 'goals', 'equipment', 'plan', 'swipe', 'week']

export default function App() {
  const {
    state, patchSetup, like, pass, resetSwipes,
    setPrice, resetPrices, setRecipeEdit, resetRecipe,
  } = useAppState()
  const [step, setStep] = useState<Step>('store')
  const [returnTo, setReturnTo] = useState<Step>('store')
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
  const go = (delta: number) => {
    const next = STEPS[index + delta]
    if (next) setStep(next)
  }

  const openPrices = () => {
    setReturnTo(step)
    setStep('prices')
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

  return (
    <div className="app">
      <div className="progress">
        {STEPS.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}
      </div>

      {step === 'store' && (
        <StoreScreen setup={state.setup} patch={patchSetup} onCheckPrices={openPrices} corrected={corrected} />
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
          onCheckPrices={openPrices}
          onEditRecipe={openEditor}
        />
      )}

      <div className="footer">
        {index > 0 && <button className="btn ghost" onClick={() => go(-1)}>Back</button>}

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
