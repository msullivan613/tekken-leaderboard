import { describe, it, expect } from 'vitest';
import { parseWavuProfile } from '../scripts/online-stats/wavu';

// Mirrors the verified DOM in spec §7.3.
const HTML = `
<html><body>
<div class="rating-group">
  <div class="label">Leaderboard (σ² &lt; 75)</div>
  <div class="ratings">
    <div class="rating">
      <div class="char">Yoshimitsu</div>
      <div class="mu">μ 1715</div>
      <div class="sigma"><sup>σ² 68</sup></div>
      <div class="games">559 games</div>
      <div class="last-seen"><sup><time><script>printDate(1781924751)</script></time></sup></div>
    </div>
    <div class="rating">
      <div class="char">Devil Jin</div>
      <div class="mu">μ 1,740</div>
      <div class="sigma"><sup>σ² 72</sup></div>
      <div class="games">176 games</div>
      <div class="last-seen"><sup><time><script>printDate(1781000000)</script></time></sup></div>
    </div>
  </div>
</div>
<div class="rating-group">
  <div class="label">Provisional (σ² ≥ 110)</div>
  <div class="ratings">
    <div class="rating">
      <div class="char">Kazuya</div>
      <div class="mu">μ 1655</div>
      <div class="sigma"><sup>σ² 118</sup></div>
      <div class="games">88 games</div>
      <div class="last-seen"></div>
    </div>
  </div>
</div>
</body></html>`;

describe('parseWavuProfile', () => {
  const stats = parseWavuProfile(HTML);

  it('parses μ, σ², games, confidence, and character slug', () => {
    const yoshi = stats.find((s) => s.character === 'yoshimitsu');
    expect(yoshi).toMatchObject({
      rating: 1715,
      sigmaSquared: 68,
      games: 559,
      confidence: 'leaderboard',
    });
  });

  it('handles thousands separators in μ', () => {
    expect(stats.find((s) => s.character === 'devil_jin')?.rating).toBe(1740);
  });

  it('parses printDate() unix seconds to ISO', () => {
    expect(stats.find((s) => s.character === 'yoshimitsu')?.lastUpdated).toBe(
      new Date(1781924751 * 1000).toISOString(),
    );
  });

  it('sets provisional flag from the group bucket', () => {
    const kaz = stats.find((s) => s.character === 'kazuya');
    expect(kaz?.confidence).toBe('provisional');
  });
});
