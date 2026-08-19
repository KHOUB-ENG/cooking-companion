import { useState } from 'react'
import { buildBasket, costPerPortion, money, scaledQty } from '../lib/cost'
import { HAS_PHOTO } from '../data/photos'
import type { PriceBook } from '../lib/prices'
import {
  EQUIPMENT_ICON, EQUIPMENT_LABEL, KEEPS_LABEL,
  type Recipe, type Unit,
} from '../types'

interface Props {
  recipe: Recipe
  book: PriceBook
  edited: boolean
  isCustom: boolean
  onCook: (id: string) => void
  onEdit: (id: string) => void
  onBack: () => void
}

/**
 * Reading a recipe, not editing one. Tapping a recipe used to drop you straight
 * into a form full of number fields, which is the wrong thing to see when you
 * just want to know whether you fancy it.
 */
export function RecipeScreen({ recipe, book, edited, isCustom, onCook, onEdit, onBack }: Props) {
  const [artFailed, setArtFailed] = useState(false)
  const showArt = HAS_PHOTO.has(recipe.id) && !!recipe.image && !artFailed

  const basket = buildBasket(
    [{ recipeId: recipe.id, portions: recipe.baseServings }],
    { [recipe.id]: recipe },
    book,
  )

  return (
    <div className="screen recipe-view">
      <div className="recipe-hero">
        {showArt ? (
          <img src={`/recipes/${recipe.image}`} alt="" onError={() => setArtFailed(true)} />
        ) : (
          <span className="fallback">{recipe.emoji}</span>
        )}
        <button className="hero-back" onClick={onBack} aria-label="Back">‹</button>
      </div>

      <h1>{recipe.name}</h1>
      {(isCustom || edited) && (
        <span className="badge" style={{ marginBottom: 8, display: 'inline-block' }}>
          {isCustom ? 'yours' : 'edited'}
        </span>
      )}
      <p className="sub">{recipe.blurb}</p>

      <div className="panel">
        <div className="fact-grid">
          <span><b>{money(costPerPortion(recipe, book))}</b>a portion</span>
          <span><b>{recipe.proteinPerServing}g</b>protein</span>
          <span><b>{recipe.minutes}</b>minutes</span>
          <span><b>{recipe.baseServings}</b>servings</span>
        </div>
        <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
        <div className="money-row">
          <span className="k">{KEEPS_LABEL[recipe.keeps]}</span>
        </div>
        <div className="money-row">
          <span className="k">
            {recipe.equipment.length > 0
              ? `Needs ${recipe.equipment.map(e => EQUIPMENT_LABEL[e].toLowerCase()).join(' + ')}`
              : 'No cooking at all'}
          </span>
          <span>{recipe.equipment.map(e => EQUIPMENT_ICON[e]).join(' ')}</span>
        </div>
      </div>

      <div className="panel">
        <h2>You need</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>
          For {recipe.baseServings} servings · about {money(basket.buyTotal)} to buy the packs
        </p>
        {recipe.ingredients.map(ri => {
          const ing = book[ri.ingredientId]
          return (
            <div className="item" key={ri.ingredientId}>
              <span className="n">{ing?.name ?? ri.ingredientId}</span>
              <span className="d">
                {formatQty(scaledQty(recipe, ri.qty, recipe.baseServings), ing?.unit ?? 'g')}
              </span>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <h2>How to cook it</h2>
        <ol className="steps">
          {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        {recipe.tip && <div className="tip"><b>Don't get it wrong:</b> {recipe.tip}</div>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn ghost" onClick={() => onEdit(recipe.id)}>Edit</button>
        <button className="btn" onClick={() => onCook(recipe.id)}>Cook it now</button>
      </div>

      <button className="link" style={{ display: 'block', margin: '18px auto 0' }} onClick={onBack}>
        Back to the book
      </button>
    </div>
  )
}

function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') return `${Math.round(qty * 2) / 2}`
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}${unit === 'ml' ? 'l' : 'kg'}`
  return `${Math.round(qty)}${unit}`
}
