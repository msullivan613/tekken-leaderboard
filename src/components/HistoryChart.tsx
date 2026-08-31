import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { HistoryFile } from '@/types/data-files';
import { characterDisplayName } from '@/data/characters';
import { rankByTier } from '@/data/ranks';

interface Props {
  file: HistoryFile | null;
  pairIds: string[];
  mode: 'rank' | 'mmr';
  height?: number;
}

// Recharts takes concrete color strings, not CSS custom properties, so the
// tokens have to be resolved at render time — and re-resolved when the viewer's
// color scheme flips. Previously these were hardcoded hexes lifted from a
// charting library's defaults, which matched neither theme.
const SERIES_TOKENS = ['--pl-1', '--pl-0', '--pl-3', '--pl-4', '--pl-5', '--pl-6'];

function readToken(name: string): string {
  if (typeof window === 'undefined') return '#888';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : '#888';
}

function useThemeColors() {
  const read = () => ({
    grid: readToken('--border'),
    axis: readToken('--muted'),
    surface: readToken('--surface'),
    fg: readToken('--fg'),
    series: SERIES_TOKENS.map(readToken),
  });
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColors(read());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return colors;
}

// Merge multiple per-pair series into one row-per-date table for Recharts.
function buildChartData(file: HistoryFile | null, pairIds: string[]) {
  if (!file) return { data: [], keys: [] as { key: string; label: string }[] };
  const byDate = new Map<string, Record<string, number | string>>();
  const keys: { key: string; label: string }[] = [];
  for (const pairId of pairIds) {
    const series = file.series[pairId];
    if (!series) continue;
    const label = characterDisplayName(series.character);
    keys.push({ key: pairId, label });
    for (const [date, value] of series.points) {
      const row = byDate.get(date) ?? { date };
      row[pairId] = value;
      byDate.set(date, row);
    }
  }
  const data = [...byDate.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  return { data, keys };
}

export function HistoryChart({ file, pairIds, mode, height = 260 }: Props) {
  const { data, keys } = useMemo(() => buildChartData(file, pairIds), [file, pairIds]);
  const c = useThemeColors();

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        No {mode === 'rank' ? 'rank' : 'MMR'} history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke={c.axis} fontSize={11} tickLine={false} />
        <YAxis
          stroke={c.axis}
          fontSize={11}
          tickLine={false}
          domain={mode === 'rank' ? [0, 37] : ['auto', 'auto']}
          tickFormatter={
            mode === 'rank'
              ? (t: number) => rankByTier(t)?.display ?? String(t)
              : undefined
          }
          width={mode === 'rank' ? 120 : 44}
        />
        <Tooltip
          cursor={{ stroke: c.axis, strokeWidth: 1 }}
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.grid}`,
            borderRadius: 0,
            fontSize: 12,
            color: c.fg,
          }}
          labelStyle={{ color: c.axis }}
          formatter={(value: number) =>
            mode === 'rank' ? (rankByTier(value)?.display ?? value) : value
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: c.axis }} />
        {keys.map((k, i) => (
          <Line
            key={k.key}
            type={mode === 'rank' ? 'stepAfter' : 'monotone'}
            dataKey={k.key}
            name={k.label}
            stroke={c.series[i % c.series.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
