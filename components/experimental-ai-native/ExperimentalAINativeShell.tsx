"use client";

import { motion } from "framer-motion";
import { AIComposer } from "./AIComposer";
import { AmbientField } from "./AmbientField";
import { RecentAgents } from "./RecentAgents";
import { SidebarDock } from "./SidebarDock";
import { TopNav } from "./TopNav";

export function ExperimentalAINativeShell() {
  return (
    <main className="experimental-ai-native">
      <AmbientField />
      <div className="exp-screen">
        <SidebarDock />
        <div className="exp-stage">
          <TopNav />
          <motion.section
            className="hero"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.19, 1, 0.22, 1] }}
            aria-labelledby="experimental-ai-title"
          >
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Autonomous agent operating system
            </div>
            <h1 id="experimental-ai-title">Your agents are alive.</h1>
            <p>Deploy, evolve, and interact with autonomous systems in real time.</p>
          </motion.section>
          <AIComposer />
          <RecentAgents />
        </div>
      </div>
    </main>
  );
}
