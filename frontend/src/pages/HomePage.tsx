import { FormEvent, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface CreatePageResponse {
  slug: string;
  expiresAt: number;
  eventCount: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendarUrl, setCalendarUrl] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [bio, setBio] = useState("");
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(0);
  const [dateRange, setDateRange] = useState(60);

  const [previewEventCount, setPreviewEventCount] = useState<number | null>(
    null
  );
  const [createdPage, setCreatedPage] = useState<CreatePageResponse | null>(
    null
  );

  const handleValidateCalendar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // We piggy-back on the create endpoint but do not advance steps until success
      const resp = await axios.post<CreatePageResponse>("/api/pages", {
        calendarUrl,
        ownerName: "Preview",
        ownerEmail: "preview@example.com"
      });
      setPreviewEventCount(resp.data.eventCount);
      // We do not keep preview slug; a real page will be created in step 2.
      setStep(2);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          "We could not load your calendar. Please check the ICS URL."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const resp = await axios.post<CreatePageResponse>("/api/pages", {
        calendarUrl,
        ownerName,
        ownerEmail,
        bio,
        defaultDurationMinutes: duration,
        bufferMinutes: buffer,
        dateRangeDays: dateRange
      });
      setCreatedPage(resp.data);
      setStep(3);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          "We could not create your scheduling page. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const countdownLabel = (expiresAt: number) => {
    const ms = expiresAt - Date.now();
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const shareUrl = createdPage
    ? `${window.location.origin}/s/${createdPage.slug}`
    : "";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
          Share your calendar availability privately
        </h1>
        <p className="mt-3 text-slate-300">
          No sign-up, no database, no tracking. URLs expire after 24 hours.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
        <div className="mb-4 flex gap-2 text-sm text-slate-400">
          <span className={step === 1 ? "font-semibold text-sky-300" : ""}>
            1. Calendar URL
          </span>
          <span>›</span>
          <span className={step === 2 ? "font-semibold text-sky-300" : ""}>
            2. Your details
          </span>
          <span>›</span>
          <span className={step === 3 ? "font-semibold text-sky-300" : ""}>
            3. Share link
          </span>
        </div>

        {step === 1 && (
          <form onSubmit={handleValidateCalendar} className="space-y-4">
            <label className="block text-sm font-medium text-slate-200">
              Calendar subscription URL (ICS/iCal)
              <input
                type="url"
                required
                placeholder="https://mail.proton.me/api/calendar/v1/..."
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <p className="text-xs text-slate-400">
              We only read free/busy information from your calendar feed. No
              event details are shown to requesters.
            </p>
            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:opacity-60"
            >
              {isLoading ? "Checking calendar..." : "Validate calendar URL"}
            </button>
            {previewEventCount !== null && (
              <p className="mt-2 text-sm text-emerald-300">
                Calendar loaded. I see {previewEventCount} events in the next 60
                days.
              </p>
            )}
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCreatePage} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-200">
                Your name
                <input
                  type="text"
                  minLength={2}
                  maxLength={100}
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Email for requests
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-200">
              Short bio or title (optional)
              <textarea
                maxLength={200}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-slate-200">
                Appointment duration
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Buffer between slots
                <select
                  value={buffer}
                  onChange={(e) => setBuffer(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value={0}>No buffer</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Days to show
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <p>
                This URL will expire in 24 hours. You&apos;ll need to
                regenerate it daily to keep sharing availability.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:opacity-60"
              >
                {isLoading ? "Generating..." : "Generate scheduling page"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && createdPage && (
          <div className="space-y-4">
            <p className="text-sm text-slate-200">
              Your scheduling page is ready. Share this link with anyone who
              should be able to request a time with you.
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Shareable link
              </div>
              <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                <code className="flex-1 truncate rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-sky-200">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white md:mt-0"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl).catch(() => {
                      // ignore copy failure
                    });
                  }}
                >
                  Copy link
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Link expires in {countdownLabel(createdPage.expiresAt)}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/s/${createdPage.slug}`)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-sky-400 hover:text-sky-200"
            >
              View scheduling page
            </button>
          </div>
        )}
      </section>

      <footer className="mt-auto pt-8 text-xs text-slate-500">
        <p>
          Proton Scheduler is a privacy-first free/busy sharing tool. Your
          calendar details never leave your provider; we only expose availability
          windows for requesters.
        </p>
      </footer>
    </main>
  );
}

