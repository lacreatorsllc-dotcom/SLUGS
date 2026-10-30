import type { ReactNode } from 'react'
import { BRAND } from '../config'
import TokenBar from './TokenBar'

// The frame shared by the front door (invite), login and password reset:
// token banner, the orange SLUGS logo, then one card.
export default function AuthLayout({ children, below }: { children: ReactNode; below?: ReactNode }) {
  return (
    <div className="invite-page">
      <TokenBar />
      <div className="invite">
        <img className="invite-logo" src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt={BRAND.name} />
        <div className="invite-card">{children}</div>
        {below}
      </div>
    </div>
  )
}
