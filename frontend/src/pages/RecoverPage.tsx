import { FormEvent, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { recover } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { EmojiPicker } from "../components/EmojiPicker";

export function RecoverPage() {
  const navigate = useNavigate();
  const { refresh, isAuthenticated } = useAuth();

  const [emojiId, setEmojiId] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newIcalUrl, setNewIcalUrl] = useState("");
  const [wantsNewUrl, setWantsNewUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

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
    document.title = "Recover your account - CalAnywhere";
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);

    const trimmedId = emojiId.trim();
    const trimmedCode = recoveryCode.trim();
    const trimmedUrl = newIcalUrl.trim();

    if (!trimmedId || !trimmedCode) {
      setError("Emoji ID and recovery code are both required.");
      return;
    }

    if (wantsNewUrl && !trimmedUrl) {
      setError("Please enter your new iCal URL, or uncheck the option.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await recover(
        trimmedId,
        trimmedCode,
        wantsNewUrl ? trimmedUrl : undefined
      );
      setRemainingCodes(result.remainingRecoveryCodes);
      if (result.warning) {
        setWarning(result.warning);
      }

      // Save emoji ID to localStorage for future sessions
      try {
        localStorage.setItem("ca_emoji_id", trimmedId);
      } catch {
        // localStorage unavailable
      }

      await refresh();
      navigate("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        if (err.response.status === 429) {
          setError(
            "Too many recovery attempts. Please wait a few minutes and try again."
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
          Recover your account
        </h1>
        <p className="mt-2 text-sm text-content-muted">
          Use one of the recovery codes you saved when you created your account.
          Each code can only be used once.
        </p>
      </header>

      <section className="card mb-8" aria-label="Account recovery">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label required-indicator">Emoji ID</label>
            <div className="mt-2">
              <EmojiPicker
                value={emojiId}
                onChange={setEmojiId}
                id="emoji-id"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="recovery-code"
              className="label required-indicator"
            >
              Recovery code
            </label>
            <input
              id="recovery-code"
              type="text"
              required
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="Paste one of your recovery codes"
              className="input mt-2 font-mono text-sm"
              autoComplete="one-time-code"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="wants-new-url"
              type="checkbox"
              checked={wantsNewUrl}
              onChange={(e) => setWantsNewUrl(e.target.checked)}
              className="checkbox"
            />
            <label htmlFor="wants-new-url" className="text-sm text-content">
              I also need to update my iCal URL
            </label>
          </div>

          {wantsNewUrl && (
            <div>
              <label htmlFor="new-ical-url" className="label required-indicator">
                New iCal subscription URL
              </label>
              <input
                id="new-ical-url"
                type="url"
                required={wantsNewUrl}
                value={newIcalUrl}
                onChange={(e) => setNewIcalUrl(e.target.value)}
                placeholder="https://calendar.example.com/your-new-calendar.ics"
                className="input mt-2"
                autoComplete="url"
              />
              <p className="label-hint">
                Your old iCal URL will be replaced with this one.
              </p>
            </div>
          )}

          {error && (
            <div className="alert-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {warning && (
            <div className="alert-info" role="alert" aria-live="polite">
              {warning}
            </div>
          )}

          {remainingCodes !== null && (
            <div className="alert-info" role="status" aria-live="polite">
              You have {remainingCodes} recovery{" "}
              {remainingCodes === 1 ? "code" : "codes"} remaining.
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Recovering..." : "Recover account"}
          </button>
        </form>
      </section>

      <div className="space-y-2 text-center text-sm text-content-muted">
        <p>
          Remember your iCal URL?{" "}
          <Link
            to="/signin"
            className="text-accent-text hover:text-accent-hover"
          >
            Sign in instead
          </Link>
        </p>
        <p>
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-accent-text hover:text-accent-hover"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
