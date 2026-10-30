import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type Auth,
} from 'firebase/auth'
import { FIREBASE } from '../config'

// SLUGS accounts, shared with the old app (same Firebase project). Email and password
// only, so no popup/redirect resolver: that would load Firebase's iframe, which the CSP blocks.
let auth: Auth | null = null
function getAuth() {
  auth ??= initializeAuth(initializeApp(FIREBASE), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  })
  return auth
}

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(getAuth(), email.trim(), password)

export const sendReset = (email: string) => sendPasswordResetEmail(getAuth(), email.trim())

/** Firebase error codes in plain words. */
export function authMessage(err: unknown) {
  const code = (err as { code?: string }).code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.'
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes and try again.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/network-request-failed':
      return 'Couldn’t reach the server. Check your connection.'
    default:
      return 'Something went wrong. Try again.'
  }
}
