import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-5xl">404</h1>
      <p className="mt-2 text-muted">That page got perfect-parried.</p>
      <Link to="/" className="mt-4 inline-block">
        ← Back to the leaderboard
      </Link>
    </div>
  );
}
