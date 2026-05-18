"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 19) % 100}%`,
  delay: (index % 9) * 0.35,
  duration: 8 + (index % 7),
}));

const glyphs = [
  "{agent:live}",
  "mem.sync",
  "deploy()",
  "trace: 0x7A",
  "strategy.evolve",
  "tools.ready",
];

export function AmbientField() {
  return (
    <div className="ambient-field" aria-hidden="true">
      <motion.div
        className="grid-plane"
        animate={{ backgroundPosition: ["0px 0px", "72px 72px"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="fog fog-one"
        animate={{ x: [0, 36, -14, 0], y: [0, -24, 18, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fog fog-two"
        animate={{ x: [0, -42, 18, 0], y: [0, 22, -18, 0], scale: [1, 0.94, 1.07, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="particle"
          style={{ left: particle.left, top: particle.top }}
          animate={{ y: [-14, -72], opacity: [0, 0.7, 0], scale: [0.7, 1.15, 0.8] }}
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {glyphs.map((glyph, index) => (
        <motion.span
          key={glyph}
          className="glyph"
          style={{ left: `${12 + index * 14}%`, top: `${18 + (index % 3) * 22}%` }}
          animate={{ opacity: [0.08, 0.28, 0.08], y: [0, -8, 0] }}
          transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut" }}
        >
          {glyph}
        </motion.span>
      ))}
      <div className="noise" />
    </div>
  );
}
