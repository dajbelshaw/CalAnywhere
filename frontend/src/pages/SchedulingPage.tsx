import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface PageData {
  slug: string;
  ownerName: string;
  ownerEmail: string;
  bio?: string;
  defaultDurationMinutes: number;
  bufferMinutes: number;
  dateRangeDays: number;
  expiresAt: number;
  busySlots: { start: string; end: string }[];
}

interface Slot {
  start: Date;
  end: Date;
}

export function SchedulingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setIsLoading(true);
    axios
      .get<PageData>(`/api/pages/${slug}`)
      .then((resp) => {
        if (!isMounted) return;
        setPage(resp.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err?.response?.data?.error ??
            "This scheduling link is not available. It may have expired."
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const isBusy = (start: Date, end: Date) => {
    if (!page) return false;
    return page.busySlots.some((slot) => {
      const s = new Date(slot.start);
      const e = new Date(slot.end);
      return s < end && e > start;
    });
  };

  // Very simple free/busy daily grid for the next 7 days
  const buildSlots = (): { date: Date; slots: Slot[] }[] => {
    if (!page) return [];
    const out: { date: Date; slots: Slot[] }[] = [];
    const duration = page.defaultDurationMinutes;
    const now = new Date();
    const days = Math.min(7, page.dateRangeDays);

    for (let d = 0; d < days; d++) {
      const day = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + d,
        0,
        0,
        0,
        0
      );
      const slots: Slot[] = [];
      // 9:00 to 17:00
      for (let h = 9; h < 17; h++) {
        const start = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          h,
          0,
          0,
          0
        );
        const end = new Date(start.getTime() + duration * 60000);
        if (!isBusy(start, end)) {
          slots.push({ start, end });
        }
      }
      out.push({ date: day, slots });
    }
    return out;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!page || !slug || !selectedSlot) return;
    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await axios.post(`/api/pages/${slug}/requests`, {
        requesterName,
        requesterEmail,
        reason,
        notes,
        startIso: selectedSlot.start.toISOString(),
        endIso: selectedSlot.end.toISOString()
      });
      setSuccessMessage(
        `Your appointment request has been sent to ${page.ownerName}. They will respond to your email address (${requesterEmail}).`
      );
      setRequesterName("");
      setRequesterEmail("");
      setReason("");
      setNotes("");
      setSelectedSlot(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          "We could not send your request. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeRange = (slot: Slot) => {
    const start = slot.start.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
    const end = slot.end.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
    return `${start} – ${end}`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

  const countdownLabel = (expiresAt: number) => {
    const ms = expiresAt - Date.now();
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      {isLoading && (
        <p className="text-sm text-slate-300">Loading scheduling page…</p>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!isLoading && page && (
        <>
          <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                {page.ownerName}
              </h1>
              {page.bio && (
                <p className="mt-1 text-sm text-slate-300">{page.bio}</p>
              )}
            </div>
            <div className="text-xs text-slate-400">
              URL expires in{" "}
              <span className="font-medium text-sky-300">
                {countdownLabel(page.expiresAt)}
              </span>
            </div>
          </header>

          <section className="grid gap-6 md:grid-cols-[2fr,1.4fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span>Next 7 days · Free slots</span>
                <span>Times shown in your browser’s timezone</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {buildSlots().map(({ date, slots }) => (
                  <div key={date.toISOString()}>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {formatDate(date)}
                    </div>
                    {slots.length === 0 ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-500">
                        No free slots
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {slots.map((slot) => {
                          const isSelected =
                            selectedSlot &&
                            selectedSlot.start.getTime() ===
                              slot.start.getTime() &&
                            selectedSlot.end.getTime() === slot.end.getTime();
                          return (
                            <button
                              key={slot.start.toISOString()}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`rounded-full px-3 py-1 text-xs ${
                                isSelected
                                  ? "bg-sky-500 text-slate-950"
                                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                              }`}
                            >
                              {formatTimeRange(slot)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                This view only shows availability windows, not your actual
                events or their details.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">
                Request an appointment
              </h2>

              {selectedSlot ? (
                <p className="mb-3 text-xs text-slate-300">
                  Selected time:{" "}
                  <span className="font-medium text-sky-200">
                    {formatDate(selectedSlot.start)} ·{" "}
                    {formatTimeRange(selectedSlot)}
                  </span>
                </p>
              ) : (
                <p className="mb-3 text-xs text-slate-400">
                  Choose an available time slot from the calendar to start.
                </p>
              )}

              {successMessage && (
                <div className="mb-3 rounded-lg border border-emerald-700/60 bg-emerald-950/40 p-3 text-xs text-emerald-100">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-xs text-rose-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs font-medium text-slate-200">
                  Your name
                  <input
                    type="text"
                    minLength={2}
                    maxLength={100}
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-200">
                  Your email
                  <input
                    type="email"
                    required
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-200">
                  Reason for meeting
                  <textarea
                    required
                    minLength={10}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {reason.length}/500 characters
                  </span>
                </label>
                <label className="block text-xs font-medium text-slate-200">
                  Additional notes (optional)
                  <textarea
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {notes.length}/500 characters
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!selectedSlot || isSubmitting}
                  className="w-full rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Sending request..."
                    : "Send appointment request"}
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

