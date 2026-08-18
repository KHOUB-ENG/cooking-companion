import { useState } from 'react'
import { INGREDIENTS } from '../data/ingredients'
import { RECIPE_BY_ID } from '../data/recipes'
import type { RecipeOverride } from '../lib/recipeEdits'
import type { Recipe, RecipeIngredient } from '../types'

interface Props {
  recipe: Recipe
  edited: boolean
  onSave: (id: string, patch: RecipeOverride) => void
  onReset: (id: string) => void
  onClose: () => void
}

/**
 * Edit a recipe you've actually cooked. Quantities are for the recipe at its
 * stated servings - the app scales from there, so you never edit "per portion".
 */
export function EditRecipeScreen({ recipe, edited, onSave, onReset, onClose }: Props) {
  const original = RECIPE_BY_ID[recipe.id]
  const [name, setName] = useState(recipe.name)
  const [servings, setServings] = useState(recipe.baseServings)
  const [minutes, setMinutes] = useState(recipe.minutes)
  const [items, setItems] = useState<RecipeIngredient[]>(recipe.ingredients)
  const [steps, setSteps] = useState<string[]>(recipe.steps)
  const [tip, setTip] = useState(recipe.tip ?? '')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  const used = new Set(items.map(i => i.ingredientId))
  const available = INGREDIENTS.filter(
    i => !used.has(i.id) && i.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  function save() {
    onSave(recipe.id, {
      name: name.trim() || original.name,
      baseServings: servings,
      minutes,
      ingredients: items.filter(i => i.qty > 0),
      steps: steps.map(s => s.trim()).filter(Boolean),
      tip: tip.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="screen">
      <h1>Edit recipe</h1>
      <p className="sub">
        Changes are saved on this phone and used everywhere — costs, shopping
        list, the lot. The original is always one tap away.
      </p>

      {/* --- the basics ---------------------------------------------------- */}
      <div className="panel">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Serves</span>
            <input
              inputMode="numeric"
              value={servings}
              onChange={e => {
                const n = parseInt(e.target.value, 10)
                if (isFinite(n) && n > 0 && n <= 12) setServings(n)
                else if (!e.target.value) setServings(1)
              }}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Minutes</span>
            <input
              inputMode="numeric"
              value={minutes}
              onChange={e => {
                const n = parseInt(e.target.value, 10)
                if (isFinite(n) && n > 0) setMinutes(n)
                else if (!e.target.value) setMinutes(1)
              }}
            />
          </label>
        </div>
        <p className="tiny" style={{ textAlign: 'left', marginTop: 4 }}>
          Amounts below are for {servings} {servings === 1 ? 'serving' : 'servings'}.
          The app scales them for you.
        </p>
      </div>

      {/* --- ingredients --------------------------------------------------- */}
      <div className="panel">
        <h2>Ingredients</h2>
        {items.map((it, idx) => {
          const ing = INGREDIENTS.find(i => i.id === it.ingredientId)
          if (!ing) return null
          return (
            <div className="edit-row" key={it.ingredientId}>
              <span className="n">{ing.name}</span>
              <input
                className="qty"
                inputMode="decimal"
                value={String(it.qty)}
                aria-label={`Amount of ${ing.name}`}
                onChange={e => {
                  const n = parseFloat(e.target.value)
                  const next = [...items]
                  next[idx] = { ...it, qty: isFinite(n) && n >= 0 ? n : 0 }
                  setItems(next)
                }}
              />
              <span className="unit">{ing.unit === 'each' ? '' : ing.unit}</span>
              <button
                className="link"
                aria-label={`Remove ${ing.name}`}
                onClick={() => setItems(items.filter(x => x.ingredientId !== it.ingredientId))}
              >
                ✕
              </button>
            </div>
          )
        })}

        {!adding ? (
          <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setAdding(true)}>
            Add an ingredient
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <input
              className="search"
              autoFocus
              placeholder="Search ingredients"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {available.slice(0, 20).map(i => (
                <button
                  key={i.id}
                  className="edit-add"
                  onClick={() => {
                    setItems([...items, { ingredientId: i.id, qty: 0 }])
                    setAdding(false)
                    setSearch('')
                  }}
                >
                  <span className="n">{i.name}</span>
                  <span className="d">{i.packLabel}</span>
                </button>
              ))}
              {available.length === 0 && (
                <p className="tiny" style={{ textAlign: 'left' }}>
                  Nothing matches. Only ingredients with a known pack size can be
                  costed, so new ones have to be added to the price list first.
                </p>
              )}
            </div>
            <button className="link" onClick={() => { setAdding(false); setSearch('') }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* --- steps --------------------------------------------------------- */}
      <div className="panel">
        <h2>Steps</h2>
        {steps.map((s, idx) => (
          <div className="edit-step" key={idx}>
            <span className="num">{idx + 1}</span>
            <textarea
              value={s}
              rows={2}
              onChange={e => {
                const next = [...steps]
                next[idx] = e.target.value
                setSteps(next)
              }}
            />
            <button
              className="link"
              aria-label={`Remove step ${idx + 1}`}
              onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setSteps([...steps, ''])}>
          Add a step
        </button>
      </div>

      <div className="panel">
        <label className="field">
          <span>Note to yourself</span>
          <textarea
            rows={3}
            value={tip}
            placeholder="What you'd tell yourself next time"
            onChange={e => setTip(e.target.value)}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}>Save changes</button>
      </div>

      {edited && (
        <button
          className="link"
          style={{ display: 'block', margin: '18px auto 0' }}
          onClick={() => { onReset(recipe.id); onClose() }}
        >
          Reset to the original recipe
        </button>
      )}
    </div>
  )
}
