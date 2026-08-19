import { useMemo, useRef, useState } from 'react'
import {
  buildSelections, costPerPortion, filterRecipes, fitsSlot, marginalCost, money,
  nextSlot, planSlots, portionsForRecipe, rankRecipes,
  type Marginal, type Slot,
} from '../lib/cost'
import { HAS_PHOTO } from '../data/photos'
import type { PriceBook } from '../lib/prices'
import { EQUIPMENT_ICON, type PlanSetup, type Recipe } from '../types'

interface Props {
  setup: PlanSetup
  recipes: Recipe[]
  book: PriceBook
  liked: string[]
  passed: string[]
  onLike: (id: string) => void
  onPass: (id: string) => void
  onUnlike: (id: string) => void
  onReset: () => void
  onBuild: () => void
}

/** How far you have to drag before it counts as a decision. */
const THRESHOLD = 110

export function SwipeScreen(props: Props) {
  const { setup, recipes, book, liked, passed, onLike, onPass, onUnlike, onReset, onBuild } = props
  const [search, setSearch] = useState('')
  const [dx, setDx] = useState(0)
  const dragStart = useRef<number | null>(null)

  const recipeById = useMemo(
    () => Object.fromEntries(recipes.map(r => [r.id, r])),
    [recipes],
  )

  const slots = useMemo(
    () => planSlots(setup, recipeById, liked),
    [setup, recipeById, liked],
  )
  const slot = nextSlot(slots)
  const filled = slots.filter(s => s.recipeId).length

  /** What's already in the trolley, so new cards can be priced against it. */
  const already = useMemo(
    () => buildSelections(setup, liked, recipeById),
    [setup, liked, recipeById],
  )

  const queue = useMemo(() => {
    if (!slot) return []
    const wantBreakfast = slot.kind === 'breakfast'
    const eligible = filterRecipes(recipes, setup, search).filter(r => {
      if (r.tags.includes('breakfast') !== wantBreakfast) return false
      return fitsSlot(r, slot)
    })
    const ranked = rankRecipes(eligible, setup, book, already, recipeById)
    return ranked.filter(r => !liked.includes(r.id) && !passed.includes(r.id))
  }, [recipes, setup, book, search, liked, passed, already, recipeById, slot])

  const top = queue[0]
  const next = queue[1]

  const topMarginal: Marginal | null = useMemo(() => {
    if (!top || already.length === 0 || !slot) return null
    return marginalCost(
      already,
      { recipeId: top.id, portions: portionsForRecipe(top, slot.portions) },
      recipeById,
      book,
    )
  }, [top, already, slot, recipeById, book])

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

  const dragging = dragStart.current !== null
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dx}px) rotate(${dx / 22}deg)`,
    transition: dragging ? 'none' : 'transform 0.18s ease-out',
  }

  // --- the week is full ------------------------------------------------------
  if (!slot) {
    return (
      <div className="screen">
        <h1>That's your week</h1>
        <p className="sub">
          {filled} {filled === 1 ? 'cook' : 'cooks'} planned. Tap one to swap it
          for something else.
        </p>
        <SlotList slots={slots} recipeById={recipeById} book={book} onRemove={onUnlike} />
        <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={onBuild}>
          Build my week
        </button>
        <button className="link" style={{ display: 'block', margin: '18px auto 0' }} onClick={onReset}>
          Start the picks again
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <SlotStrip slots={slots} recipeById={recipeById} onRemove={onUnlike} />

      <div className="slot-brief">
        <span className="which">
          {slot.kind === 'breakfast'
            ? 'Breakfast'
            : `Cook ${slot.index + 1} of ${slots.filter(s => s.kind === 'main').length}`}
        </span>
        <span className="what">
          {slot.kind === 'breakfast'
            ? `${slot.portions} ${slot.portions === 1 ? 'morning' : 'mornings'}, made fresh each time.`
            : slot.needs === 'freezer'
              ? `${slot.portions} portions, eaten across the week — so it has to freeze and reheat well.`
              : slot.needs === 'fridge'
                ? `${slot.portions} portions, so it needs to be good again tomorrow from the fridge.`
                : 'One portion, eaten the day you cook it. Anything goes.'}
        </span>
      </div>

      <input
        className="search"
        placeholder={slot.kind === 'breakfast' ? 'Search breakfasts' : 'Fancy something in particular?'}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {!top ? (
        <div className="empty">
          <div className="big">🤔</div>
          <h2>Nothing fits this cook</h2>
          <p>
            {search
              ? 'Try a different search.'
              : slot.needs === 'freezer'
                ? 'Nothing left that freezes well. Fewer portions per cook, or more recipes, would open it up.'
                : 'Your equipment or diet filters are ruling everything out.'}
          </p>
          {(liked.length > 0 || passed.length > 0) && (
            <button className="link" style={{ marginTop: 20 }} onClick={onReset}>
              Start the picks again
            </button>
          )}
        </div>
      ) : (
        <>
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
              <span className="stamp yes" style={{ opacity: Math.max(0, dx / THRESHOLD) }}>YES</span>
              <span className="stamp no" style={{ opacity: Math.max(0, -dx / THRESHOLD) }}>NOPE</span>
              <Art recipe={top} />
              <Body recipe={top} book={book} marginal={topMarginal} />
            </div>
          </div>

          <div className="swipe-actions">
            <button className="no" onClick={() => decide(-1)} aria-label="No thanks">✕</button>
            <button className="yes" onClick={() => decide(1)} aria-label="Yes please">♥</button>
          </div>

          <p className="tiny">
            {filled} of {slots.length} cooks chosen · {queue.length} left that fit
          </p>
        </>
      )}
    </div>
  )
}

/** The week so far, as a row of chips above the deck. */
function SlotStrip({ slots, recipeById, onRemove }: {
  slots: Slot[]
  recipeById: Record<string, Recipe>
  onRemove: (id: string) => void
}) {
  return (
    <div className="slot-strip">
      {slots.map(s => {
        const recipe = s.recipeId ? recipeById[s.recipeId] : null
        return (
          <button
            key={s.index}
            className={`slot-chip ${recipe ? 'filled' : ''}`}
            disabled={!recipe}
            onClick={() => recipe && onRemove(recipe.id)}
            title={recipe ? `Remove ${recipe.name}` : undefined}
          >
            <span className="ico">{recipe ? recipe.emoji : s.kind === 'breakfast' ? '🥣' : '🍽️'}</span>
            <span className="lbl">
              {recipe ? recipe.name : s.kind === 'breakfast' ? 'Breakfast' : `${s.portions}p`}
            </span>
            {recipe && <span className="x">✕</span>}
          </button>
        )
      })}
    </div>
  )
}

function SlotList({ slots, recipeById, book, onRemove }: {
  slots: Slot[]
  recipeById: Record<string, Recipe>
  book: PriceBook
  onRemove: (id: string) => void
}) {
  return (
    <>
      {slots.map(s => {
        const recipe = s.recipeId ? recipeById[s.recipeId] : null
        if (!recipe) return null
        const portions = portionsForRecipe(recipe, s.portions)
        return (
          <button className="recipe-row" key={s.index} onClick={() => onRemove(recipe.id)}>
            <span className="emoji">{recipe.emoji}</span>
            <span className="text">
              <span className="n">{recipe.name}</span>
              <span className="d">
                {s.kind === 'breakfast' ? 'Breakfast · ' : ''}
                {portions} portions · {money(costPerPortion(recipe, book))} a portion ·{' '}
                {recipe.keeps === 'freezer' ? 'freezes' : recipe.keeps === 'fridge' ? 'keeps 2-3 days' : 'eat fresh'}
              </span>
            </span>
            <span className="chev">✕</span>
          </button>
        )
      })}
    </>
  )
}

function Art({ recipe }: { recipe: Recipe }) {
  // Every recipe names an image, but the files arrive in batches - so a missing
  // one has to land on the emoji card rather than a broken-image icon.
  const [failed, setFailed] = useState(false)
  const showImage = HAS_PHOTO.has(recipe.id) && !!recipe.image && !failed
  return (
    <div className="art" style={{ '--hue': hueFor(recipe.id) } as React.CSSProperties}>
      {showImage ? (
        <img
          src={`/recipes/${recipe.image}`}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        recipe.emoji
      )}
    </div>
  )
}

/** A stable colour per recipe, so a deck without photos isn't a wall of grey. */
function hueFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return `${h}`
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
        <span>{recipe.equipment.length ? recipe.equipment.map(e => EQUIPMENT_ICON[e]).join(' ') : '🙌'}</span>
      </div>

      {marginal && (
        <div className={`adds ${marginal.reuses.length > 0 ? 'shares' : ''}`}>
          <span className="amount">
            {marginal.addedCost === 0
              ? 'Adds nothing to your shop'
              : `+${money(marginal.addedCost)} to your shop`}
          </span>
          {marginal.reuses.length > 0 && (
            <span className="reuse">Uses your {listOf(marginal.reuses)}</span>
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
