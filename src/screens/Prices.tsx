import { useMemo, useState } from 'react'
import { INGREDIENTS, PRICES_CHECKED } from '../data/ingredients'
import { money } from '../lib/cost'
import {
  editedCount, isEdited, parsePrice,
  type Overrides, type PriceBook, type PriceOverride,
} from '../lib/prices'
import { AISLE_LABEL, AISLE_ORDER } from '../types'

interface Props {
  overrides: Overrides
  book: PriceBook
  onSet: (id: string, patch: PriceOverride | null) => void
  onResetAll: () => void
  onDone: () => void
}

/**
 * Shelf check. The shipped prices are estimates - there is no public Aldi
 * price feed - so this screen exists to let a real shelf label beat them.
 * Your corrections are saved on this phone and feed straight into every total.
 */
export function PricesScreen({ overrides, book, onSet, onResetAll, onDone }: Props) {
  const [filter, setFilter] = useState('')
  const done = editedCount(overrides)

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return AISLE_ORDER
      .map(aisle => ({
        aisle,
        label: AISLE_LABEL[aisle],
        items: INGREDIENTS.filter(
          i => i.aisle === aisle && (!q || i.name.toLowerCase().includes(q)),
        ),
      }))
      .filter(g => g.items.length > 0)
  }, [filter])

  return (
    <div className="screen">
      <h1>Shelf check</h1>
      <p className="sub">
        These prices are my estimates from {PRICES_CHECKED}, not real data — Aldi
        doesn't publish one. Correct any of them from a shelf label and every
        total in the app updates.
      </p>

      <div className="panel" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="money-row total">
          <span className="k">Checked by you</span>
          <span className="v">{done} / {INGREDIENTS.length}</span>
        </div>
        <div className="bar"><i style={{ width: `${(done / INGREDIENTS.length) * 100}%` }} /></div>
        {done > 0 && (
          <button className="link" style={{ marginTop: 8 }} onClick={onResetAll}>
            Clear all my corrections
          </button>
        )}
      </div>

      <input
        className="search"
        placeholder="Find an item"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {groups.map(g => (
        <div className="panel" key={g.aisle}>
          <h4 style={{
            fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.09em',
            color: 'var(--muted)', marginBottom: 12,
          }}>
            {g.label}
          </h4>

          {g.items.map(base => {
            const current = book[base.id] ?? base
            const edited = isEdited(overrides, base.id)
            return (
              <div className="price-row" key={base.id}>
                <div className="price-name">
                  <span className="n">{base.name}</span>
                  {edited && <span className="badge">yours</span>}
                  {base.staple && <span className="badge quiet">cupboard</span>}
                  <span className="d">
                    {edited && current.pack.price !== base.pack.price && (
                      <s style={{ marginRight: 6 }}>{money(base.pack.price)}</s>
                    )}
                    {current.packLabel}
                  </span>
                </div>

                <div className="price-fields">
                  <label>
                    <span>Price</span>
                    <input
                      inputMode="decimal"
                      placeholder={money(base.pack.price)}
                      defaultValue={edited ? money(current.pack.price) : ''}
                      onBlur={e => {
                        const p = parsePrice(e.target.value)
                        if (p === null) {
                          if (!e.target.value.trim()) onSet(base.id, { price: undefined })
                          return
                        }
                        onSet(base.id, { price: p })
                        e.target.value = money(p)
                      }}
                    />
                  </label>
                  <label>
                    <span>Pack {base.unit === 'each' ? 'count' : base.unit}</span>
                    <input
                      inputMode="numeric"
                      placeholder={String(base.pack.size)}
                      defaultValue={
                        current.pack.size !== base.pack.size ? String(current.pack.size) : ''
                      }
                      onBlur={e => {
                        const n = parseFloat(e.target.value)
                        if (!e.target.value.trim()) return
                        if (isFinite(n) && n > 0) onSet(base.id, { size: n })
                      }}
                    />
                  </label>
                  {edited && (
                    <button className="link" onClick={() => onSet(base.id, null)}>
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <p className="tiny">
        A wrong pack size costs you more than a wrong price: the app buys whole
        packs, so a 1kg bag stored as 500g throws out every recipe that uses it.
      </p>

      <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={onDone}>
        Done
      </button>
    </div>
  )
}
