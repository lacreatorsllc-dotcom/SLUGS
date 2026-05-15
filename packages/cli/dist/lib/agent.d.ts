import type { AgentConfig } from './types.js';
export declare function loadAgent(name: string): AgentConfig | null;
export declare function saveAgent(config: AgentConfig): void;
export declare function listAgents(): AgentConfig[];
export declare function agentExists(name: string): boolean;
