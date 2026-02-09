import { useEffect } from "react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  useEffect(() => {
    document.title = "Page Not Found - CalAnywhere";
  }, []);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 text-center"
    >
      <h1 className="text-6xl font-bold text-content-muted">404</h1>
      <p className="mt-4 text-lg text-content-muted">
        This page doesn&apos;t exist or the link has expired.
      </p>
      <p className="mt-2 text-sm text-content-subtle">
        Scheduling links expire after a set duration for privacy.
        No data is stored once a link expires.
      </p>
      <Link to="/" className="btn-primary mt-8 px-6 py-3">
        Create a new scheduling page
      </Link>
    </main>
  );
}
