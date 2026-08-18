import { useMemo, useState } from 'react'
import { groupByAisle, money, scaledQty } from '../lib/cost'
import {
  relativeDay, sessionBasket, sessionPortions, shoppingProgress, type Session,
} from '../lib/sessions'
import type { Unit } from '../types'

interface Props {
  session: Session
  onToggle: (id: string, field: 'bought' | 'cooked', value: string) => void
  onDelete: (id: string) => void
  onCook: (recipeId: string) => void
  onBack: () => void
  backLabel: string
}

export function SessionScreen({ session, onToggle, onDelete, onCook, onBack, backLabel }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Everything here comes from the session's own frozen copies, so a price
  // correction or recipe edit made since never changes what this says.
  const basket = useMemo(() => sessionBasket(session), [session])
  const aisles = useMemo(() => groupByAisle(basket), [basket])
  const progress = shoppingProgress(session)
  const portions = sessionPortions(session)
  const allBought = progress.total > 0 && progress.done === progress.total

  return (
    <div className="screen">
      <h1>{session.label}</h1>
      <p className="sub">
        {relativeDay(session.createdAt)} · {session.selections.length}{' '}
        {session.selections.length === 1 ? 'recipe' : 'recipes'} · {portions} portions
      </p>

      {/* --- the shop ------------------------------------------------------ */}
      <div className="panel">
        <div className="money-row total">
          <span className="k">The shop</span>
          <span className="v">{money(session.buyTotal)}</span>
        </div>
        <div className="bar">
          <i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
        </div>
        <div className="money-row">
          <span className="k">
            {allBought
              ? 'Everything ticked off'
              : `${progress.done} of ${progress.total} items in the trolley`}
          </span>
        </div>
      </div>

      {/* --- tickable shopping list ---------------------------------------- */}
      <div className="panel">
        <h2>Shopping list</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
          Tap an item as you put it in the trolley.
        </p>

        {aisles.map(g => (
          <div className="aisle" key={g.aisle}>
            <h4>{g.label}</h4>
            {g.lines.map(l => {
              const got = session.bought.includes(l.ingredient.id)
              return (
                <button
                  className={`shop-item ${got ? 'got' : ''}`}
                  key={l.ingredient.id}
                  onClick={() => onToggle(session.id, 'bought', l.ingredient.id)}
                >
                  <span className="tick" aria-hidden>{got ? '✓' : ''}</span>
                  <span className="text">
                    <span className="n">
                      {l.packs > 1 ? `${l.packs} × ` : ''}{l.ingredient.name}
                    </span>
                    <span className="d">{l.ingredient.packLabel}</span>
                  </span>
                  <span className="p">{money(l.buyCost)}</span>
                </button>
              )
            })}
          </div>
        ))}

        <div className="money-row total" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span className="k">Total</span>
          <span className="v">{money(session.buyTotal)}</span>
        </div>
      </div>

      {/* --- the cooking ---------------------------------------------------- */}
      <h2 style={{ marginTop: 24 }}>What you're cooking</h2>
      {session.selections.map(sel => {
        const recipe = session.recipes[sel.recipeId]
        if (!recipe) return null
        const isOpen = open === recipe.id
        const done = session.cooked.includes(recipe.id)
        return (
          <div className="panel" key={recipe.id}>
            <button
              onClick={() => setOpen(isOpen ? null : recipe.id)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
            >
              <span>
                <span style={{ fontSize: 26, marginRight: 10 }}>{recipe.emoji}</span>
                <span style={{ fontWeight: 650, textDecoration: done ? 'line-through' : 'none' }}>
                  {recipe.name}
                </span>
                {done && <span className="badge" style={{ marginLeft: 8 }}>cooked</span>}
                <br />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {sel.portions} portions · {recipe.minutes} min
                </span>
              </span>
              <span style={{ color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div style={{ marginTop: 16 }}>
                <h4 className="mini-head">You need</h4>
                {recipe.ingredients.map(ri => {
                  const ing = session.prices[ri.ingredientId]
                  return (
                    <div className="item" key={ri.ingredientId}>
                      <span className="n">{ing?.name ?? ri.ingredientId}</span>
                      <span className="d">
                        {formatQty(scaledQty(recipe, ri.qty, sel.portions), ing?.unit ?? 'g')}
                      </span>
                    </div>
                  )
                })}

                <h4 className="mini-head" style={{ marginTop: 20 }}>Steps</h4>
                <ol className="steps">
                  {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>

                {recipe.tip && <div className="tip"><b>Don't get it wrong:</b> {recipe.tip}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="btn ghost"
                    onClick={() => onToggle(session.id, 'cooked', recipe.id)}
                  >
                    {done ? 'Not cooked' : 'Mark cooked'}
                  </button>
                  <button className="btn" onClick={() => onCook(recipe.id)}>
                    Cook it now
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button className="btn ghost" style={{ width: '100%', marginTop: 16 }} onClick={onBack}>
        {backLabel}
      </button>

      {!confirmDelete ? (
        <button className="link danger" onClick={() => setConfirmDelete(true)}>
          Delete this {session.kind === 'single' ? 'meal' : 'week'}
        </button>
      ) : (
        <div className="confirm">
          <span>Delete it? This can't be undone.</span>
          <div>
            <button className="link" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button className="link danger" onClick={() => onDelete(session.id)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') {
    const n = Math.round(qty * 2) / 2
    return `${n}`
  }
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}${unit === 'ml' ? 'l' : 'kg'}`
  return `${Math.round(qty)}${unit}`
}
