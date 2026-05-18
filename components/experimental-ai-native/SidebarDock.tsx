"use client";

import { motion } from "framer-motion";
import { dockItems } from "./data";

export function SidebarDock() {
  return (
    <motion.aside
      className="left-dock glass-panel"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.65, ease: [0.19, 1, 0.22, 1] }}
      aria-label="Experimental navigation"
    >
      <div className="slug-mark" aria-label="SLUGS">
        SL
      </div>
      <nav className="dock-items" aria-label="Primary">
        {dockItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              type="button"
              className="dock-button focus-ring"
              aria-label={item.label}
              data-active={item.active ? "true" : "false"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.035 }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={19} aria-hidden="true" strokeWidth={1.8} />
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}
