import { useMemo, useState } from 'react'
import { buildBasket, costPerPortion, money } from '../lib/cost'
import type { PriceBook } from '../lib/prices'
import type { Recipe } from '../types'
import { EQUIPMENT_ICON } from '../types'

interface Props {
  recipes: Recipe[]
  book: PriceBook
  onCook: (recipeId: string, portions: number) => void
  onBack: () => void
}

/**
 * One meal, no weekly plan. This is the "it's 6pm and I want to cook something"
 * path - you pick a dish, you get its shopping list, done.
 */
export function SingleMealScreen({ recipes, book, onCook, onBack }: Props) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Recipe | null>(null)
  const [portions, setPortions] = useState(2)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? recipes.filter(r => `${r.name} ${r.blurb} ${r.tags.join(' ')}`.toLowerCase().includes(q))
      : recipes
    return [...list].sort((a, b) => a.minutes - b.minutes)
  }, [recipes, search])

  const cost = useMemo(() => {
    if (!picked) return null
    return buildBasket([{ recipeId: picked.id, portions }], { [picked.id]: picked }, book)
  }, [picked, portions, book])

  if (picked && cost) {
    return (
      <div className="screen">
        <h1>{picked.name}</h1>
        <p className="sub">{picked.blurb}</p>

        <div className="stepper">
          <div>
            <div className="label">Portions</div>
            <div className="hint">Extra ones keep for tomorrow</div>
          </div>
          <div className="ctrl">
            <button onClick={() => setPortions(Math.max(1, portions - 1))} disabled={portions <= 1}>−</button>
            <span className="val">{portions}</span>
            <button onClick={() => setPortions(Math.min(8, portions + 1))} disabled={portions >= 8}>+</button>
          </div>
        </div>

        <div className="panel">
          <div className="money-row total">
            <span className="k">The shop</span>
            <span className="v">{money(cost.buyTotal)}</span>
          </div>
          <div className="money-row">
            <span className="k">Food you'll actually eat</span>
            <span className="v">{money(cost.eatenTotal)}</span>
          </div>
          <div className="money-row">
            <span className="k">Per portion</span>
            <span className="v">{money(Math.round(cost.eatenTotal / portions))}</span>
          </div>
          <p className="tiny" style={{ textAlign: 'left', marginTop: 8 }}>
            You still buy whole packs, so a one-off costs more per portion than
            the same dish inside a week's plan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={() => setPicked(null)}>Back</button>
          <button className="btn" onClick={() => onCook(picked.id, portions)}>
            Cook this
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Just one meal</h1>
      <p className="sub">
        No plan, no swiping. Pick something, get the shopping list for it, cook
        it tonight. Quickest first.
      </p>

      <input
        className="search"
        placeholder="What do you fancy?"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {shown.map(r => (
        <button
          className="recipe-row"
          key={r.id}
          onClick={() => { setPicked(r); setPortions(r.baseServings) }}
        >
          <span className="emoji">{r.emoji}</span>
          <span className="text">
            <span className="n">{r.name}</span>
            <span className="d">
              {r.minutes} min · {money(costPerPortion(r, book))} a portion ·{' '}
              {r.equipment.length > 0
                ? r.equipment.map(e => EQUIPMENT_ICON[e]).join(' ')
                : 'no cooking'}
            </span>
          </span>
          <span className="chev">›</span>
        </button>
      ))}

      {shown.length === 0 && (
        <p className="tiny" style={{ marginTop: 24 }}>Nothing matches "{search}".</p>
      )}

      <button className="btn ghost" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
        Back to the kitchen
      </button>
    </div>
  )
}
