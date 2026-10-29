import { useId, useState } from 'react'
import { joinWaitlist } from '../lib/firebase.js'

export default function WaitlistForm({ accent = 'amber', className = '' }) {
  const inputId = useId()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading || submitted) return

    setLoading(true)
    setError('')
    try {
      await joinWaitlist(email)
      setSubmitted(true)
    } catch (err) {
      setError(err.code === 'waitlist/invalid-email'
        ? 'Enter a valid email address.'
        : "We couldn't save your email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const focusStyle = accent === 'teal'
    ? 'focus-visible:ring-teal focus:border-teal/60'
    : 'focus-visible:ring-amber focus:border-amber/60'

  return (
    <div className={`mx-auto w-full max-w-md ${className}`}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={inputId} className="sr-only">Email address</label>
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError('')
          }}
          placeholder="you@example.com"
          disabled={loading || submitted}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`min-w-0 flex-1 bg-bg2 border border-glass rounded-xl px-4 py-3 text-white placeholder-text2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-70 ${focusStyle}`}
          required
        />
        <button
          type="submit"
          disabled={loading || submitted}
          aria-busy={loading}
          className={`min-h-11 px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-default ${focusStyle} ${submitted ? 'bg-green text-black' : 'bg-amber text-black enabled:hover:bg-amber/90'}`}
        >
          {submitted ? "You're on the list ✓" : loading ? 'Joining...' : 'Get Early Access'}
        </button>
      </form>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-3 text-sm text-red">
          {error}
        </p>
      )}
      {submitted && <p role="status" className="sr-only">Your email has been added to the waitlist.</p>}
    </div>
  )
}
