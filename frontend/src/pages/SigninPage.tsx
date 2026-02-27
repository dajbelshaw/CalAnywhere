import { FormEvent, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { signin } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { EmojiPicker } from "../components/EmojiPicker";

export function SigninPage() {
  const navigate = useNavigate();
  const { refresh, isAuthenticated } = useAuth();

  const [emojiId, setEmojiId] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill emoji ID from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ca_emoji_id");
      if (saved) setEmojiId(saved);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    document.title = "Sign in - CalAnywhere";
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = emojiId.trim();
    const trimmedUrl = icalUrl.trim();

    if (!trimmedId || !trimmedUrl) {
      setError("Both fields are required.");
      return;
    }

    setIsLoading(true);
    try {
      await signin(trimmedId, trimmedUrl);
      // Remember emoji ID on this device
      try {
        localStorage.setItem("ca_emoji_id", trimmedId);
      } catch {
        // non-fatal
      }
      await refresh();
      navigate("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        if (err.response.status === 429) {
          setError(
            "Too many sign-in attempts. Please wait a few minutes and try again."
          );
        } else {
          setError(err.response.data.error);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10"
    >
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-content-muted">
          Enter your Emoji ID and the iCal URL you used when you signed up.
        </p>
      </header>

      <section className="card mb-8" aria-label="Sign in">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label required-indicator">Emoji ID</label>
            <div className="mt-2">
              <EmojiPicker
                value={emojiId}
                onChange={setEmojiId}
                id="emoji-id-picker"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ical-url" className="label required-indicator">
              iCal subscription URL
            </label>
            <input
              id="ical-url"
              type="url"
              required
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://calendar.example.com/your-calendar.ics"
              className="input mt-2"
              autoComplete="current-password"
            />
            <p className="label-hint">
              The same URL you used when you created your account.
            </p>
          </div>

          {error && (
            <div className="alert-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>

      <div className="space-y-2 text-center text-sm text-content-muted">
        <p>
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-accent-text hover:text-accent-hover"
          >
            Create one
          </Link>
        </p>
        <p>
          Lost access to your calendar URL?{" "}
          <Link
            to="/recover"
            className="text-accent-text hover:text-accent-hover"
          >
            Recover your account
          </Link>
        </p>
      </div>
    </main>
  );
}
