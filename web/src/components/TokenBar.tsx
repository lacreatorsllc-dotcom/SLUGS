import { Link } from 'react-router-dom'
import { STAGE } from '../config'
import { ponsUrl } from '../lib/baum'

export default function TokenBar() {
  return (
    <aside className="token-bar" aria-label="Token">
      <div className="wrap">
        <span className="row" style={{ gap: 12 }}>
          <span className="live">TOKEN LIVE</span>
          <span>Now on <Link to="/token">Robinhood Chain</Link></span>
          <span className="beta">· {STAGE}: numbers, fees and features will change</span>
        </span>
        <a href={ponsUrl()} target="_blank" rel="noreferrer">View token ↗</a>
      </div>
    </aside>
  )
}
