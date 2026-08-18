import { useMemo, useState } from 'react'
import { PRICES_CHECKED } from '../data/ingredients'
import {
  buildBasket, buildSelections, groupByAisle, money, scaledQty,
  sharedIngredients, type Pantry,
} from '../lib/cost'
import type { PriceBook } from '../lib/prices'
import { mainMeals, type PlanSetup, type Recipe, type Unit } from '../types'

interface Props {
  setup: PlanSetup
  liked: string[]
  recipeById: Record<string, Recipe>
  book: PriceBook
  pantry: Pantry
  /** How many prices you have shelf-checked, for the honesty note. */
  corrected: number
  editedRecipes: Set<string>
  onSetPantry: (id: string, have: boolean | undefined) => void
  onBack: () => void
  onCheckPrices: () => void
  onEditRecipe: (id: string) => void
}

export function WeekScreen(props: Props) {
  const {
    setup, liked, recipeById, book, pantry, corrected, editedRecipes,
    onSetPantry, onBack, onCheckPrices, onEditRecipe,
  } = props
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)

  // buildSelections is the single source of truth for how much gets cooked, so
  // the costs here can't drift from what actually gets saved into the session.
  const selections = useMemo(
    () => buildSelections(setup, liked, recipeById),
    [setup, liked, recipeById],
  )
  const portionsOf = (id: string) =>
    selections.find(s => s.recipeId === id)?.portions ?? 0

  const basket = useMemo(
    () => buildBasket(selections, recipeById, book, pantry),
    [selections, recipeById, book, pantry],
  )
  const aisles = useMemo(() => groupByAisle(basket), [basket])
  const shared = useMemo(() => sharedIngredients(basket), [basket])

  /** Every cupboard staple this plan needs, and what you've said about it. */
  const cupboard = useMemo(
    () => basket.lines.filter(l => l.ingredient.staple),
    [basket],
  )
  const unanswered = cupboard.filter(l => pantry[l.ingredient.id] === undefined)

  const meals = mainMeals(setup)
  const totalPortions = selections.reduce((n, s) => n + s.portions, 0)
  const spare = totalPortions - meals - setup.breakfasts

  if (selections.length === 0) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="big">🍽️</div>
          <h2>Nothing picked yet</h2>
          <p>Swipe on a few recipes first.</p>
          <button className="link" style={{ marginTop: 20 }} onClick={onBack}>Back to the deck</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Your week</h1>
      <p className="sub">
        {selections.length} {selections.length === 1 ? 'recipe' : 'recipes'} ·{' '}
        {totalPortions} portions · covers {meals} {meals === 1 ? 'meal' : 'meals'}
        {setup.breakfasts > 0 && ` + ${setup.breakfasts} breakfasts`}
        {spare > 0 && ` · ${spare} spare`}
      </p>

      {/* --- the money ----------------------------------------------------- */}
      <div className="panel">
        <div className="money-row total">
          <span className="k">The shop</span>
          <span className="v">{money(basket.buyTotal)}</span>
        </div>
        <p className="tiny" style={{ textAlign: 'left', margin: '2px 0 12px' }}>
          What you hand over at the till — whole packs, not portions.
        </p>

        <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 8px' }} />

        <div className="money-row">
          <span className="k">Food you'll actually eat</span>
          <span className="v">{money(basket.eatenTotal)}</span>
        </div>
        <div className="money-row">
          <span className="k">Left in the cupboard after</span>
          <span className="v">{money(basket.leftoverValue)}</span>
        </div>
        <div className="money-row">
          <span className="k">Per portion, honestly</span>
          <span className="v">{money(Math.round(basket.eatenTotal / totalPortions))}</span>
        </div>
        {/*
          Calibrated, not guessed: pack sizes alone put a normal one-week shop
          near 50%, so red means the plan shape is wrong, not "shops sell bags".
        */}
        <div className="money-row">
          <span className="k">You'll use</span>
          <span
            className="v"
            style={{
              color: basket.efficiency < 0.45 ? 'var(--no)'
                : basket.efficiency >= 0.7 ? 'var(--yes)'
                : 'var(--text)',
            }}
          >
            {Math.round(basket.efficiency * 100)}% of it
          </span>
        </div>
      </div>

      {/* --- cupboard check ------------------------------------------------ */}
      {cupboard.length > 0 && (
        <div className="panel">
          <h2>Check your cupboard</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
            {unanswered.length > 0
              ? `${unanswered.length} still to check. Oil, spices and the like last a term, so they only go on the list if you say you need them.`
              : 'All answered. Anything you said you need is on the shopping list below.'}
          </p>

          {cupboard.map(l => {
            const state = pantry[l.ingredient.id]
            return (
              <div className={`cupboard-row ${state === undefined ? 'ask' : ''}`} key={l.ingredient.id}>
                <span className="text">
                  <span className="n">{l.ingredient.name}</span>
                  <span className="d">{l.ingredient.packLabel} · {money(l.ingredient.pack.price)}</span>
                </span>
                <span className="choice">
                  <button
                    className={state === true ? 'on' : ''}
                    onClick={() => onSetPantry(l.ingredient.id, state === true ? undefined : true)}
                  >
                    Got it
                  </button>
                  <button
                    className={state === false ? 'on need' : ''}
                    onClick={() => onSetPantry(l.ingredient.id, state === false ? undefined : false)}
                  >
                    Need it
                  </button>
                </span>
              </div>
            )
          })}
          <p className="tiny" style={{ textAlign: 'left', marginTop: 10 }}>
            Answers are remembered, so you won't be asked about the same olive
            oil every week.
          </p>
        </div>
      )}

      {/* --- leftover chaining -------------------------------------------- */}
      {shared.length > 0 && (
        <div className="panel">
          <h2>Nothing gets wasted</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>
            These get used more than once, so they won't rot in the fridge:
          </p>
          {shared.map(l => (
            <div className="item" key={l.ingredient.id}>
              <span>
                <span className="n">{l.ingredient.name}</span>
                <br />
                <span className="d">{l.usedBy.join(' + ')}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* --- the shopping list --------------------------------------------- */}
      <div className="panel">
        <h2>Shopping list</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          In the order you'll walk round the shop.
        </p>
        {aisles.map(g => (
          <div className="aisle" key={g.aisle}>
            <h4>{g.label}</h4>
            {g.lines.map(l => (
              <div className="item" key={l.ingredient.id}>
                <span>
                  <span className="n">
                    {l.packs > 1 ? `${l.packs} × ` : ''}{l.ingredient.name}
                  </span>
                  <br />
                  <span className="d">
                    {l.ingredient.packLabel}
                    {l.leftover > 0.5 && ` · ${formatQty(l.leftover, l.ingredient.unit)} spare`}
                  </span>
                </span>
                <span className="p">{money(l.buyCost)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="money-row total" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span className="k">Total</span>
          <span className="v">{money(basket.buyTotal)}</span>
        </div>
      </div>

      {/* --- the recipes ---------------------------------------------------- */}
      <h2 style={{ marginTop: 24 }}>How to cook it</h2>
      {selections.map(sel => {
        const recipe = recipeById[sel.recipeId]
        if (!recipe) return null
        const id = recipe.id
        const open = openRecipe === id
        return (
          <div className="panel" key={id}>
            <button
              onClick={() => setOpenRecipe(open ? null : id)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
            >
              <span>
                <span style={{ fontSize: 26, marginRight: 10 }}>{recipe.emoji}</span>
                <span style={{ fontWeight: 650 }}>{recipe.name}</span>
                {editedRecipes.has(id) && <span className="badge" style={{ marginLeft: 8 }}>yours</span>}
                {recipe.tags.includes('breakfast') && (
                  <span className="badge quiet" style={{ marginLeft: 8 }}>breakfast</span>
                )}
                <br />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {portionsOf(id)} portions · {recipe.minutes} min
                </span>
              </span>
              <span style={{ color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
              <div style={{ marginTop: 16 }}>
                <h4 className="mini-head">You need</h4>
                {recipe.ingredients.map(ri => (
                  <div className="item" key={ri.ingredientId}>
                    <span className="n">{book[ri.ingredientId]?.name ?? ri.ingredientId}</span>
                    <span className="d">
                      {formatQty(
                        scaledQty(recipe, ri.qty, portionsOf(id)),
                        book[ri.ingredientId]?.unit ?? 'g',
                      )}
                    </span>
                  </div>
                ))}

                <h4 className="mini-head" style={{ marginTop: 20 }}>Steps</h4>
                <ol className="steps">
                  {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>

                {recipe.tip && <div className="tip"><b>Don't get it wrong:</b> {recipe.tip}</div>}

                <button
                  className="btn ghost"
                  style={{ width: '100%', marginTop: 14 }}
                  onClick={() => onEditRecipe(id)}
                >
                  {editedRecipes.has(id) ? 'Edit your version' : 'Change this recipe'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      <p className="tiny">
        {corrected > 0
          ? `${corrected} of these prices you checked yourself. The rest are supermarket averages from ${PRICES_CHECKED}.`
          : `Every price here is an average estimate from ${PRICES_CHECKED}, not a real shelf label.`}
        {' '}
        <button className="link" onClick={onCheckPrices}>Check prices</button>
      </p>
    </div>
  )
}

/** Round to something a human would actually measure. */
function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') {
    const n = Math.round(qty * 2) / 2
    return `${n}`
  }
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}${unit === 'ml' ? 'l' : 'kg'}`
  return `${Math.round(qty)}${unit}`
}
