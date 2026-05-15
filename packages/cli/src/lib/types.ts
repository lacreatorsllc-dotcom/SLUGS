export interface SlugProject {
  name: string;
  mode: 'paper_trading' | 'live_trading' | 'simulation';
  createdAt: string;
  updatedAt: string;
  agents: string[];
  skills: string[];
}

export interface AgentConfig {
  name: string;
  purpose: string;
  createdAt: string;
  mode: 'paper_trading' | 'live_trading';
  model?: string;
  skills?: string[];
}