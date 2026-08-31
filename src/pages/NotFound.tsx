import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-3xl">Nothing here</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist.</p>
      <Link to="/" className="link mt-4 inline-block">
        Back to the standings
      </Link>
    </div>
  );
}
