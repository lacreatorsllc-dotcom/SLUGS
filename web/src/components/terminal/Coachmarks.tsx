import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import Icon from './Icon'

// A first-time walkthrough: small floating cards that point at the features they teach,
// one at a time, with Back, Next and Skip, like most apps show on first use. Each step
// names the element it points at by its data-tour attribute. The page decides when to
// show it (lib/tour.ts keeps whether it's been seen).

export type CoachStep = { target: string; title: string; body: string }

type Place = { top: number; left: number; side: 'below' | 'above'; arrow: number; ring: { top: number; left: number; width: number; height: number } }

const CARD_WIDTH = 300
const GAP = 14
const EDGE = 12

function measure(target: string): Place | null {
  const element = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom > 200 || rect.top < 200
  const width = Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2)
  const left = Math.max(EDGE, Math.min(window.innerWidth - width - EDGE, rect.left + rect.width / 2 - width / 2))
  return {
    top: below ? rect.bottom + GAP : rect.top - GAP,
    left,
    side: below ? 'below' : 'above',
    arrow: Math.max(18, Math.min(width - 18, rect.left + rect.width / 2 - left)),
    ring: { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 },
  }
}

export default function Coachmarks({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [place, setPlace] = useState<Place | null>(null)
  const step = steps[index]
  const update = useCallback(() => setPlace(measure(step.target)), [step])
  useLayoutEffect(() => {
    document.querySelector(`[data-tour="${step.target}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    update()
    // Once the scroll settles.
    const timer = window.setTimeout(update, 350)
    return () => window.clearTimeout(timer)
  }, [step, update])
  useEffect(() => {
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone()
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(steps.length - 1, value + 1))
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1))
    }
    document.addEventListener('keydown', key)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); document.removeEventListener('keydown', key) }
  }, [update, onDone, steps.length])

  if (!place) return null
  const last = index === steps.length - 1
  return <>
    <div className="t-coach-ring" style={place.ring} aria-hidden="true" />
    <div key={index} className={`t-coach t-coach--${place.side}`} role="dialog" aria-live="polite" aria-label={`${step.title}, step ${index + 1} of ${steps.length}`}
      style={{ top: place.top, left: place.left, width: Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2), '--arrow': `${place.arrow}px` } as React.CSSProperties}>
      <div className="t-coach-head"><span>{index + 1} / {steps.length}</span><button type="button" className="t-coach-skip" onClick={onDone}>Skip</button></div>
      <strong>{step.title}</strong>
      <p>{step.body}</p>
      <div className="t-coach-foot">
        <span className="t-coach-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === index ? 'on' : ''} />)}</span>
        {index > 0 && <button type="button" className="t-coach-back" onClick={() => setIndex(index - 1)} aria-label="Back"><Icon name="back" size={14} /></button>}
        <button type="button" className="t-coach-next" onClick={() => (last ? onDone() : setIndex(index + 1))} autoFocus>{last ? 'Got it' : 'Next'}</button>
      </div>
    </div>
  </>
}
