import {
  Brain,
  Cpu,
  Database,
  Home,
  MemoryStick,
  Settings,
  Sparkles,
  Terminal,
  Workflow,
  Wrench,
} from "lucide-react";

export const dockItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Agents", icon: Cpu },
  { label: "Studio", icon: Sparkles },
  { label: "Terminal", icon: Terminal },
  { label: "Skills", icon: Wrench },
  { label: "Memory", icon: MemoryStick },
  { label: "Settings", icon: Settings },
];

export const navItems = ["Explore", "Agents", "Studio", "Deploy", "Memory"];
export const modelTabs = ["Reasoning", "Fast", "Creative", "Autonomous"];

export const models = [
  { name: "Ring 2.6", meta: "autonomous" },
  { name: "DeepSeek 4", meta: "reasoning" },
  { name: "Gemini Flash", meta: "low latency" },
  { name: "GPT-5", meta: "general" },
  { name: "Qwen Coder", meta: "code" },
  { name: "Claude Sonnet", meta: "creative" },
];

export const modes = [
  { name: "Agent", icon: Brain },
  { name: "Terminal", icon: Terminal },
  { name: "Workflow", icon: Workflow },
  { name: "Video", icon: Sparkles },
  { name: "Research", icon: Database },
];

export const agents = [
  {
    name: "BTC Momentum Agent",
    type: "Market operator",
    pnl: "+18.4%",
    memory: "74%",
    action: "Reweighted signals 2m ago",
    points: [4, 12, 9, 18, 15, 24, 29, 27, 38],
  },
  {
    name: "Meme Narrative Tracker",
    type: "Social sense engine",
    pnl: "+9.7%",
    memory: "51%",
    action: "Clustered 38 narratives",
    points: [8, 10, 16, 13, 24, 20, 28, 33, 36],
  },
  {
    name: "Whale Watcher",
    type: "On-chain observer",
    pnl: "+4.1%",
    memory: "62%",
    action: "Tagged 6 wallets",
    points: [22, 19, 20, 18, 24, 25, 31, 29, 34],
  },
  {
    name: "Higgsfield Creative Agent",
    type: "Media studio",
    pnl: "12 jobs",
    memory: "43%",
    action: "Rendered launch study",
    points: [5, 9, 17, 14, 22, 31, 30, 35, 41],
  },
  {
    name: "Market Sense Engine",
    type: "Memory synthesis",
    pnl: "+22.8%",
    memory: "89%",
    action: "Compressed session memory",
    points: [16, 14, 18, 23, 21, 32, 36, 35, 43],
  },
];
