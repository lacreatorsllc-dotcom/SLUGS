import { baumLinks } from '../lib/baum'
import { track } from '../lib/funnel'

// "Sign in with Baum", drawn the way sign-in buttons from Google or X are: the
// provider's mark on the left (the Baum King, from baumai.xyz/brand), its name in the label, a plain light button. SLUGS is
// its own app; Baum is who it uses for accounts, the way other apps use Google.
export default function SignInWithBaum({ label = 'Sign in with Baum' }: { label?: string }) {
  return (
    <a className="baum-signin" href={baumLinks.login()} target="_blank" rel="noreferrer" onClick={() => track('signin_click')}>
      <img src={`${import.meta.env.BASE_URL}baum-king.png`} alt="" width={21} height={24} />
      <span>{label}</span>
    </a>
  )
}
