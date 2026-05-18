"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight } from "lucide-react";
import { agents } from "./data";

function pathFromPoints(points: number[]) {
  const width = 180;
  const height = 48;
  const max = Math.max(...points);
  const min = Math.min(...points);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / Math.max(max - min, 1)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function RecentAgents() {
  return (
    <section className="recent" aria-labelledby="recent-agents-title">
      <div className="section-head">
        <div>
          <h2 id="recent-agents-title">Recent agents</h2>
          <p>Live systems, memory traces, and recent autonomous actions.</p>
        </div>
      </div>
      <div className="agent-grid">
        {agents.map((agent, index) => (
          <motion.article
            key={agent.name}
            className="agent-card glass-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 + index * 0.055, duration: 0.54, ease: [0.19, 1, 0.22, 1] }}
            whileHover={{ y: -8, scale: 1.015 }}
          >
            <div className="agent-card-top">
              <div>
                <h3 className="agent-title">{agent.name}</h3>
                <div className="agent-type">{agent.type}</div>
              </div>
              <motion.span
                className="status-dot"
                animate={{ scale: [1, 1.32, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
              />
            </div>
            <div className="sparkline" aria-hidden="true">
              <svg viewBox="0 0 180 48" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`spark-${index}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="rgba(255,122,0,0.15)" />
                    <stop offset="100%" stopColor="rgba(255,122,0,0.95)" />
                  </linearGradient>
                </defs>
                <motion.path
                  d={pathFromPoints(agent.points)}
                  fill="none"
                  stroke={`url(#spark-${index})`}
                  strokeLinecap="round"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4 + index * 0.06, duration: 1.1, ease: "easeInOut" }}
                />
              </svg>
            </div>
            <div className="agent-metrics">
              <div className="metric">
                <span>Output</span>
                <strong>{agent.pnl}</strong>
              </div>
              <div className="metric">
                <span>Memory</span>
                <strong>{agent.memory}</strong>
              </div>
            </div>
            <div className="agent-action">
              <Activity size={13} aria-hidden="true" />
              {agent.action}
              <ArrowUpRight size={13} aria-hidden="true" />
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
