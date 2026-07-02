import { useMemo } from 'react';
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

const LINE_COLORS = ['#7a5cff', '#00d6b3', '#ff6384', '#ffce56', '#36a2eb', '#ff9f40'];

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

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">
        No {mode === 'rank' ? 'rank' : 'MMR'} history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="rgb(44 50 66)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="rgb(148 158 178)" fontSize={11} />
        <YAxis
          stroke="rgb(148 158 178)"
          fontSize={11}
          domain={mode === 'rank' ? [0, 37] : ['auto', 'auto']}
          tickFormatter={
            mode === 'rank'
              ? (t: number) => rankByTier(t)?.display ?? String(t)
              : undefined
          }
          width={mode === 'rank' ? 120 : 40}
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(20 23 32)',
            border: '1px solid rgb(44 50 66)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) =>
            mode === 'rank' ? (rankByTier(value)?.display ?? value) : value
          }
        />
        <Legend />
        {keys.map((k, i) => (
          <Line
            key={k.key}
            type={mode === 'rank' ? 'stepAfter' : 'monotone'}
            dataKey={k.key}
            name={k.label}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
