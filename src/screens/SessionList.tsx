import { money } from '../lib/cost'
import { relativeDay, shoppingProgress, sortedSessions, type Session } from '../lib/sessions'

interface Props {
  sessions: Session[]
  currentId: string | null
  onOpen: (id: string) => void
  onBack: () => void
}

export function SessionListScreen({ sessions, currentId, onOpen, onBack }: Props) {
  const list = sortedSessions(sessions)

  if (list.length === 0) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="big">📖</div>
          <h2>Nothing here yet</h2>
          <p style={{ maxWidth: 300, margin: '0 auto' }}>
            Plan a week and save it, and it'll show up here — recipes, steps and
            shopping list, exactly as they were.
          </p>
          <button className="link" style={{ marginTop: 24 }} onClick={onBack}>
            Back to the kitchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Past weeks</h1>
      <p className="sub">
        Everything you've planned. Each one keeps the recipes and prices it was
        built with, so it still shows what you actually cooked and paid.
      </p>

      {list.map(s => {
        const progress = shoppingProgress(s)
        const cooked = s.cooked.length
        return (
          <button className="session-row" key={s.id} onClick={() => onOpen(s.id)}>
            <span className="text">
              <span className="n">
                {s.label}
                {s.id === currentId && <span className="badge">current</span>}
                {s.kind === 'single' && <span className="badge quiet">one meal</span>}
              </span>
              <span className="d">
                {relativeDay(s.createdAt)} · {money(s.buyTotal)} ·{' '}
                {cooked > 0
                  ? `${cooked} of ${s.selections.length} cooked`
                  : `${progress.done}/${progress.total} bought`}
              </span>
            </span>
            <span className="chev">›</span>
          </button>
        )
      })}

      <button className="btn ghost" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
        Back to the kitchen
      </button>
    </div>
  )
}
