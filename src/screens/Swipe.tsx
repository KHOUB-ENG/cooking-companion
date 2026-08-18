import { useMemo, useRef, useState } from 'react'
import type { PlanSetup, Recipe } from '../types'
import { EQUIPMENT_ICON } from '../types'
import {
  costPerPortion, filterRecipes, marginalCost, money, portionsForRecipe,
  rankRecipes, buildSelections, type Marginal, type Selection,
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
  const dragStart = useRef<number | null>(null)

  const recipeById = useMemo(
    () => Object.fromEntries(recipes.map(r => [r.id, r])),
    [recipes],
  )

  /** What's already in the trolley, so new cards can be priced against it. */
  const already: Selection[] = useMemo(
    () => buildSelections(setup, liked, recipeById),
    [setup, liked, recipeById],
  )

  const isBreakfast = (r: Recipe) => r.tags.includes('breakfast')
  const mainsPicked = liked.filter(id => recipeById[id] && !isBreakfast(recipeById[id])).length
  const breakfastPicked = liked.some(id => recipeById[id] && isBreakfast(recipeById[id]))

  /**
   * Breakfasts are their own course. Porridge shouldn't turn up while you're
   * picking dinners, so mains come first and the deck only switches over once
   * you've got enough of them.
   */
  const pickingBreakfast =
    setup.breakfasts > 0 && !breakfastPicked && mainsPicked >= setup.recipeCount

  const queue = useMemo(() => {
    const eligible = filterRecipes(recipes, setup, search)
      .filter(r => (pickingBreakfast ? isBreakfast(r) : !isBreakfast(r)))
    const ranked = rankRecipes(eligible, setup, book, already, recipeById)
    return ranked.filter(r => !liked.includes(r.id) && !passed.includes(r.id))
  }, [recipes, setup, book, search, liked, passed, already, recipeById, pickingBreakfast])

  /** How much the card on top would actually add to the shop. */
  const topMarginal: Marginal | null = useMemo(() => {
    const top = queue[0]
    if (!top || already.length === 0) return null
    const target = pickingBreakfast
      ? setup.breakfasts
      : (setup.lunches + setup.dinners) / Math.max(1, setup.recipeCount)
    return marginalCost(
      already,
      { recipeId: top.id, portions: portionsForRecipe(top, target) },
      recipeById,
      book,
    )
  }, [queue, already, setup, pickingBreakfast, recipeById, book])

  const top = queue[0]
  const next = queue[1]

  /**
   * Commit immediately. This used to defer the commit behind a 180ms timer so
   * the card could fly off screen, and that timer was a bug farm: if anything
   * re-rendered inside the window, the state updates fired from the callback
   * were dropped and the swipe was silently lost. For a swipe app, eating
   * someone's choice is the worst failure there is - so the decision lands the
   * instant you make it, and the next card simply takes its place.
   */
  function decide(dir: 1 | -1) {
    if (!top) return
    if (dir === 1) onLike(top.id)
    else onPass(top.id)
    setDx(0)
    dragStart.current = null
  }

  function onPointerDown(e: React.PointerEvent) {
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
  const offset = dx
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
      {pickingBreakfast && (
        <div className="deck-banner">
          Mains sorted. Now pick a breakfast for your {setup.breakfasts}{' '}
          {setup.breakfasts === 1 ? 'morning' : 'mornings'}.
        </div>
      )}

      <input
        className="search"
        placeholder={pickingBreakfast ? 'Search breakfasts' : 'Fancy something in particular?'}
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
        {mainsPicked} of {setup.recipeCount} mains
        {setup.breakfasts > 0 && (breakfastPicked ? ' · breakfast sorted' : ' · breakfast still to pick')}
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
