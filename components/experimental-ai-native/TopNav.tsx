"use client";

import { motion } from "framer-motion";
import { navItems } from "./data";

export function TopNav() {
  return (
    <motion.nav
      className="top-nav glass-panel"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      aria-label="Experimental sections"
    >
      {navItems.map((item) => (
        <button
          key={item}
          type="button"
          className="focus-ring"
          data-active={item === "Explore" ? "true" : "false"}
        >
          {item}
        </button>
      ))}
    </motion.nav>
  );
}
