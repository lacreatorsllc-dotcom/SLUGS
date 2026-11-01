import { useSearchParams } from 'react-router-dom'
import PaperBoard, { LaunchPaperLink } from '../components/terminal/PaperBoard'

// Public paper strategies on Baum, best return over holding BTC first (api/paper.js).
// "From SLUGS" keeps to strategies whose owners came through, or signed in to, SLUGS.
export default function PaperList() {
  const [params, setParams] = useSearchParams()
  const mine = params.get('from') === 'slugs'
  return <>
    <div className="t-page-heading"><div><h1>Paper trading</h1><p>Strategies trading pretend money at real prices on Baum. Nothing here risks real funds.</p></div>
      <div className="t-heading-actions">
        <div className="t-segments" role="group" aria-label="Which strategies">
          <button type="button" aria-pressed={!mine} onClick={() => setParams({}, { replace: true })}>All on Baum</button>
          <button type="button" aria-pressed={mine} onClick={() => setParams({ from: 'slugs' }, { replace: true })}>From SLUGS</button>
        </div>
        <LaunchPaperLink />
      </div>
    </div>
    <PaperBoard mine={mine} />
  </>
}
