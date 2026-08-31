import { useState } from 'react';
import { Link } from 'react-router-dom';
import { accentColor } from '@/lib/accent';
import { useData } from '@/data/DataProvider';

const BASE = import.meta.env.BASE_URL;

/** Resolve a player's avatar image: explicit `avatar` → main-character
 *  portrait → null (caller renders a colored initial). */
function avatarImageSrc(
  avatar: string | undefined,
  mainCharacter: string | undefined,
): string | null {
  if (avatar) return `${BASE}${avatar.replace(/^\//, '')}`;
  if (mainCharacter) return `${BASE}char-icons/${mainCharacter}.webp`;
  return null;
}

/** A round player token. Shows the configured avatar, else the main-character
 *  portrait, else the tag initial.
 *
 *  `ring` draws the player's identity color around it — pass it only where that
 *  color does a job (Pairs view, the profile header), never as decoration. */
export function PlayerAccent({
  playerId,
  tag,
  size = 28,
  character,
  ring = false,
}: {
  playerId: string;
  tag?: string;
  size?: number;
  /** Character portrait to prefer when the player has no explicit avatar.
   *  Defaults to the player's main character. */
  character?: string;
  ring?: boolean;
}) {
  const { playerById, mainCharacterByPlayer } = useData();
  const [broken, setBroken] = useState(false);
  const player = playerById.get(playerId);
  const displayTag = tag ?? player?.player_tag ?? playerId;
  const color = accentColor(playerId);
  const mainCharacter = character ?? mainCharacterByPlayer.get(playerId) ?? undefined;
  const src = avatarImageSrc(player?.avatar, mainCharacter);
  const outline = ring ? `0 0 0 2px ${color}` : undefined;

  if (src && !broken) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, boxShadow: outline }}
        aria-hidden
      >
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-bg"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {displayTag.charAt(0).toUpperCase()}
    </span>
  );
}

export function PlayerLink({
  playerId,
  tag,
  strong = false,
  /** Identity color for the leading bar. Omit where the color carries no
   *  information — see the note on PlayerAccent. */
  accent,
}: {
  playerId: string;
  tag: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <Link
      to={`/player/${playerId}`}
      className="inline-flex items-center gap-2 hover:text-link"
      style={accent ? { borderLeft: `3px solid ${accent}`, paddingLeft: 8 } : undefined}
    >
      <PlayerAccent playerId={playerId} tag={tag} size={20} />
      <span className={strong ? 'font-extrabold' : 'font-semibold'}>{tag}</span>
    </Link>
  );
}
