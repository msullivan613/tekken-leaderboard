import { relativeTime } from '@/lib/format';

export function LastUpdated({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <span className="text-sm text-muted" title={iso}>
      Last updated {relativeTime(iso)}
    </span>
  );
}
