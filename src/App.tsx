import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { DataProvider } from '@/data/DataProvider';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PlayerProfilePage } from '@/pages/PlayerProfilePage';
import { HeadToHeadPage } from '@/pages/HeadToHeadPage';
import { MatchesPage } from '@/pages/MatchesPage';
import { NotFound } from '@/pages/NotFound';

const NAV = [
  { to: '/', label: 'Leaderboard', end: true },
  { to: '/h2h', label: 'Head-to-head', end: false },
  { to: '/matches', label: 'Matches', end: false },
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="font-display text-2xl !text-fg">
            C-TOWN
          </NavLink>
          <nav className="flex gap-4 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  isActive ? '!text-accent' : '!text-muted hover:!text-fg'
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">
        C-Town Tekken Leaderboard · static · $0 · reads committed JSON only.
      </footer>
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LeaderboardPage />} />
            <Route path="/player/:id" element={<PlayerProfilePage />} />
            <Route path="/h2h" element={<HeadToHeadPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </DataProvider>
    </HashRouter>
  );
}
