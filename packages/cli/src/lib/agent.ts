import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentConfig } from './types.js';
import { getProjectRoot, loadProject, saveProject } from './config.js';

export function loadAgent(name: string): AgentConfig | null {
  const path = join(getProjectRoot(), 'agents', `${name}.md`);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  // Parse frontmatter-style metadata
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    const meta: AgentConfig = JSON.parse(match[1]);
    return meta;
  } catch {
    return null;
  }
}

export function saveAgent(config: AgentConfig): void {
  const root = getProjectRoot();
  const path = join(root, 'agents', `${config.name}.md`);
  const frontmatter = JSON.stringify(config, null, 2);
  const content = `---\n${frontmatter}\n---\n\n# ${config.name}\n\n**Purpose:** ${config.purpose}\n\n## Notes\n\n(Agent knowledge and context go here)\n`;
  writeFileSync(path, content, 'utf-8');

  // Update project agents list
  const project = loadProject();
  if (project && !project.agents.includes(config.name)) {
    project.agents.push(config.name);
    saveProject(project);
  }
}

export function listAgents(): AgentConfig[] {
  const root = getProjectRoot();
  const agentsDir = join(root, 'agents');
  if (!existsSync(agentsDir)) return [];
  return readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const name = f.replace(/\.md$/, '');
      return loadAgent(name);
    })
    .filter(Boolean) as AgentConfig[];
}

export function agentExists(name: string): boolean {
  return existsSync(join(getProjectRoot(), 'agents', `${name}.md`));
}