import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore/lite'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function joinWaitlist(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (normalizedEmail.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(normalizedEmail)) {
    const error = new Error('Enter a valid email address.')
    error.code = 'waitlist/invalid-email'
    throw error
  }

  const ref = collection(db, 'waitlist')
  return addDoc(ref, {
    email: normalizedEmail,
    joinedAt: serverTimestamp(),
    source: 'slugs.run',
  })
}
