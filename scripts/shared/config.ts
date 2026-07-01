// Runtime config loader for the pipelines (§1.4). The frontend imports config as
// a module; the pipelines read it from disk so a cron run picks up edits.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { AppConfig } from '@/types/data-files';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..', '..');
export const DATA_DIR = resolve(REPO_ROOT, 'public', 'data');

export function loadConfig(): AppConfig {
  const path = resolve(REPO_ROOT, 'config', 'config.json');
  return JSON.parse(readFileSync(path, 'utf8')) as AppConfig;
}
