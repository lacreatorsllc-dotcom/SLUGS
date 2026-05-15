import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function logActivity(agentName: string, message: string): void {
  const root = process.cwd();
  const dir = join(root, 'memory');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${agentName}.log`);
  const timestamp = new Date().toISOString();
  appendFileSync(path, `[${timestamp}] ${message}\n`, 'utf-8');
}

export function getActivityLog(agentName: string): string {
  const path = join(process.cwd(), 'memory', `${agentName}.log`);
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf-8');
}