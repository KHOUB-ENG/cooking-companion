import {
  DIET_LABEL, EQUIPMENT_ICON, EQUIPMENT_LABEL, GOAL_LABEL,
  mainMeals,
  type Diet, type Equipment, type Goal, type PlanSetup, type Recipe,
} from '../types'
import { filterRecipes, shapeAdvice } from '../lib/cost'

interface Props {
  setup: PlanSetup
  patch: (p: Partial<PlanSetup>) => void
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

// --- 1. what are you going for this week? ----------------------------------

export function GoalsScreen({ setup, patch }: Props) {
  const goals = Object.keys(GOAL_LABEL) as Goal[]
  const diets = Object.keys(DIET_LABEL) as Diet[]

  return (
    <div className="screen">
      <h1>What are you after?</h1>
      <p className="sub">Pick as many as you like. This just decides what shows up first.</p>

      <h2>This week I want</h2>
      <div className="chips" style={{ marginBottom: 28 }}>
        {goals.map(g => (
          <button
            key={g}
            className={`chip ${setup.goals.includes(g) ? 'on' : ''}`}
            onClick={() => patch({ goals: toggle(setup.goals, g) })}
          >
            {GOAL_LABEL[g]}
          </button>
        ))}
      </div>

      <h2>Anything you don't eat?</h2>
      <div className="chips">
        {diets.map(d => (
          <button
            key={d}
            className={`chip ${setup.diets.includes(d) ? 'on' : ''}`}
            onClick={() => patch({ diets: toggle(setup.diets, d) })}
          >
            {DIET_LABEL[d]}
          </button>
        ))}
      </div>
    </div>
  )
}

// --- 2. what kit have you actually got? ------------------------------------

export function EquipmentScreen({ setup, patch }: Props) {
  const kit = Object.keys(EQUIPMENT_LABEL) as Equipment[]

  return (
    <div className="screen">
      <h1>What can you cook with?</h1>
      <p className="sub">
        Tap everything you have access to this week. Nothing you can't actually
        cook will ever appear.
      </p>
      <div className="grid">
        {kit.map(e => (
          <button
            key={e}
            className={`tile ${setup.equipment.includes(e) ? 'on' : ''}`}
            onClick={() => patch({ equipment: toggle(setup.equipment, e) })}
          >
            <span className="big">{EQUIPMENT_ICON[e]}</span>
            <span className="name">{EQUIPMENT_LABEL[e]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// --- 3. how much cooking, and for how much money? --------------------------

function Stepper(props: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  const { label, hint, value, min, max, step = 1, format, onChange } = props
  return (
    <div className="stepper">
      <div>
        <div className="label">{label}</div>
        <div className="hint">{hint}</div>
      </div>
      <div className="ctrl">
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>−</button>
        <span className="val">{format ? format(value) : value}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>+</button>
      </div>
    </div>
  )
}

interface PlanProps extends Props {
  recipes: Recipe[]
}

export function PlanScreen({ setup, patch, recipes }: PlanProps) {
  const eligible = filterRecipes(recipes, setup)
  const advice = shapeAdvice(setup, eligible)

  return (
    <div className="screen">
      <h1>How much cooking?</h1>
      <p className="sub">Count the meals you actually need covered. Fewer recipes over more meals means batch cooking — cheaper, and far less washing up.</p>

      <Stepper
        label="Lunches" hint="Meals you need for the day"
        value={setup.lunches} min={0} max={14}
        onChange={v => patch({ lunches: v })}
      />
      <Stepper
        label="Dinners" hint="Proper evening meals"
        value={setup.dinners} min={0} max={14}
        onChange={v => patch({ dinners: v })}
      />
      <Stepper
        label="Breakfasts" hint="Optional — picked from breakfast recipes"
        value={setup.breakfasts} min={0} max={14}
        onChange={v => patch({ breakfasts: v })}
      />
      <Stepper
        label="Different recipes" hint="How much variety you want"
        value={setup.recipeCount} min={1} max={5}
        onChange={v => patch({ recipeCount: v })}
      />

      <div
        className="panel"
        style={{
          marginTop: 20,
          borderColor: advice.level === 'over' ? 'var(--no)' : 'var(--line)',
        }}
      >
        <div className="money-row">
          <span className="k">
            {advice.level === 'over' ? 'This shape wastes food' : 'That works out as'}
          </span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45 }}>
          {advice.message}
        </div>

        {advice.level === 'over' && (
          <button
            className="btn"
            style={{ width: '100%', marginTop: 14 }}
            onClick={() => patch({ recipeCount: advice.recommended })}
          >
            Use {advice.recommended} {advice.recommended === 1 ? 'recipe' : 'recipes'} instead
          </button>
        )}

        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>
          {mainMeals(setup)} main {mainMeals(setup) === 1 ? 'meal' : 'meals'}
          {setup.breakfasts > 0 && `, plus ${setup.breakfasts} ${setup.breakfasts === 1 ? 'breakfast' : 'breakfasts'}`}.
        </div>
      </div>
    </div>
  )
}
