import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlanSetup, Recipe } from '../types'
import { EQUIPMENT_ICON } from '../types'
import {
  costPerPortion, filterRecipes, marginalCost, money, portionsForRecipe,
  rankRecipes, type Marginal, type Selection,
} from '../lib/cost'
import type { PriceBook } from '../lib/prices'

interface Props {
  setup: PlanSetup
  recipes: Recipe[]
  book: PriceBook
  liked: string[]
  passed: string[]
  onLike: (id: string) => void
  onPass: (id: string) => void
  onReset: () => void
}

/** How far you have to drag before it counts as a decision. */
const THRESHOLD = 110

export function SwipeScreen({ setup, recipes, book, liked, passed, onLike, onPass, onReset }: Props) {
  const [search, setSearch] = useState('')
  const [dx, setDx] = useState(0)
  const [exiting, setExiting] = useState<{ id: string; dir: 1 | -1 } | null>(null)
  const dragStart = useRef<number | null>(null)

  const recipeById = useMemo(
    () => Object.fromEntries(recipes.map(r => [r.id, r])),
    [recipes],
  )

  /** What's already in the trolley, so new cards can be priced against it. */
  const already: Selection[] = useMemo(() => {
    const target = setup.days / Math.max(1, setup.recipeCount)
    return liked
      .slice(0, setup.recipeCount)
      .map(id => recipeById[id])
      .filter(Boolean)
      .map(r => ({ recipeId: r.id, portions: portionsForRecipe(r, target) }))
  }, [liked, setup.days, setup.recipeCount, recipeById])

  const queue = useMemo(() => {
    const eligible = filterRecipes(recipes, setup, search)
    const ranked = rankRecipes(eligible, setup, book, already, recipeById)
    return ranked.filter(r => !liked.includes(r.id) && !passed.includes(r.id))
  }, [recipes, setup, book, search, liked, passed, already, recipeById])

  /** How much the card on top would actually add to the shop. */
  const topMarginal: Marginal | null = useMemo(() => {
    const top = queue[0]
    if (!top || already.length === 0) return null
    const target = setup.days / Math.max(1, setup.recipeCount)
    return marginalCost(
      already,
      { recipeId: top.id, portions: portionsForRecipe(top, target) },
      recipeById,
      book,
    )
  }, [queue, already, setup.days, setup.recipeCount, recipeById, book])

  const enough = liked.length >= setup.recipeCount
  const top = queue[0]
  const next = queue[1]

  // Commit the decision once the card has flown off screen.
  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => {
      if (exiting.dir === 1) onLike(exiting.id)
      else onPass(exiting.id)
      setExiting(null)
      setDx(0)
    }, 180)
    return () => clearTimeout(t)
  }, [exiting, onLike, onPass])

  function decide(dir: 1 | -1) {
    if (!top || exiting) return
    setExiting({ id: top.id, dir })
  }

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return
    dragStart.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return
    setDx(e.clientX - dragStart.current)
  }

  function onPointerUp() {
    if (dragStart.current === null) return
    dragStart.current = null
    if (dx > THRESHOLD) decide(1)
    else if (dx < -THRESHOLD) decide(-1)
    else setDx(0)
  }

  // --- what the top card looks like right now -------------------------------
  const offset = exiting ? exiting.dir * 700 : dx
  const dragging = dragStart.current !== null
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${offset}px) rotate(${offset / 22}deg)`,
    transition: dragging ? 'none' : 'transform 0.18s ease-out',
  }

  if (!top) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="big">{liked.length > 0 ? '🎉' : '🤔'}</div>
          {liked.length > 0 ? (
            <>
              <h2>That's the lot</h2>
              <p>You've picked {liked.length}. Tap Build my week below.</p>
            </>
          ) : (
            <>
              <h2>Nothing matches</h2>
              <p>
                {search
                  ? 'Try a different search.'
                  : 'Your equipment or diet filters are ruling everything out. Go back and add some kit.'}
              </p>
            </>
          )}
          {(liked.length > 0 || passed.length > 0) && (
            <button className="link" style={{ marginTop: 20 }} onClick={onReset}>
              Start the deck again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <input
        className="search"
        placeholder="Fancy something in particular?"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="deck">
        {next && (
          <div className="card" style={{ transform: 'scale(0.96) translateY(10px)', opacity: 0.6 }}>
            <Art recipe={next} />
            <Body recipe={next} book={book} marginal={null} />
          </div>
        )}

        <div
          className="card"
          style={cardStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="stamp yes" style={{ opacity: Math.max(0, offset / THRESHOLD) }}>YES</span>
          <span className="stamp no" style={{ opacity: Math.max(0, -offset / THRESHOLD) }}>NOPE</span>
          <Art recipe={top} />
          <Body recipe={top} book={book} marginal={topMarginal} />
        </div>
      </div>

      <div className="swipe-actions">
        <button className="no" onClick={() => decide(-1)} aria-label="No thanks">✕</button>
        <button className="yes" onClick={() => decide(1)} aria-label="Yes please">♥</button>
      </div>

      <p className="tiny">
        {liked.length} picked{enough ? ' — enough for your plan' : ` of ${setup.recipeCount}`}
        {' · '}{queue.length} left to look at
      </p>
    </div>
  )
}

function Art({ recipe }: { recipe: Recipe }) {
  return (
    <div className="art">
      {recipe.image ? <img src={`/recipes/${recipe.image}`} alt="" draggable={false} /> : recipe.emoji}
    </div>
  )
}

function Body({ recipe, book, marginal }: {
  recipe: Recipe
  book: PriceBook
  marginal: Marginal | null
}) {
  return (
    <div className="body">
      <h3>{recipe.name}</h3>
      <p>{recipe.blurb}</p>
      <div className="facts">
        <span><b>{money(costPerPortion(recipe, book))}</b> a portion</span>
        <span><b>{recipe.proteinPerServing}g</b> protein</span>
        <span><b>{recipe.minutes}</b> min</span>
        <span>{recipe.equipment.map(e => EQUIPMENT_ICON[e]).join(' ')}</span>
      </div>

      {marginal && (
        <div className={`adds ${marginal.reuses.length > 0 ? 'shares' : ''}`}>
          <span className="amount">
            {marginal.addedCost === 0
              ? 'Adds nothing to your shop'
              : `+${money(marginal.addedCost)} to your shop`}
          </span>
          {marginal.reuses.length > 0 && (
            <span className="reuse">
              Uses your {listOf(marginal.reuses)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** "onions, rice and cheddar" - reads like a person wrote it. */
function listOf(names: string[]): string {
  const shown = names.slice(0, 3).map(n => n.toLowerCase())
  const extra = names.length - shown.length
  let text = shown.length > 1
    ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
    : shown[0]
  if (extra > 0) text += ` +${extra} more`
  return text
}
