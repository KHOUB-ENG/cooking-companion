import { useMemo, useState } from 'react'
import type { PlanSetup, Recipe, Unit } from '../types'
import { PRICES_CHECKED } from '../data/ingredients'
import type { PriceBook } from '../lib/prices'
import {
  buildBasket, groupByAisle, money, portionsForRecipe, scaledQty,
  sharedIngredients, type Selection,
} from '../lib/cost'

interface Props {
  setup: PlanSetup
  liked: string[]
  recipeById: Record<string, Recipe>
  book: PriceBook
  /** How many prices you have shelf-checked, for the honesty note. */
  corrected: number
  onBack: () => void
  onCheckPrices: () => void
  onEditRecipe: (id: string) => void
  /** Recipe ids you have changed, so the panel can say so. */
  editedRecipes: Set<string>
}

export function WeekScreen({
  setup, liked, recipeById, book, corrected,
  onBack, onCheckPrices, onEditRecipe, editedRecipes,
}: Props) {
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)

  const chosen = liked.slice(0, setup.recipeCount)
  const target = setup.days / Math.max(1, chosen.length)

  // Whole batches only - see portionsForRecipe. Each recipe gets its own
  // number, because a 2-serving stir fry and a 4-serving bake scale differently.
  const selections: Selection[] = useMemo(
    () => chosen
      .map(id => recipeById[id])
      .filter(Boolean)
      .map(r => ({ recipeId: r.id, portions: portionsForRecipe(r, target) })),
    [chosen, target, recipeById],
  )

  const portionsOf = (id: string) =>
    selections.find(s => s.recipeId === id)?.portions ?? 0

  const basket = useMemo(() => buildBasket(selections, recipeById, book), [selections, recipeById, book])
  const aisles = useMemo(() => groupByAisle(basket), [basket])
  const shared = useMemo(() => sharedIngredients(basket), [basket])

  const totalPortions = selections.reduce((n, sel) => n + sel.portions, 0)
  const spare = totalPortions - setup.days
  const over = basket.buyTotal > setup.budget
  const pct = Math.min(100, (basket.buyTotal / setup.budget) * 100)

  if (chosen.length === 0) {
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
        {chosen.length} {chosen.length === 1 ? 'recipe' : 'recipes'} · {totalPortions} portions ·
        covers {setup.days} {setup.days === 1 ? 'day' : 'days'}
        {spare > 0 && ` · ${spare} spare`}
      </p>

      {/* --- the money ----------------------------------------------------- */}
      <div className="panel">
        <div className="money-row total">
          <span className="k">The shop</span>
          <span className="v">{money(basket.buyTotal)}</span>
        </div>
        <div className={`bar ${over ? 'over' : ''}`}><i style={{ width: `${pct}%` }} /></div>
        <div className="money-row">
          <span className="k">
            {over
              ? `${money(basket.buyTotal - setup.budget)} over your ${money(setup.budget)} budget`
              : `${money(setup.budget - basket.buyTotal)} under budget`}
          </span>
        </div>

        <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />

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
          Thresholds are calibrated, not guessed. Pack sizes alone put a normal
          one-week shop around 50%, so red has to mean "the plan shape is wrong"
          (the 3-recipes-over-5-days case lands at 29%), not "shops sell bags".
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
        <p className="tiny" style={{ textAlign: 'left', marginTop: 10 }}>
          You buy whole packs, but you don't eat whole packs. The{' '}
          {money(basket.leftoverValue)} difference isn't wasted — it's next week's
          food, as long as you use it.
        </p>
      </div>

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
        <p className="tiny" style={{ textAlign: 'left' }}>
          Salt, oil, spices and stock cubes are assumed to be in your cupboard.
          Buying them all from scratch would add about {money(basket.stapleTotal)} once.
        </p>
      </div>

      {/* --- the recipes ---------------------------------------------------- */}
      <h2 style={{ marginTop: 24 }}>How to cook it</h2>
      {chosen.map(id => {
        const recipe = recipeById[id]
        if (!recipe) return null
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
                <br />
                <span className="d" style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {portionsOf(id)} portions · {recipe.minutes} min
                </span>
              </span>
              <span style={{ color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 8 }}>
                  You need
                </h4>
                {recipe.ingredients.map(ri => (
                  <div className="item" key={ri.ingredientId}>
                    <span className="n">{nameOf(book, ri.ingredientId)}</span>
                    <span className="d">
                      {formatQty(scaledQty(recipe, ri.qty, portionsOf(id)), unitOf(book, ri.ingredientId))}
                    </span>
                  </div>
                ))}

                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', margin: '20px 0 12px' }}>
                  Steps
                </h4>
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

// --- small helpers ----------------------------------------------------------


function nameOf(book: PriceBook, id: string): string {
  return book[id]?.name ?? id
}

function unitOf(book: PriceBook, id: string): Unit {
  return book[id]?.unit ?? 'g'
}

/** Round to something a human would actually measure. */
function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') {
    const n = Math.round(qty * 2) / 2
    return n === 1 ? '1' : `${n}`
  }
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}${unit === 'ml' ? 'l' : 'kg'}`
  return `${Math.round(qty)}${unit}`
}
