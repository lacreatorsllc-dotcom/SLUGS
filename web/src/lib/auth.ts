import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth as existingAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { FIREBASE } from '../config'

// SLUGS accounts, shared with the old app (same Firebase project). Email and password
// only, so no popup/redirect resolver: that would load Firebase's iframe, which the CSP blocks.
let auth: Auth | null = null
function getAuth() {
  if (auth) return auth
  const app = getApps().length ? getApp() : initializeApp(FIREBASE)
  try {
    auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/already-initialized') throw error
    auth = existingAuth(app)
  }
  return auth
}

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(getAuth(), email.trim(), password)

export const sendReset = (email: string) => sendPasswordResetEmail(getAuth(), email.trim())

export const observeAuth = (onChange: (user: User | null) => void, onError: (error: Error) => void) =>
  onAuthStateChanged(getAuth(), onChange, onError)

export const endSession = () => signOut(getAuth())

/** Firebase error codes in plain words. */
export function authMessage(err: unknown) {
  const code = (err as { code?: string } | null)?.code ?? ''
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
