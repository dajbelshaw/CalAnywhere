import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function NavBar() {
  const { session, isLoading, isAuthenticated, logout } = useAuth();

  return (
    <nav
      className="border-b border-border-muted bg-surface-elevated/60"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-content hover:text-accent-text"
        >
          CalAnywhere
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-xs text-content-muted">...</span>
          ) : isAuthenticated && session ? (
            <>
              <span
                className="emoji-spaced text-lg"
                role="img"
                aria-label={`Signed in as ${session.emojiId}`}
              >
                {session.emojiId}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-content-muted hover:text-content"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-sm text-content-muted hover:text-content"
              >
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary !min-h-0 !py-1.5 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
