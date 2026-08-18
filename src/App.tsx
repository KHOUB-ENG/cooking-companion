import { useMemo, useState } from 'react'
import { RECIPES, RECIPE_BY_ID } from './data/recipes'
import { buildPriceBook, editedCount } from './lib/prices'
import { exportData, useAppState, type Step } from './lib/store'
import { EquipmentScreen, GoalsScreen, PlanScreen, StoreScreen } from './screens/Setup'
import { PricesScreen } from './screens/Prices'
import { SwipeScreen } from './screens/Swipe'
import { WeekScreen } from './screens/Week'

/** The linear flow. 'prices' sits outside it - you dip into it and come back. */
const STEPS: Step[] = ['store', 'goals', 'equipment', 'plan', 'swipe', 'week']

export default function App() {
  const {
    state, patchSetup, like, pass, resetSwipes, setPrice, resetPrices,
  } = useAppState()
  const [step, setStep] = useState<Step>('store')
  const [returnTo, setReturnTo] = useState<Step>('store')

  // Your shelf-checked prices layered over the shipped estimates. Everything
  // that costs anything reads from this, never from the raw table.
  const book = useMemo(() => buildPriceBook(state.prices), [state.prices])
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
      {step === 'plan' && <PlanScreen setup={state.setup} patch={patchSetup} recipes={RECIPES} />}

      {step === 'swipe' && (
        <SwipeScreen
          setup={state.setup}
          recipes={RECIPES}
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
          recipeById={RECIPE_BY_ID}
          book={book}
          corrected={corrected}
          onBack={() => setStep('swipe')}
          onCheckPrices={openPrices}
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
