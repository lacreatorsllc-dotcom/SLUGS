import { baumLinks } from '../lib/baum'

// "Sign in with Baum", drawn the way sign-in buttons from Google or X are: the
// provider's mark on the left, its name in the label, a plain light button. SLUGS is
// its own app; Baum is who it uses for accounts, the way other apps use Google.
export default function SignInWithBaum({ label = 'Sign in with Baum' }: { label?: string }) {
  return (
    <a className="baum-signin" href={baumLinks.login()} target="_blank" rel="noreferrer">
      <img src={`${import.meta.env.BASE_URL}baum-mark.svg`} alt="" width={20} height={20} />
      <span>{label}</span>
    </a>
  )
}
