import { useState } from 'react'
import { RECIPES, RECIPE_BY_ID } from './data/recipes'
import { exportData, useAppState, type Step } from './lib/store'
import { EquipmentScreen, GoalsScreen, PlanScreen, StoreScreen } from './screens/Setup'
import { SwipeScreen } from './screens/Swipe'
import { WeekScreen } from './screens/Week'

const STEPS: Step[] = ['store', 'goals', 'equipment', 'plan', 'swipe', 'week']

export default function App() {
  const { state, patchSetup, like, pass, resetSwipes } = useAppState()
  const [step, setStep] = useState<Step>('store')

  const index = STEPS.indexOf(step)
  const go = (delta: number) => {
    const next = STEPS[index + delta]
    if (next) setStep(next)
  }

  // The one rule that stops you reaching a dead end: you need some kit.
  const canAdvance =
    step === 'equipment' ? state.setup.equipment.length > 0
    : step === 'swipe' ? state.liked.length > 0
    : true

  return (
    <div className="app">
      <div className="progress">
        {STEPS.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}
      </div>

      {step === 'store' && <StoreScreen setup={state.setup} patch={patchSetup} />}
      {step === 'goals' && <GoalsScreen setup={state.setup} patch={patchSetup} />}
      {step === 'equipment' && <EquipmentScreen setup={state.setup} patch={patchSetup} />}
      {step === 'plan' && <PlanScreen setup={state.setup} patch={patchSetup} recipes={RECIPES} />}

      {step === 'swipe' && (
        <SwipeScreen
          setup={state.setup}
          recipes={RECIPES}
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
          onBack={() => setStep('swipe')}
        />
      )}

      <div className="footer">
        {index > 0 && (
          <button className="btn ghost" onClick={() => go(-1)}>Back</button>
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
