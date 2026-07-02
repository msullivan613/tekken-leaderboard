import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

const SITE = process.env.SITE ?? 'c-town';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@site-config': resolve(
        fileURLToPath(new URL('.', import.meta.url)),
        'sites',
        SITE,
        'config.json',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // 100% is enforced only on the deterministic pure-logic core (pipeline math,
      // rank/character tables, config layering). Network IO (tknow/ewgf/wavu fetch),
      // entry points (index.ts, build-all.ts, main.tsx), and the React UI are
      // deliberately out of scope for now — they lack a test harness and are the
      // natural next tranche to fold in. Keep this list append-only: adding a file
      // here means it must be at 100% to merge.
      include: [
        'scripts/online-stats/matches.ts',
        'scripts/online-stats/stats.ts',
        'scripts/online-stats/history.ts',
        'src/lib/config-merge.ts',
        'src/data/ranks.ts',
        'src/data/characters.ts',
        'src/types/domain.ts',
      ],
      reporter: ['text', 'text-summary'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
