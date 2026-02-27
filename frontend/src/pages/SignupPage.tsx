import { FormEvent, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { suggestEmojiIds, signup } from "../services/auth";
import { createPage } from "../services/dashboard";
import { useAuth } from "../contexts/AuthContext";

// Internal steps: 1–6. Visual indicator maps to 4 dots.
type InternalStep = 1 | 2 | 3 | 4 | 5 | 6;

function indicatorStep(s: InternalStep): 1 | 2 | 3 | 4 {
  if (s <= 2) return 1;
  if (s === 3) return 2;
  if (s === 4) return 3;
  return 4;
}

const INDICATOR_LABELS = [
  { num: 1, label: "Emoji ID" },
  { num: 2, label: "Calendar" },
  { num: 3, label: "Your page" },
  { num: 4, label: "Recovery" },
] as const;

const STEP_TITLES: Record<InternalStep, string> = {
  1: "Choose your Emoji ID - CalAnywhere",
  2: "Remember your Emoji ID - CalAnywhere",
  3: "Connect your calendar - CalAnywhere",
  4: "Set up your first page - CalAnywhere",
  5: "Save your recovery codes - CalAnywhere",
  6: "CalAnywhere",
};

const ICAL_GUIDES: { provider: string; steps: string }[] = [
  {
    provider: "Google Calendar",
    steps:
      'Open Google Calendar \u2192 Settings (cog icon) \u2192 select your calendar under "Settings for my calendars" \u2192 "Integrate calendar" \u2192 copy the "Secret address in iCal format" link.',
  },
  {
    provider: "Apple / iCloud",
    steps:
      'Open the Calendar app \u2192 right-click your calendar \u2192 Share Calendar \u2192 tick "Public Calendar" \u2192 copy the URL that appears.',
  },
  {
    provider: "Proton Calendar",
    steps:
      'Open Proton Calendar \u2192 Settings \u2192 Calendars \u2192 select your calendar \u2192 scroll to "Share outside Proton" \u2192 create a link \u2192 copy the iCal URL.',
  },
  {
    provider: "Fastmail",
    steps:
      'Open Fastmail \u2192 Calendars \u2192 click the sharing icon next to your calendar \u2192 under "Share with anyone" copy the ICS link.',
  },
];

const EXPIRY_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { refresh, isAuthenticated } = useAuth();

  const [step, setStep] = useState<InternalStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Emoji ID selection
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Step 2: Remember emoji ID ceremony
  const [emojiIdConfirmed, setEmojiIdConfirmed] = useState(false);

  // Step 3: iCal URL
  const [icalUrl, setIcalUrl] = useState("");
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // Step 4: Page creation (skippable)
  const [ownerName, setOwnerName] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [bio, setBio] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [dateRangeDays, setDateRangeDays] = useState(60);
  const [minNoticeHours, setMinNoticeHours] = useState(8);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  // Step 5: Recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const chosenEmojiId =
    selectedIndex !== null ? suggestions[selectedIndex] : null;

  // Redirect if already authenticated (but allow steps 4+ where we just signed up)
  useEffect(() => {
    if (isAuthenticated && step < 4) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, step, navigate]);

  useEffect(() => {
    document.title = STEP_TITLES[step];
  }, [step]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setIsSuggesting(true);
    setSelectedIndex(null);
    try {
      const ids = await suggestEmojiIds(3);
      setSuggestions(ids);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  // --- Step 1: Choose Emoji ID ---
  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!chosenEmojiId) {
      setError("Please choose an Emoji ID.");
      return;
    }
    setStep(2);
  };

  // --- Step 2: Remember Emoji ID ---
  const handleStep2Continue = () => {
    setError(null);
    setStep(3);
  };

  // --- Step 3: Connect calendar / create account ---
  const handleStep3Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = icalUrl.trim();
    if (!trimmedUrl) {
      setError("Please paste your iCal URL.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signup(trimmedUrl, chosenEmojiId || undefined);
      setRecoveryCodes(result.recoveryCodes);
      // Remember emoji ID on this device
      try {
        localStorage.setItem("ca_emoji_id", result.emojiId);
      } catch {
        // localStorage unavailable (private browsing, etc.) — non-fatal
      }
      setStep(4);
    } catch (err: unknown) {
      if (
        axios.isAxiosError(err) &&
        err.response?.data?.error
      ) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 4: Create first page ---
  const handlePageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = ownerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Display name is required (at least 2 characters).");
      return;
    }

    setIsCreatingPage(true);
    try {
      await createPage({
        title: pageTitle.trim() || undefined,
        ownerName: trimmedName,
        bio: bio.trim() || undefined,
        notificationEmail: notificationEmail.trim() || undefined,
        calendarUrls: [icalUrl.trim()],
        defaultDurationMinutes,
        bufferMinutes,
        dateRangeDays,
        minNoticeHours,
        includeWeekends,
        expiryDays,
      });
      setError(null);
      setStep(5);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(
          "Could not create the page. You can skip this and do it later from your dashboard."
        );
      }
    } finally {
      setIsCreatingPage(false);
    }
  };

  const handlePageSkip = () => {
    setError(null);
    setStep(5);
  };

  // --- Step 5: Copy recovery codes ---
  const handleCopyCodes = useCallback(async () => {
    const text = recoveryCodes.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [recoveryCodes]);

  // --- Step 5 → 6: Finish ---
  const handleFinish = async () => {
    await refresh();
    navigate("/dashboard");
  };

  const currentIndicator = indicatorStep(step);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10"
    >
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-content-muted">
          No email required. No passwords. Just an Emoji ID and your calendar.
        </p>
      </header>

      <section className="card mb-8" aria-label="Sign up">
        {/* Step indicator (4 visual steps) */}
        <nav aria-label="Signup progress" className="mb-6">
          <ol className="flex gap-2 text-sm text-content-muted">
            {INDICATOR_LABELS.map((item, i) => (
              <li key={item.num} className="contents">
                {i > 0 && <span aria-hidden="true">&rsaquo; </span>}
                <span
                  className={
                    currentIndicator === item.num
                      ? "font-semibold text-accent-text"
                      : ""
                  }
                >
                  <span
                    aria-current={
                      currentIndicator === item.num ? "step" : undefined
                    }
                  >
                    {item.num}. {item.label}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </nav>

        {/* ===== Step 1: Choose Emoji ID ===== */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">
                Choose your Emoji ID
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                This is your login to CalAnywhere, paired with your iCal URL.
                Pick one that is easy for you to remember.
              </p>
            </div>

            <fieldset>
              <legend className="text-xs uppercase tracking-wide text-content-muted">
                Pick one you like
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {isSuggesting
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="card-inner flex flex-col items-center justify-center py-5 opacity-50"
                      >
                        <span className="text-3xl">...</span>
                      </div>
                    ))
                  : suggestions.map((id, i) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`card-inner flex cursor-pointer flex-col items-center gap-2 py-5 transition-all ${
                          selectedIndex === i
                            ? "ring-2 ring-accent-text ring-offset-2 ring-offset-surface-base"
                            : "hover:ring-1 hover:ring-border"
                        }`}
                        role="radio"
                        aria-checked={selectedIndex === i}
                        aria-label={`Emoji ID option ${i + 1}: ${id}`}
                      >
                        <span className="emoji-spaced text-4xl">{id}</span>
                        {selectedIndex === i && (
                          <span className="text-xs font-medium text-accent-text">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
              </div>
            </fieldset>

            {error && (
              <div
                className="alert-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!chosenEmojiId}
              className="btn-primary w-full"
            >
              Continue with{" "}
              <span className="emoji-spaced">
                {chosenEmojiId || "..."}
              </span>
            </button>
          </form>
        )}

        {/* ===== Step 2: Remember your Emoji ID ===== */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">
                Remember your Emoji ID
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                This is your identity on CalAnywhere. You will need it every
                time you sign in and to use your recovery codes. There is no way
                to look it up later.
              </p>
            </div>

            <div className="flex justify-center py-4">
              <span
                className="emoji-spaced text-7xl"
                role="img"
                aria-label={`Your Emoji ID: ${chosenEmojiId}`}
              >
                {chosenEmojiId}
              </span>
            </div>

            <div className="alert-info">
              <p className="text-sm">
                Take a screenshot, write it down, or save it in your password
                manager.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="confirm-emoji-noted"
                type="checkbox"
                checked={emojiIdConfirmed}
                onChange={(e) => setEmojiIdConfirmed(e.target.checked)}
                className="checkbox"
              />
              <label
                htmlFor="confirm-emoji-noted"
                className="text-sm text-content"
              >
                I have noted my Emoji ID
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setEmojiIdConfirmed(false);
                  setError(null);
                  setStep(1);
                }}
                className="btn-ghost"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleStep2Continue}
                disabled={!emojiIdConfirmed}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ===== Step 3: Connect your calendar ===== */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">
                Connect your calendar
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Paste the private iCal subscription URL from your calendar
                provider. This link is your credential: treat it like a
                password.
              </p>
            </div>

            <div>
              <label htmlFor="ical-url" className="label required-indicator">
                iCal subscription URL
              </label>
              <input
                id="ical-url"
                type="url"
                required
                autoComplete="url"
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://calendar.example.com/your-calendar.ics"
                className="input mt-2"
                aria-describedby="ical-hint"
              />
              <p id="ical-hint" className="label-hint">
                This URL is hashed and stored securely. We never store it in
                plain text.
              </p>
            </div>

            {/* Provider guides */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-content/90">
                Where do I find this?
              </p>
              {ICAL_GUIDES.map((guide) => (
                <div
                  key={guide.provider}
                  className="border-b border-border/30 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGuide(
                        expandedGuide === guide.provider
                          ? null
                          : guide.provider
                      )
                    }
                    className="flex w-full items-center justify-between py-2 text-left text-sm text-content-muted hover:text-content"
                    aria-expanded={expandedGuide === guide.provider}
                  >
                    <span>{guide.provider}</span>
                    <span
                      className="text-xs transition-transform"
                      aria-hidden="true"
                    >
                      {expandedGuide === guide.provider ? "\u25BE" : "\u25B8"}
                    </span>
                  </button>
                  {expandedGuide === guide.provider && (
                    <p className="pb-3 text-xs text-content-subtle leading-relaxed">
                      {guide.steps}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div
                className="alert-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="btn-ghost"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="btn-primary"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        {/* ===== Step 4: Set up your first page (skippable) ===== */}
        {step === 4 && (
          <form onSubmit={handlePageSubmit} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">
                Set up your first page
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Create a scheduling page so people can see when you are free and
                request a time to meet. You can always do this later from your
                dashboard.
              </p>
            </div>

            {/* Calendar URL (read-only, from step 3) */}
            <div>
              <span className="label">Calendar URL</span>
              <div className="card-inner mt-2 flex items-center gap-2 text-sm text-content-muted">
                <span className="text-green-400">&#10003;</span>
                <span className="min-w-0 flex-1 truncate">{icalUrl}</span>
              </div>
              <p className="label-hint">
                Using the calendar you connected in the previous step.
              </p>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="owner-name" className="label required-indicator">
                Display name
              </label>
              <input
                id="owner-name"
                type="text"
                required
                maxLength={100}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Jane Smith"
                className="input mt-2"
                aria-describedby="owner-name-hint"
              />
              <p id="owner-name-hint" className="label-hint">
                Shown to visitors on your scheduling page.
              </p>
            </div>

            {/* Page title */}
            <div>
              <label htmlFor="page-title" className="label">
                Page title
              </label>
              <input
                id="page-title"
                type="text"
                maxLength={100}
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="e.g. Office hours, 1:1 catch-up"
                className="input mt-2"
                aria-describedby="page-title-hint"
              />
              <p id="page-title-hint" className="label-hint">
                Optional. Helps you tell pages apart in the dashboard.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="label">
                Bio
              </label>
              <textarea
                id="bio"
                maxLength={200}
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short note visitors will see on your page."
                className="input mt-2 resize-none"
                aria-describedby="bio-hint"
              />
              <p id="bio-hint" className="label-hint">
                Optional. Up to 200 characters.
              </p>
            </div>

            {/* Scheduling settings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="duration" className="label">
                  Meeting duration
                </label>
                <select
                  id="duration"
                  value={defaultDurationMinutes}
                  onChange={(e) =>
                    setDefaultDurationMinutes(Number(e.target.value))
                  }
                  className="input mt-2"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="buffer" className="label">
                  Buffer between meetings
                </label>
                <select
                  id="buffer"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="input mt-2"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="date-range" className="label">
                  Show availability for
                </label>
                <select
                  id="date-range"
                  value={dateRangeDays}
                  onChange={(e) => setDateRangeDays(Number(e.target.value))}
                  className="input mt-2"
                >
                  <option value={7}>Next 7 days</option>
                  <option value={14}>Next 14 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
              </div>

              <div>
                <label htmlFor="notice" className="label">
                  Minimum notice
                </label>
                <select
                  id="notice"
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                  className="input mt-2"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="weekends"
                type="checkbox"
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="weekends" className="text-sm text-content">
                Include weekends
              </label>
            </div>

            {/* Notification email */}
            <div>
              <label htmlFor="notification-email" className="label">
                Notification email
              </label>
              <input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="input mt-2"
                aria-describedby="notification-email-hint"
              />
              <p id="notification-email-hint" className="label-hint">
                Optional. Get an email when someone requests a meeting. This
                address is encrypted and never shared. You can always check your
                dashboard instead.
              </p>
            </div>

            {/* Expiry */}
            <fieldset>
              <legend className="label">
                How long should this page stay active?
              </legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {EXPIRY_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setExpiryDays(preset.days)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      expiryDays === preset.days
                        ? "border-accent-text bg-accent-text/10 text-accent-text"
                        : "border-border text-content-muted hover:border-content-muted hover:text-content"
                    }`}
                    role="radio"
                    aria-checked={expiryDays === preset.days}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="label-hint mt-3">
                Free tier: up to 30 days. After expiry, visitors will see a
                message that the page is no longer active.
              </p>
            </fieldset>

            {error && (
              <div
                className="alert-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePageSkip}
                className="btn-ghost"
              >
                Skip, I'll do this later
              </button>
              <button
                type="submit"
                disabled={isCreatingPage}
                aria-busy={isCreatingPage}
                className="btn-primary"
              >
                {isCreatingPage ? "Creating page..." : "Create page"}
              </button>
            </div>
          </form>
        )}

        {/* ===== Step 5: Save your recovery codes ===== */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">
                Save your recovery codes
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                These codes let you recover your account if you lose access to
                your calendar URL. You will need both your Emoji ID and a
                recovery code to recover access. Save them somewhere safe: they
                will not be shown again.
              </p>
            </div>

            <div className="card-inner">
              <div className="space-y-2 font-mono text-sm">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded bg-surface-base/50 px-3 py-2"
                  >
                    <span className="text-xs text-content-muted">
                      {i + 1}.
                    </span>
                    <span className="flex-1 select-all text-content break-all">
                      {code}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopyCodes}
                className="btn-secondary mt-4 w-full text-sm"
                aria-live="polite"
              >
                {copySuccess ? "Copied to clipboard" : "Copy all codes"}
              </button>
            </div>

            <div className="alert-info">
              <p className="text-sm">
                <strong>No email recovery.</strong> CalAnywhere does not collect
                your email address. If you lose your iCal URL and all your
                recovery codes, your account cannot be recovered. Keep your
                Emoji ID and these codes together.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="confirm-saved"
                type="checkbox"
                checked={savedConfirmed}
                onChange={(e) => setSavedConfirmed(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="confirm-saved" className="text-sm text-content">
                I have saved my recovery codes in a safe place
              </label>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              disabled={!savedConfirmed}
              className="btn-primary w-full"
            >
              Continue to CalAnywhere
            </button>
          </div>
        )}
      </section>

      <p className="text-center text-sm text-content-muted">
        Already have an account?{" "}
        <Link
          to="/signin"
          className="text-accent-text hover:text-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
