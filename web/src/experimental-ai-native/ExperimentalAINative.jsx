import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import './experimental-ai-native.css'

const navItems = ['Explore', 'Agents', 'Studio', 'Deploy', 'Memory']
const modelTabs = ['Reasoning', 'Fast', 'Creative', 'Autonomous']
const models = ['Ring 2.6', 'DeepSeek 4', 'Gemini Flash', 'GPT-5', 'Qwen Coder', 'Claude Sonnet']
const modes = ['Agent', 'Terminal', 'Workflow', 'Video', 'Research']

const dockItems = [
  ['Home', 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z'],
  ['Agents', 'M12 3v4M12 17v4M4 12h4M16 12h4M7.5 7.5l2 2M14.5 14.5l2 2M16.5 7.5l-2 2M9.5 14.5l-2 2M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0Z'],
  ['Studio', 'M12 3l1.7 5.2H19l-4.3 3.1 1.7 5.2L12 13.3l-4.4 3.2 1.7-5.2L5 8.2h5.3L12 3Z'],
  ['Terminal', 'M4 6h16v12H4zM7 10l3 2-3 2M12 15h5'],
  ['Skills', 'M14 4l6 6-10 10H4v-6L14 4ZM13 7l4 4'],
  ['Memory', 'M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2ZM8 8h8M8 12h8M8 16h5'],
  ['Settings', 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8ZM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4'],
]

const agents = [
  ['BTC Momentum Agent', 'Market operator', '+18.4%', '74%', 'Reweighted signals 2m ago', [4, 12, 9, 18, 15, 24, 29, 27, 38]],
  ['Meme Narrative Tracker', 'Social sense engine', '+9.7%', '51%', 'Clustered 38 narratives', [8, 10, 16, 13, 24, 20, 28, 33, 36]],
  ['Whale Watcher', 'On-chain observer', '+4.1%', '62%', 'Tagged 6 wallets', [22, 19, 20, 18, 24, 25, 31, 29, 34]],
  ['Higgsfield Creative Agent', 'Media studio', '12 jobs', '43%', 'Rendered launch study', [5, 9, 17, 14, 22, 31, 30, 35, 41]],
  ['Market Sense Engine', 'Memory synthesis', '+22.8%', '89%', 'Compressed session memory', [16, 14, 18, 23, 21, 32, 36, 35, 43]],
]

function Icon({ path, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sparkline({ points, index }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const d = points.map((point, i) => {
    const x = (i / (points.length - 1)) * 180
    const y = 48 - ((point - min) / Math.max(max - min, 1)) * 48
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg viewBox="0 0 180 48" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-web-${index}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,122,0,0.15)" />
          <stop offset="100%" stopColor="rgba(255,122,0,0.95)" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#spark-web-${index})`}
        strokeLinecap="round"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4 + index * 0.06, duration: 1.1, ease: 'easeInOut' }}
      />
    </svg>
  )
}

function AmbientField() {
  const particles = Array.from({ length: 36 }, (_, index) => index)
  const glyphs = ['{agent:live}', 'mem.sync', 'deploy()', 'trace: 0x7A', 'strategy.evolve', 'tools.ready']

  return (
    <div className="xai-ambient" aria-hidden="true">
      <motion.div className="xai-grid-plane" animate={{ backgroundPosition: ['0px 0px', '72px 72px'] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="xai-fog xai-fog-one" animate={{ x: [0, 36, -14, 0], y: [0, -24, 18, 0], scale: [1, 1.08, 0.96, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="xai-fog xai-fog-two" animate={{ x: [0, -42, 18, 0], y: [0, 22, -18, 0], scale: [1, 0.94, 1.07, 1] }} transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }} />
      {particles.map((id) => (
        <motion.span
          key={id}
          className="xai-particle"
          style={{ left: `${(id * 37) % 100}%`, top: `${(id * 19) % 100}%` }}
          animate={{ y: [-14, -72], opacity: [0, 0.7, 0], scale: [0.7, 1.15, 0.8] }}
          transition={{ delay: (id % 9) * 0.35, duration: 8 + (id % 7), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {glyphs.map((glyph, index) => (
        <motion.span
          key={glyph}
          className="xai-glyph"
          style={{ left: `${12 + index * 14}%`, top: `${18 + (index % 3) * 22}%` }}
          animate={{ opacity: [0.08, 0.28, 0.08], y: [0, -8, 0] }}
          transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut' }}
        >
          {glyph}
        </motion.span>
      ))}
      <div className="xai-noise" />
    </div>
  )
}

function Composer() {
  const [popover, setPopover] = useState(null)
  const [tab, setTab] = useState(modelTabs[0])
  const [model, setModel] = useState(models[0])
  const [mode, setMode] = useState(modes[0])

  return (
    <motion.div className="xai-composer-wrap" initial={{ opacity: 0, y: 22, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.18, duration: 0.72, ease: [0.19, 1, 0.22, 1] }}>
      <div className="xai-composer xai-glass">
        <label className="xai-sr-only" htmlFor="xai-prompt">Prompt SLUGS</label>
        <textarea id="xai-prompt" placeholder="Ask SLUGS to deploy a trading agent, create a workflow, monitor markets, or evolve a strategy..." />
        <div className="xai-composer-actions">
          <div className="xai-action-cluster">
            {['Upload file', 'Use memory', 'Open tools'].map((label) => <button key={label} type="button" className="xai-icon-button xai-focus" aria-label={label}>{label[0]}</button>)}
          </div>
          <div className="xai-action-cluster">
            <button type="button" className="xai-pill-button xai-focus" aria-expanded={popover === 'model'} onClick={() => setPopover(popover === 'model' ? null : 'model')}>{model}<span>⌄</span></button>
            <button type="button" className="xai-pill-button xai-focus" aria-expanded={popover === 'mode'} onClick={() => setPopover(popover === 'mode' ? null : 'mode')}>{mode}<span>⌄</span></button>
            <motion.button type="button" className="xai-send-button xai-focus" whileTap={{ scale: 0.97 }}>Send <span>→</span></motion.button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {popover === 'model' && (
          <motion.div className="xai-popover xai-glass" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}>
            <div className="xai-popover-tabs" role="tablist" aria-label="Model categories">
              {modelTabs.map((item) => <button key={item} type="button" role="tab" className="xai-popover-tab xai-focus" data-active={item === tab} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            {models.map((item) => <button key={item} type="button" className="xai-model-row xai-focus" data-active={item === model} onClick={() => { setModel(item); setPopover(null) }}><span>{item}</span><small>{tab}</small></button>)}
          </motion.div>
        )}
        {popover === 'mode' && (
          <motion.div className="xai-popover xai-glass" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}>
            {modes.map((item) => <button key={item} type="button" className="xai-model-row xai-focus" data-active={item === mode} onClick={() => { setMode(item); setPopover(null) }}><span>{item}</span><small>mode</small></button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ExperimentalAINative() {
  return (
    <main className="xai-root">
      <AmbientField />
      <div className="xai-screen">
        <motion.aside className="xai-dock xai-glass" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
          <div className="xai-mark">SL</div>
          <nav className="xai-dock-items" aria-label="Experimental navigation">
            {dockItems.map(([label, path], index) => (
              <motion.button key={label} type="button" className="xai-dock-button xai-focus" aria-label={label} data-active={index === 0} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + index * 0.035 }}>
                <Icon path={path} />
              </motion.button>
            ))}
          </nav>
        </motion.aside>
        <div className="xai-stage">
          <motion.nav className="xai-top-nav xai-glass" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            {navItems.map((item) => <button key={item} type="button" className="xai-focus" data-active={item === 'Explore'}>{item}</button>)}
          </motion.nav>
          <motion.section className="xai-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72, ease: [0.19, 1, 0.22, 1] }}>
            <div className="xai-eyebrow"><span />Autonomous agent operating system</div>
            <h1>Your agents are alive.</h1>
            <p>Deploy, evolve, and interact with autonomous systems in real time.</p>
          </motion.section>
          <Composer />
          <section className="xai-recent">
            <div className="xai-section-head"><div><h2>Recent agents</h2><p>Live systems, memory traces, and recent autonomous actions.</p></div></div>
            <div className="xai-agent-grid">
              {agents.map(([name, type, pnl, memory, action, points], index) => (
                <motion.article key={name} className="xai-agent-card xai-glass" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 + index * 0.055, duration: 0.54, ease: [0.19, 1, 0.22, 1] }} whileHover={{ y: -8, scale: 1.015 }}>
                  <div className="xai-agent-card-top"><div><h3>{name}</h3><p>{type}</p></div><motion.span animate={{ scale: [1, 1.32, 1], opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }} /></div>
                  <div className="xai-sparkline"><Sparkline points={points} index={index} /></div>
                  <div className="xai-agent-metrics"><div><span>Output</span><strong>{pnl}</strong></div><div><span>Memory</span><strong>{memory}</strong></div></div>
                  <div className="xai-agent-action">{action}<span>↗</span></div>
                </motion.article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
