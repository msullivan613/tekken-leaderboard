import { Link } from 'react-router-dom';
import { accentColor } from '@/lib/accent';

/** A colored dot/initial that visually groups a player's rows (§5.3). */
export function PlayerAccent({
  playerId,
  tag,
  size = 28,
}: {
  playerId: string;
  tag: string;
  size?: number;
}) {
  const color = accentColor(playerId);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display text-bg"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {tag.charAt(0).toUpperCase()}
    </span>
  );
}

export function PlayerLink({ playerId, tag }: { playerId: string; tag: string }) {
  return (
    <Link
      to={`/player/${playerId}`}
      className="inline-flex items-center gap-2 !text-fg hover:!text-accent"
      style={{ borderLeft: `3px solid ${accentColor(playerId)}`, paddingLeft: 8 }}
    >
      <PlayerAccent playerId={playerId} tag={tag} size={24} />
      <span className="font-medium">{tag}</span>
    </Link>
  );
}
