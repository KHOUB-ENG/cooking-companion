import { useMemo, useState } from 'react'
import { INGREDIENTS } from '../data/ingredients'
import { HAS_PHOTO } from '../data/photos'
import { money } from '../lib/cost'
import { matchFridge } from '../lib/fridge'
import type { PriceBook } from '../lib/prices'
import type { Recipe } from '../types'

interface Props {
  recipes: Recipe[]
  book: PriceBook
  have: string[]
  onToggle: (id: string) => void
  onClear: () => void
  onOpen: (id: string) => void
  onBack: () => void
}

/**
 * The half a bag of lentils problem. You know what's in the fridge; the app
 * knows what uses it. Ranked by how many of your things a recipe uses, because
 * using three of them is always better than using one.
 */
export function FridgeScreen(props: Props) {
  const { recipes, book, have, onToggle, onClear, onOpen, onBack } = props
  const [search, setSearch] = useState('')

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return INGREDIENTS
      .filter(i => !have.includes(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [search, have])

  const matches = useMemo(
    () => matchFridge(have, recipes, book),
    [have, recipes, book],
  )

  // Group by how many of your ingredients each one uses, best tier first.
  const tiers = useMemo(() => {
    const by = new Map<number, typeof matches>()
    for (const m of matches) {
      const n = m.matched.length
      by.set(n, [...(by.get(n) ?? []), m])
    }
    return [...by.entries()].sort((a, b) => b[0] - a[0])
  }, [matches])

  return (
    <div className="screen">
      <h1>What's in the fridge?</h1>
      <p className="sub">
        Add what you've got and I'll find what uses the most of it. Half a bag of
        lentils, the end of a block of feta — whatever's sitting there.
      </p>

      <input
        className="search"
        placeholder="Start typing an ingredient"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {suggestions.length > 0 && (
        <div className="panel" style={{ padding: '4px 16px' }}>
          {suggestions.map(i => (
            <button
              key={i.id}
              className="edit-add"
              onClick={() => { onToggle(i.id); setSearch('') }}
            >
              <span className="n">{i.name}</span>
              <span className="d">{i.packLabel}</span>
            </button>
          ))}
        </div>
      )}

      {have.length > 0 && (
        <>
          <div className="chips" style={{ marginBottom: 8 }}>
            {have.map(id => (
              <button key={id} className="chip on" onClick={() => onToggle(id)}>
                {book[id]?.name ?? id} ✕
              </button>
            ))}
          </div>
          <button className="link" style={{ marginBottom: 18 }} onClick={onClear}>
            Clear the lot
          </button>
        </>
      )}

      {have.length === 0 ? (
        <div className="empty">
          <div className="big">🥫</div>
          <h2>Nothing added yet</h2>
          <p style={{ maxWidth: 300, margin: '0 auto' }}>
            Add an ingredient above and recipes that use it will appear here,
            the ones using most of your stuff first.
          </p>
          <button className="link" style={{ marginTop: 24 }} onClick={onBack}>
            Back to the kitchen
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty">
          <div className="big">🤔</div>
          <h2>Nothing uses those</h2>
          <p>Try adding something else, or a more common ingredient.</p>
        </div>
      ) : (
        tiers.map(([count, list]) => (
          <div key={count} style={{ marginBottom: 22 }}>
            <h4 className="mini-head">
              {count === have.length && have.length > 1
                ? `Uses all ${count} of yours`
                : `Uses ${count} of yours`}
              {' · '}{list.length} {list.length === 1 ? 'recipe' : 'recipes'}
            </h4>

            {list.map(m => (
              <button className="recipe-row" key={m.recipe.id} onClick={() => onOpen(m.recipe.id)}>
                <Thumb recipe={m.recipe} />
                <span className="text">
                  <span className="n">{m.recipe.name}</span>
                  <span className="d">
                    {m.matchedNames.join(', ').toLowerCase()}
                  </span>
                  <span className="d">
                    {m.restCount === 0
                      ? 'Nothing else to buy'
                      : `+${money(m.restCost)} for the other ${m.restCount}`}
                    {' · '}{m.recipe.minutes} min
                  </span>
                </span>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        ))
      )}

      {have.length > 0 && (
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={onBack}>
          Back to the kitchen
        </button>
      )}
    </div>
  )
}

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
