"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Database, Paperclip, Send, SlidersHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { modelTabs, models, modes } from "./data";

type Popover = "model" | "mode" | null;

export function AIComposer() {
  const [activePopover, setActivePopover] = useState<Popover>(null);
  const [activeTab, setActiveTab] = useState(modelTabs[0]);
  const [model, setModel] = useState(models[0].name);
  const [mode, setMode] = useState(modes[0].name);

  return (
    <motion.div
      className="composer-wrap"
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18, duration: 0.72, ease: [0.19, 1, 0.22, 1] }}
    >
      <div className="composer glass-panel">
        <label className="sr-only" htmlFor="experimental-ai-prompt">
          Prompt SLUGS
        </label>
        <textarea
          id="experimental-ai-prompt"
          placeholder="Ask SLUGS to deploy a trading agent, create a workflow, monitor markets, or evolve a strategy..."
        />
        <div className="composer-actions">
          <div className="action-cluster" aria-label="Composer tools">
            <button type="button" className="icon-button focus-ring" aria-label="Upload file">
              <Paperclip size={18} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button focus-ring" aria-label="Use memory">
              <Database size={18} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button focus-ring" aria-label="Open tools">
              <SlidersHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="action-cluster">
            <button
              type="button"
              className="pill-button focus-ring"
              aria-expanded={activePopover === "model"}
              onClick={() => setActivePopover(activePopover === "model" ? null : "model")}
            >
              <Sparkles size={16} aria-hidden="true" />
              {model}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pill-button focus-ring"
              aria-expanded={activePopover === "mode"}
              onClick={() => setActivePopover(activePopover === "mode" ? null : "mode")}
            >
              {mode}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <motion.button
              type="button"
              className="send-button focus-ring"
              whileTap={{ scale: 0.97 }}
              aria-label="Send prompt"
            >
              Send
              <Send size={16} aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {activePopover === "model" && (
          <motion.div
            className="popover glass-panel"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="popover-tabs" role="tablist" aria-label="Model categories">
              {modelTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  className="popover-tab focus-ring"
                  data-active={tab === activeTab ? "true" : "false"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {models.map((item) => (
              <button
                key={item.name}
                type="button"
                className="model-row focus-ring"
                data-active={item.name === model ? "true" : "false"}
                onClick={() => {
                  setModel(item.name);
                  setActivePopover(null);
                }}
              >
                <span className="model-name">
                  <Sparkles size={15} aria-hidden="true" />
                  {item.name}
                </span>
                <span className="model-chip">{item.meta}</span>
              </button>
            ))}
          </motion.div>
        )}
        {activePopover === "mode" && (
          <motion.div
            className="popover glass-panel"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
          >
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  className="mode-row focus-ring"
                  data-active={item.name === mode ? "true" : "false"}
                  onClick={() => {
                    setMode(item.name);
                    setActivePopover(null);
                  }}
                >
                  <span className="mode-name">
                    <Icon size={16} aria-hidden="true" />
                    {item.name}
                  </span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
