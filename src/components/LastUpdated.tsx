import { relativeTime } from '@/lib/format';

export function LastUpdated({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return <span title={iso}>updated {relativeTime(iso)}</span>;
}
