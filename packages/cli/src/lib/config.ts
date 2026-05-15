import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlugProject } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, 'slugs.json'))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

export function projectExists(): boolean {
  return existsSync(join(getProjectRoot(), 'slugs.json'));
}

export function loadProject(): SlugProject | null {
  const root = getProjectRoot();
  const path = join(root, 'slugs.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveProject(project: SlugProject): void {
  const root = getProjectRoot();
  const path = join(root, 'slugs.json');
  project.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(project, null, 2) + '\n', 'utf-8');
}

export function createProject(name: string, mode: SlugProject['mode'] = 'paper_trading'): SlugProject {
  const root = process.cwd();
  const project: SlugProject = {
    name,
    mode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agents: [],
    skills: [],
  };

  // Create directories
  mkdirSync(join(root, 'agents'), { recursive: true });
  mkdirSync(join(root, 'skills'), { recursive: true });
  mkdirSync(join(root, 'memory'), { recursive: true });

  // Create .env if missing
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    writeFileSync(envPath, '# SLUGS Configuration\n# SLUGS_API_KEY=\n# OPENROUTER_API_KEY=\n# SLUGS_MODE=paper_trading\n', 'utf-8');
  }

  saveProject(project);
  return project;
}