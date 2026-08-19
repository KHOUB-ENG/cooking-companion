import { useState } from 'react'

interface Props {
  /** Live state for the shop tile: progress, or why there's nothing yet. */
  shopNote: string
  pastCount: number
  fridgeCount: number
  recipeCount: number
  pricesChecked: number
  pricesTotal: number
  onStart: () => void
  onShoppingList: () => void
  onSingleMeal: () => void
  onFridge: () => void
  onPastWeeks: () => void
  onRecipes: () => void
  onPrices: () => void
  onExport: () => void
}

export function HomeScreen(props: Props) {
  const {
    shopNote, pastCount, fridgeCount, recipeCount, pricesChecked, pricesTotal,
    onStart, onShoppingList, onSingleMeal, onFridge, onPastWeeks, onRecipes, onPrices, onExport,
  } = props

  // If the artwork isn't in /public yet, drop it rather than show a broken image.
  const [artOk, setArtOk] = useState(true)

  return (
    <div className="screen home">
      {artOk ? (
        <img
          className="hero"
          src="/kians-kitchen.png"
          alt="Kian's Kitchen — good food, no rules"
          onError={() => setArtOk(false)}
        />
      ) : (
        <div className="hero fallback">
          <span className="mark">🍳</span>
          <h1>Kian's Kitchen</h1>
          <p>good food. no rules.</p>
        </div>
      )}

      <button className="hero-cta" onClick={onStart}>
        <span className="big">Fire up the week</span>
        <span className="small">Pick your kit, swipe, get a shopping list</span>
      </button>

      <div className="home-grid">
        <button className="home-tile" onClick={onShoppingList}>
          <span className="ico">🛒</span>
          <span className="label">This week's shop</span>
          <span className="note">{shopNote}</span>
        </button>

        <button className="home-tile" onClick={onSingleMeal}>
          <span className="ico">🍽️</span>
          <span className="label">Just one meal</span>
          <span className="note">Cook something tonight</span>
        </button>

        <button className="home-tile" onClick={onFridge}>
          <span className="ico">🥫</span>
          <span className="label">In the fridge</span>
          <span className="note">
            {fridgeCount === 0 ? 'Use up what you have' : `${fridgeCount} added`}
          </span>
        </button>

        <button className="home-tile" onClick={onPastWeeks}>
          <span className="ico">📖</span>
          <span className="label">Past weeks</span>
          <span className="note">
            {pastCount === 0 ? 'Nothing saved yet' : `${pastCount} saved`}
          </span>
        </button>

        <button className="home-tile" onClick={onRecipes}>
          <span className="ico">✍️</span>
          <span className="label">Recipes</span>
          <span className="note">{recipeCount} in the book</span>
        </button>

        <button className="home-tile wide" onClick={onPrices}>
          <span className="ico">🏷️</span>
          <span className="label">Prices</span>
          <span className="note">{pricesChecked} of {pricesTotal} checked by you</span>
        </button>
      </div>

      <button className="link" style={{ display: 'block', margin: '22px auto 0' }} onClick={onExport}>
        Back up my data
      </button>
      <p className="tiny">
        Everything lives on this phone. Nothing is on a server, so this file is
        your only spare copy.
      </p>
    </div>
  )
}

/**
 * Honest placeholder. These two screens need somewhere to store a finished week
 * before they can do anything, so they say what they'll be rather than
 * pretending to work.
 */
export function ComingSoonScreen({ title, body, onBack }: {
  title: string
  body: string
  onBack: () => void
}) {
  return (
    <div className="screen">
      <div className="empty">
        <div className="big">🚧</div>
        <h2>{title}</h2>
        <p style={{ maxWidth: 320, margin: '0 auto' }}>{body}</p>
        <button className="link" style={{ marginTop: 24 }} onClick={onBack}>
          Back to the kitchen
        </button>
      </div>
    </div>
  )
}
