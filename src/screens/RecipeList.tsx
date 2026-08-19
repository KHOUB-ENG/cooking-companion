import { useMemo, useState } from 'react'
import { costPerPortion, money } from '../lib/cost'
import { HAS_PHOTO } from '../data/photos'
import type { PriceBook } from '../lib/prices'
import { EQUIPMENT_ICON, type Recipe } from '../types'

interface Props {
  recipes: Recipe[]
  book: PriceBook
  editedRecipes: Set<string>
  customIds: Set<string>
  onOpen: (id: string) => void
  onNew: () => void
  onBack: () => void
}

export function RecipeListScreen(props: Props) {
  const { recipes, book, editedRecipes, customIds, onOpen, onNew, onBack } = props
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter(r =>
      `${r.name} ${r.blurb} ${r.tags.join(' ')}`.toLowerCase().includes(q),
    )
  }, [recipes, search])

  return (
    <div className="screen">
      <h1>Recipes</h1>
      <p className="sub">
        {recipes.length} in the book. Tap one to read it, cook it, or change it.
      </p>

      <button className="btn" style={{ width: '100%', marginBottom: 14 }} onClick={onNew}>
        Write a new recipe
      </button>

      <input
        className="search"
        placeholder="Search recipes"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {shown.map(r => (
        <button className="recipe-row" key={r.id} onClick={() => onOpen(r.id)}>
          <Thumb recipe={r} />
          <span className="text">
            <span className="n">
              {r.name}
              {customIds.has(r.id) && <span className="badge">mine</span>}
              {editedRecipes.has(r.id) && !customIds.has(r.id) && <span className="badge">edited</span>}
            </span>
            <span className="d">
              {money(costPerPortion(r, book))} a portion · {r.minutes} min ·{' '}
              {r.keeps === 'freezer' ? 'freezes' : r.keeps === 'fridge' ? 'keeps 2-3 days' : 'eat fresh'}
              {' · '}
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

/** Photo if we have one, emoji if the file hasn't landed yet. */
function Thumb({ recipe }: { recipe: Recipe }) {
  const [failed, setFailed] = useState(false)
  if (HAS_PHOTO.has(recipe.id) && recipe.image && !failed) {
    return (
      <img
        className="thumb"
        src={`/recipes/${recipe.image}`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }
  return <span className="thumb emoji">{recipe.emoji}</span>
}
