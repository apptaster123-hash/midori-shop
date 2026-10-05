"use client";

// Nurse chat widget — PRD §5.12. Floating sage-deep pill that expands into a
// scripted FAQ chat in Nurse Elizabeth's voice. Quick-reply chips route to
// pre-written answers that name real catalogue products; free-text gets a
// gentle canned reply. Every answer thread ends with a WhatsApp link.
// No AI backend — a guided FAQ in a chat costume.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Send, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEscapeKey, useMountTransition } from "@/components/midori/cart-drawer";

const WHATSAPP_URL = "https://wa.me/233551632777";

type ChatMessage = {
  id: number;
  from: "nurse" | "you";
  text: string;
  whatsapp?: boolean;
};

const GREETING: ChatMessage = {
  id: 0,
  from: "nurse",
  text: "Hello! I'm Nurse Elizabeth. Tell me what you're looking for and I'll help you choose.",
};

const FREE_TEXT_REPLY =
  "Thanks for writing. I'd rather give you a proper answer than a quick guess — send me the details on WhatsApp (+233 55 163 2777) and I'll reply within minutes.";

const QUICK_REPLIES: { label: string; answer: string }[] = [
  {
    label: "Help me choose a vitamin",
    answer:
      "Happily. For everyday immunity I'd start with Vitamin C 1000mg (GHS 45) — one small tablet with breakfast. If you'd rather cover the basics in one go, the Adult Multivitamin (GHS 60) is the calmer choice. Both are sealed stock I check by hand before dispatch. If you take medication or you're pregnant, tell me on WhatsApp first so I can point you safely.",
  },
  {
    label: "Blood pressure monitor question",
    answer:
      "Of course. The Blood Pressure Monitor (GHS 320) is an upper-arm cuff, the same style we use in clinic. Wrap it snugly above your elbow, sit still for five minutes, and it reads pressure and pulse in about thirty seconds. It remembers your recent readings — send me your numbers on WhatsApp and I'll help you read them.",
  },
  {
    label: "Where's my order?",
    answer:
      "I can check that for you. Your order number looks like MDR-20260103-K4XP — it's also in your confirmation email. Share it here or on WhatsApp and I'll tell you exactly where your parcel is.",
  },
];

export function ChatWidget() {
  const open = useStore((s) => s.chatOpen);
  const openChat = useStore((s) => s.openChat);
  const closeChat = useStore((s) => s.closeChat);

  const { mounted, shown } = useMountTransition(open, 300);
  useEscapeKey(open, closeChat);

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const replyAsNurse = (text: string) => {
    setPending(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, from: "nurse", text, whatsapp: true },
      ]);
      setPending(false);
    }, 700);
  };

  const sendQuickReply = (chip: (typeof QUICK_REPLIES)[number]) => {
    if (pending) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: "you", text: chip.label },
    ]);
    replyAsNurse(chip.answer);
  };

  const sendDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: "you", text },
    ]);
    replyAsNurse(FREE_TEXT_REPLY);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {mounted && (
        <div
          role="dialog"
          aria-label="Chat with Nurse Elizabeth"
          className={`flex h-[420px] max-h-[calc(100dvh-7.5rem)] w-[340px] max-w-[calc(100vw-2.5rem)] origin-bottom-right flex-col overflow-hidden rounded-dialog border border-line bg-paper-soft shadow-[0_18px_50px_rgba(26,31,27,0.16)] transition-[opacity,transform] duration-300 ease-calm ${
            shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.96] opacity-0"
          }`}
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-deep font-japanese text-paper"
            >
              緑
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-medium leading-tight">Nurse Elizabeth, RN</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-small text-ink-mute">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sage"
                />
                Usually replies in minutes
              </p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-sage-mist hover:text-ink"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </header>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.from === "you" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-dialog px-3 py-2 text-[0.9rem] leading-relaxed ${
                    message.from === "you"
                      ? "bg-sage-deep text-paper"
                      : "bg-sage-mist/60 text-ink"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.whatsapp && (
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-wobble mt-2 inline-block text-small font-medium text-sage-deep"
                    >
                      {"Continue on WhatsApp \u2192"}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {pending && (
              <p className="px-1 text-small text-ink-mute">Elizabeth is typing…</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {QUICK_REPLIES.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => sendQuickReply(chip)}
                disabled={pending}
                className="rounded-tag border border-line bg-paper px-3 py-1.5 text-[0.75rem] text-ink-soft transition-colors duration-200 hover:border-sage hover:bg-sage-mist/60 hover:text-ink disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <form onSubmit={sendDraft} className="flex items-center gap-2 border-t border-line px-3 py-3">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a product, an order…"
              aria-label="Message Nurse Elizabeth"
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-input border border-line bg-paper px-3 text-small text-ink placeholder:text-ink-mute"
            />
            <button
              type="submit"
              disabled={pending || draft.trim() === ""}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-deep text-paper transition-[background-color,transform] duration-200 hover:bg-sage active:scale-[0.97] disabled:opacity-50"
            >
              <Send size={15} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={open ? closeChat : openChat}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Ask a nurse"}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-sage-deep text-paper shadow-[0_10px_30px_rgba(26,31,27,0.18)] transition-colors duration-200 hover:bg-sage md:w-auto md:px-4"
      >
        <Plus
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-300 ease-calm ${
            open ? "rotate-45" : ""
          }`}
        />
        <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-small font-medium opacity-0 transition-[max-width,opacity,padding] duration-300 ease-calm group-hover:max-w-[9rem] group-hover:py-0 group-hover:pl-2 group-hover:opacity-100 md:inline">
          Ask a nurse
        </span>
      </button>
    </div>
  );
}
