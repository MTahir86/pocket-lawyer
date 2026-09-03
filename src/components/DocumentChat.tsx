import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send } from "lucide-react";
import { askAboutDocument, type LanguageId } from "@/lib/analysis.functions";
import type { Strings } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

export function DocumentChat({
  context,
  language,
  rtl,
  t,
}: {
  context: string;
  language: LanguageId;
  rtl: boolean;
  t: Strings;
}) {
  const ask = useServerFn(askAboutDocument);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const answer = await ask({
        data: { question: q, language, context, history: messages.slice(-8) },
      });
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 card-elevated" dir={rtl ? "rtl" : "ltr"}>
      <header className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl legal-gradient text-primary-foreground">
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{t.chatTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.chatSubtitle}</p>
        </div>
      </header>

      <div className="mt-4 space-y-3" dir={rtl ? "rtl" : "ltr"}>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground"
                  : "max-w-[92%] whitespace-pre-wrap text-sm leading-relaxed text-foreground"
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && <p className="animate-pulse text-sm text-muted-foreground">{t.thinking}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder={t.chatPlaceholder}
          className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl legal-gradient text-primary-foreground disabled:opacity-40"
          aria-label={t.send}
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}
