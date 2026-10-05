"use client";

// "Book a nurse" — concierge, home care and travel nursing requests.
// The form persists a Booking via POST /api/book and Elizabeth confirms each
// visit personally on WhatsApp, so there is no payment step here.
import { useState } from "react";
import Link from "next/link";
import { BriefcaseMedical, Home, Plane, MessageCircle } from "lucide-react";
import { Reveal } from "./reveal";

type ServiceId = "concierge" | "homecare" | "travel";

const SERVICES: { id: ServiceId; label: string; icon: typeof Home; blurb: string }[] = [
  {
    id: "concierge",
    label: "Concierge nurse",
    icon: BriefcaseMedical,
    blurb:
      "Ongoing care for you or a parent — medication check-ins, hospital-visit company, a nurse who knows your name.",
  },
  {
    id: "homecare",
    label: "Home care",
    icon: Home,
    blurb:
      "Nurse visits at home: wounds dressed, injections given, blood pressure checked — recovery without the taxi ride.",
  },
  {
    id: "travel",
    label: "Travel nurse",
    icon: Plane,
    blurb:
      "Going somewhere? Vaccination timing, a travel kit packed right, and on-call support while you're away.",
  },
];

const SERVICE_LABELS: Record<ServiceId, string> = {
  concierge: "Concierge nurse",
  homecare: "Home care",
  travel: "Travel nurse",
};

type PlacedBooking = { reference: string; service: ServiceId };

export function BookNurse() {
  const [service, setService] = useState<ServiceId>("concierge");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedBooking | null>(null);

  const phoneDigits = phone.replace(/[^0-9]/g, "").length;
  const canSubmit = name.trim().length >= 2 && phoneDigits >= 8 && !submitting;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          service,
          preferredDate: preferredDate.trim(),
          notes: notes.trim(),
        }),
      });
      const json = (await res.json()) as { ok: boolean; reference?: string; error?: string };
      if (!res.ok || !json.ok || !json.reference) {
        setError(json.error ?? "We couldn't send your request — please try again.");
        setSubmitting(false);
        return;
      }
      setPlaced({ reference: json.reference, service });
    } catch {
      setError("We couldn't send your request — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "mt-1.5 w-full rounded-input border border-line bg-paper-soft px-3 py-2.5 text-[0.95rem] text-ink transition-colors duration-200 placeholder:text-ink-mute focus:border-sage";

  return (
    <section
      id="book"
      aria-labelledby="midori-book-heading"
      className="scroll-mt-24 bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <div className="mx-auto max-w-[1080px]">
        <Reveal className="max-w-[640px]">
          <p className="text-small uppercase tracking-[0.18em] text-sage">03 — Book a nurse</p>
          <h2 id="midori-book-heading" className="mt-3 text-ink">
            A nurse, when you need one.
          </h2>
          <p className="mt-4 text-ink-soft">
            Elizabeth confirms every visit personally on WhatsApp — usually within the hour,
            8am&ndash;7pm. No bots, no call centres, and you always know who is coming.
          </p>
        </Reveal>

        {placed ? (
          <Reveal className="mt-10">
            <div className="mx-auto max-w-[560px] rounded-card border border-line bg-paper-soft p-8 text-center">
              <span
                aria-hidden="true"
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-mist text-sage-deep"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                  <path
                    d="M5 12.5 10 17.5 19 7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h3 className="mt-4 font-display text-[1.35rem] text-ink">Request received.</h3>
              <p className="mx-auto mt-3 max-w-[44ch] text-ink-soft">
                Your reference is{" "}
                <span className="tabular font-medium text-ink">{placed.reference}</span> — Elizabeth
                will WhatsApp you on <span className="tabular">{phone.trim()}</span> to arrange the{" "}
                {SERVICE_LABELS[placed.service].toLowerCase()} visit.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={`https://wa.me/233551632777?text=${encodeURIComponent(
                    `Hello Nurse Elizabeth! I just requested a ${SERVICE_LABELS[placed.service].toLowerCase()} booking (${placed.reference}).`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-sage-deep px-6 py-3 font-medium text-paper transition-colors duration-200 hover:bg-sage"
                >
                  <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                  Continue on WhatsApp
                </a>
                <Link href="/" className="underline-wobble font-medium text-sage">
                  Keep browsing
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            {/* Service cards — stacked on phones, three across on tablets, a column beside the form on desktop */}
            <Reveal delay={60} className="lg:col-span-5">
              <div role="radiogroup" aria-label="Nursing service" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {SERVICES.map(({ id, label, icon: Icon, blurb }) => {
                  const active = service === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setService(id)}
                      className={`block w-full rounded-card border p-5 text-left transition-colors duration-200 lg:p-6 ${
                        active
                          ? "border-sage bg-sage-mist/40"
                          : "border-line bg-paper-soft hover:border-sage/60"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className={`shrink-0 ${active ? "text-sage" : "text-ink-mute"}`}
                        />
                        <span className="font-display text-[1.1rem] text-ink lg:text-[1.15rem]">{label}</span>
                      </span>
                      <span className="mt-2.5 block text-small leading-relaxed text-ink-soft">
                        {blurb}
                      </span>
                    </button>
                  );
                })}
                <p className="pt-1 text-small text-ink-mute sm:col-span-3 lg:col-span-1">
                  Elizabeth quotes before every visit — no card needed, nothing automatic.
                </p>
              </div>
            </Reveal>

            {/* Booking form */}
            <Reveal delay={120} className="lg:col-span-7">
              <form
                onSubmit={submit}
                className="rounded-card border border-line bg-paper-soft p-6 md:p-8"
                aria-label="Request a nurse booking"
              >
                {error !== "" && (
                  <p
                    role="alert"
                    className="mb-5 rounded-[2px] border border-clay/40 bg-clay/10 px-3 py-2 text-small text-clay"
                  >
                    {error}
                  </p>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                      Your name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="e.g. Abena Mensah"
                      className={inputClasses}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                      WhatsApp number
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      autoComplete="tel"
                      placeholder="e.g. 055 000 0000"
                      className={inputClasses}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                      Preferred date <span className="normal-case">(optional)</span>
                    </span>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(event) => setPreferredDate(event.target.value)}
                      className={inputClasses}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                      Anything Elizabeth should know <span className="normal-case">(optional)</span>
                    </span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Who is the visit for, area of Accra, morning or evening…"
                      className={inputClasses}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-6 w-full rounded-full bg-clay px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-clay/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Sending your request…" : "Request this booking"}
                </button>
                <p className="mt-3 text-center text-small text-ink-mute">
                  Free to request — you confirm everything with Elizabeth on WhatsApp first.
                </p>
              </form>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
