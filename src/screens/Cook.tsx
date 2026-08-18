import { useEffect, useMemo, useRef, useState } from 'react'
import { scaledQty } from '../lib/cost'
import type { Ingredient, Recipe, Unit } from '../types'

interface Props {
  recipe: Recipe
  portions: number
  /** Frozen ingredient data, for names and units. */
  prices: Record<string, Ingredient>
  cooked: boolean
  onFinish: () => void
  onExit: () => void
}

/**
 * Cooking, not reading. You're standing up, your hands are dirty, and the phone
 * is on the counter a foot away - so: one step at a time, big type, and the
 * screen stays awake. Step 0 is the ingredients, because the classic beginner
 * failure is getting three steps in and finding you haven't chopped the onion.
 */
export function CookScreen({ recipe, portions, prices, cooked, onFinish, onExit }: Props) {
  // Start on the ingredients page, not step 1.
  const [i, setI] = useState(-1)
  const total = recipe.steps.length
  // -1 is the ingredients page; 0..total-1 are the steps.
  const onIngredients = i < 0

  useWakeLock()

  const stepText = onIngredients ? '' : recipe.steps[i]
  const timerSeconds = useMemo(() => detectMinutes(stepText), [stepText])

  return (
    <div className="cook">
      <div className="cook-bar">
        <button className="cook-exit" onClick={onExit} aria-label="Stop cooking">✕</button>
        <div className="cook-dots" aria-hidden>
          {Array.from({ length: total }, (_, n) => (
            <span key={n} className={n <= i ? 'on' : ''} />
          ))}
        </div>
        <span className="cook-count">
          {onIngredients ? 'Prep' : `${i + 1}/${total}`}
        </span>
      </div>

      <div className="cook-body">
        {onIngredients ? (
          <>
            <h2 className="cook-head">{recipe.name}</h2>
            <p className="cook-sub">
              For {portions} {portions === 1 ? 'portion' : 'portions'} · about {recipe.minutes} min
            </p>
            <p className="cook-sub" style={{ marginBottom: 18 }}>
              Get all of this out before you start.
            </p>
            <ul className="cook-ings">
              {recipe.ingredients.map(ri => {
                const ing = prices[ri.ingredientId]
                return (
                  <li key={ri.ingredientId}>
                    <b>{formatQty(scaledQty(recipe, ri.qty, portions), ing?.unit ?? 'g')}</b>
                    <span>{ing?.name ?? ri.ingredientId}</span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <>
            <span className="cook-num">Step {i + 1}</span>
            <p className="cook-step">{stepText}</p>
            {timerSeconds && <Timer key={`${i}-${timerSeconds}`} seconds={timerSeconds} />}
            {i === total - 1 && recipe.tip && (
              <div className="tip" style={{ marginTop: 20 }}>
                <b>Don't get it wrong:</b> {recipe.tip}
              </div>
            )}
          </>
        )}
      </div>

      <div className="cook-nav">
        <button
          className="btn ghost"
          onClick={() => setI(n => n - 1)}
          disabled={onIngredients}
        >
          Back
        </button>
        {i < total - 1 ? (
          <button className="btn" onClick={() => setI(n => n + 1)}>
            {onIngredients ? "Got it all — start" : 'Next step'}
          </button>
        ) : (
          <button className="btn" onClick={onFinish}>
            {cooked ? 'Done' : 'Done — mark as cooked'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Keep the screen on. Cooking with a phone that keeps sleeping is miserable. */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<Sentinel> }
    }
    if (!nav.wakeLock) return   // Not everywhere - never block cooking on it.

    let lock: Sentinel | null = null
    let dropped = false

    const acquire = async () => {
      try {
        lock = await nav.wakeLock!.request('screen')
      } catch {
        // Denied or unsupported. Nothing to do; the app still works.
      }
    }
    // The lock is released whenever the tab is hidden, so re-take it on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !dropped) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      dropped = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [])
}

/**
 * "simmer for 20 minutes" is exactly the moment a beginner wanders off and
 * burns it, so the step offers its own timer rather than expecting you to go
 * and find the clock app.
 */
function detectMinutes(step: string): number | null {
  if (!step) return null
  // Take the largest duration in the step: "cook 5 minutes, then 20 minutes".
  const matches = [...step.matchAll(/(\d+)\s*(?:to|-|–)?\s*(\d+)?\s*min(?:ute)?s?\b/gi)]
  if (matches.length === 0) return null
  const best = Math.max(...matches.map(m => Number(m[2] ?? m[1])))
  if (!isFinite(best) || best <= 0 || best > 120) return null
  return best * 60
}

function Timer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setLeft(n => {
        if (n <= 1) {
          clearInterval(id)
          if (!doneRef.current) {
            doneRef.current = true
            alarm()
          }
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const mins = Math.floor(left / 60)
  const secs = left % 60
  const finished = left === 0

  return (
    <div className={`cook-timer ${finished ? 'done' : ''}`}>
      <span className="clock">{mins}:{String(secs).padStart(2, '0')}</span>
      {finished ? (
        <span className="msg">Time's up — go and check it</span>
      ) : (
        <button
          className="btn ghost"
          onClick={() => {
            if (running) { setRunning(false) } else { doneRef.current = false; setRunning(true) }
          }}
        >
          {running ? 'Pause' : `Start ${Math.round(seconds / 60)} min timer`}
        </button>
      )}
    </div>
  )
}

/** A short beep plus a buzz. No audio files to load, no permissions. */
function alarm() {
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch { /* not supported; the visual state still changes */ }
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.2)
    setTimeout(() => void ctx.close(), 1500)
  } catch { /* silent is fine */ }
}

function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') {
    const n = Math.round(qty * 2) / 2
    return `${n}`
  }
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}${unit === 'ml' ? 'l' : 'kg'}`
  return `${Math.round(qty)}${unit}`
}
