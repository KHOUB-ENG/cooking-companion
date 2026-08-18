import { useMemo, useState } from 'react'
import { costPerPortion, money } from '../lib/cost'
import type { PriceBook } from '../lib/prices'
import type { Recipe } from '../types'
import { EQUIPMENT_ICON } from '../types'

interface Props {
  recipes: Recipe[]
  book: PriceBook
  editedRecipes: Set<string>
  onEdit: (id: string) => void
  onBack: () => void
}

export function RecipeListScreen({ recipes, book, editedRecipes, onEdit, onBack }: Props) {
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
        Everything in the book. Tap one to change the amounts, the steps, or
        anything else — your version is what the app uses from then on.
      </p>

      <input
        className="search"
        placeholder="Search recipes"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {shown.map(r => (
        <button className="recipe-row" key={r.id} onClick={() => onEdit(r.id)}>
          <span className="emoji">{r.emoji}</span>
          <span className="text">
            <span className="n">
              {r.name}
              {editedRecipes.has(r.id) && <span className="badge">yours</span>}
            </span>
            <span className="d">
              {money(costPerPortion(r, book))} a portion · {r.minutes} min ·{' '}
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
