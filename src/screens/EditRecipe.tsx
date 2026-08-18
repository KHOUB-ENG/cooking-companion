import { useState } from 'react'
import { INGREDIENTS } from '../data/ingredients'
import { RECIPE_BY_ID } from '../data/recipes'
import type { RecipeOverride } from '../lib/recipeEdits'
import {
  DIET_LABEL, EQUIPMENT_ICON, EQUIPMENT_LABEL, GOAL_LABEL, KEEPS_LABEL,
  type Diet, type Equipment, type Goal, type Keeps, type Recipe,
  type RecipeIngredient, type Tag,
} from '../types'

interface Props {
  recipe: Recipe
  edited: boolean
  /** Custom recipes can be deleted outright; shipped ones can only be reset. */
  isCustom: boolean
  onSave: (id: string, patch: RecipeOverride) => void
  onReset: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

/**
 * Edit a recipe, or write one from scratch. Quantities are for the recipe at
 * its stated servings - the app scales from there, so you never edit "per
 * portion".
 */
export function EditRecipeScreen(props: Props) {
  const { recipe, edited, isCustom, onSave, onReset, onDelete, onClose } = props
  const original = RECIPE_BY_ID[recipe.id]

  const [name, setName] = useState(recipe.name)
  const [blurb, setBlurb] = useState(recipe.blurb)
  const [emoji, setEmoji] = useState(recipe.emoji)
  const [servings, setServings] = useState(recipe.baseServings)
  const [minutes, setMinutes] = useState(recipe.minutes)
  const [protein, setProtein] = useState(recipe.proteinPerServing)
  const [equipment, setEquipment] = useState<Equipment[]>(recipe.equipment)
  const [keeps, setKeeps] = useState<Keeps>(recipe.keeps)
  const [tags, setTags] = useState<Tag[]>(recipe.tags)
  const [items, setItems] = useState<RecipeIngredient[]>(recipe.ingredients)
  const [steps, setSteps] = useState<string[]>(recipe.steps)
  const [tip, setTip] = useState(recipe.tip ?? '')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const used = new Set(items.map(i => i.ingredientId))
  const available = INGREDIENTS.filter(
    i => !used.has(i.id) && i.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  function save() {
    onSave(recipe.id, {
      name: name.trim() || original?.name || 'My recipe',
      blurb: blurb.trim(),
      emoji: emoji.trim() || '🍳',
      baseServings: servings,
      minutes,
      proteinPerServing: protein,
      equipment,
      keeps,
      tags,
      ingredients: items.filter(i => i.qty > 0),
      steps: steps.map(s => s.trim()).filter(Boolean),
      tip: tip.trim() || undefined,
    })
    onClose()
  }

  const kit = Object.keys(EQUIPMENT_LABEL) as Equipment[]
  const goals = Object.keys(GOAL_LABEL) as Goal[]
  const diets = Object.keys(DIET_LABEL) as Diet[]

  return (
    <div className="screen">
      <h1>{isCustom ? 'Your recipe' : 'Edit recipe'}</h1>
      <p className="sub">
        Saved on this phone and used everywhere — costs, shopping list, the lot.
        {!isCustom && ' The original is always one tap away.'}
      </p>

      {/* --- the basics ---------------------------------------------------- */}
      <div className="panel">
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: '0 0 74px' }}>
            <span>Icon</span>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 22 }} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>One-line description</span>
          <input value={blurb} onChange={e => setBlurb(e.target.value)} placeholder="What makes it worth cooking" />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <NumField label="Serves" value={servings} min={1} max={12} onChange={setServings} />
          <NumField label="Minutes" value={minutes} min={1} max={240} onChange={setMinutes} />
          <NumField label="Protein (g)" value={protein} min={0} max={120} onChange={setProtein} />
        </div>
        <p className="tiny" style={{ textAlign: 'left', marginTop: 4 }}>
          Amounts below are for {servings} {servings === 1 ? 'serving' : 'servings'}. The app scales them.
        </p>
      </div>

      {/* --- how long it survives ------------------------------------------ */}
      <div className="panel">
        <h2>How well does it keep?</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>
          This decides which cooks it can fill. A batch cooked on Sunday for
          Thursday has to freeze.
        </p>
        <div className="chips">
          {(Object.keys(KEEPS_LABEL) as Keeps[]).map(k => (
            <button key={k} className={`chip ${keeps === k ? 'on' : ''}`} onClick={() => setKeeps(k)}>
              {KEEPS_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* --- equipment ------------------------------------------------------ */}
      <div className="panel">
        <h2>What it needs</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>
          Everything you tick is treated as required, so tick only what's essential.
        </p>
        <div className="chips">
          {kit.map(e => (
            <button
              key={e}
              className={`chip ${equipment.includes(e) ? 'on' : ''}`}
              onClick={() => setEquipment(toggle(equipment, e))}
            >
              {EQUIPMENT_ICON[e]} {EQUIPMENT_LABEL[e]}
            </button>
          ))}
        </div>
      </div>

      {/* --- tags ----------------------------------------------------------- */}
      <div className="panel">
        <h2>Tags</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>
          Diet tags are what you <em>don't</em> have in it — tick every one that's
          true, or it'll be hidden from those filters.
        </p>
        <div className="chips" style={{ marginBottom: 12 }}>
          {goals.map(g => (
            <button key={g} className={`chip ${tags.includes(g) ? 'on' : ''}`} onClick={() => setTags(toggle(tags, g))}>
              {GOAL_LABEL[g]}
            </button>
          ))}
          <button className={`chip ${tags.includes('breakfast') ? 'on' : ''}`} onClick={() => setTags(toggle(tags, 'breakfast' as Tag))}>
            Breakfast
          </button>
        </div>
        <div className="chips">
          {diets.filter(d => d !== 'no_nuts').map(d => (
            <button key={d} className={`chip ${tags.includes(d) ? 'on' : ''}`} onClick={() => setTags(toggle(tags, d))}>
              {DIET_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      {/* --- ingredients ---------------------------------------------------- */}
      <div className="panel">
        <h2>Ingredients</h2>
        {items.length === 0 && (
          <p className="tiny" style={{ textAlign: 'left' }}>Nothing yet — add something below.</p>
        )}
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
              <button className="link" aria-label={`Remove ${ing.name}`} onClick={() => setItems(items.filter(x => x.ingredientId !== it.ingredientId))}>✕</button>
            </div>
          )
        })}

        {!adding ? (
          <button className="btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setAdding(true)}>
            Add an ingredient
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <input className="search" autoFocus placeholder="Search ingredients" value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {available.slice(0, 20).map(i => (
                <button
                  key={i.id}
                  className="edit-add"
                  onClick={() => { setItems([...items, { ingredientId: i.id, qty: 0 }]); setAdding(false); setSearch('') }}
                >
                  <span className="n">{i.name}</span>
                  <span className="d">{i.packLabel}</span>
                </button>
              ))}
              {available.length === 0 && (
                <p className="tiny" style={{ textAlign: 'left' }}>
                  Nothing matches. Only ingredients with a known pack size can be
                  costed, so new ones go on the Prices screen first.
                </p>
              )}
            </div>
            <button className="link" onClick={() => { setAdding(false); setSearch('') }}>Cancel</button>
          </div>
        )}
      </div>

      {/* --- steps ---------------------------------------------------------- */}
      <div className="panel">
        <h2>Steps</h2>
        {steps.map((s, idx) => (
          <div className="edit-step" key={idx}>
            <span className="num">{idx + 1}</span>
            <textarea
              value={s}
              rows={2}
              placeholder="One action, and how you know it's done"
              onChange={e => { const next = [...steps]; next[idx] = e.target.value; setSteps(next) }}
            />
            <button className="link" aria-label={`Remove step ${idx + 1}`} onClick={() => setSteps(steps.filter((_, i) => i !== idx))}>✕</button>
          </div>
        ))}
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setSteps([...steps, ''])}>
          Add a step
        </button>
      </div>

      <div className="panel">
        <label className="field">
          <span>Note to yourself</span>
          <textarea rows={3} value={tip} placeholder="What you'd tell yourself next time" onChange={e => setTip(e.target.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}>Save</button>
      </div>

      {edited && !isCustom && (
        <button className="link" style={{ display: 'block', margin: '18px auto 0' }} onClick={() => { onReset(recipe.id); onClose() }}>
          Reset to the original recipe
        </button>
      )}

      {isCustom && (
        !confirmDelete ? (
          <button className="link danger" onClick={() => setConfirmDelete(true)}>Delete this recipe</button>
        ) : (
          <div className="confirm">
            <span>Delete it? This can't be undone.</span>
            <div>
              <button className="link" onClick={() => setConfirmDelete(false)}>Keep it</button>
              <button className="link danger" onClick={() => { onDelete(recipe.id); onClose() }}>Delete</button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function NumField({ label, value, min, max, onChange }: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <label className="field" style={{ flex: 1 }}>
      <span>{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={e => {
          if (!e.target.value) { onChange(min); return }
          const n = parseInt(e.target.value, 10)
          if (isFinite(n) && n >= min && n <= max) onChange(n)
        }}
      />
    </label>
  )
}
