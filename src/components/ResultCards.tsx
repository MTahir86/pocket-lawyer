import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis.functions";
import type { Strings } from "@/lib/i18n";

const severityLabel: Record<string, string> = {
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

export function ResultCards({
  result,
  rtl,
  t,
}: {
  result: AnalysisResult;
  rtl: boolean;
  t: Strings;
}) {
  const dir = rtl ? "rtl" : "ltr";

  return (
    <div className="space-y-4" dir={dir}>
      <section className="rounded-3xl border border-border bg-card p-5 card-elevated">
        <header className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">{t.summary}</h3>
            <p className="text-xs text-muted-foreground">{result.documentType}</p>
          </div>
        </header>
        <ul className="mt-4 space-y-2.5">
          {result.summary.map((point, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-destructive/25 bg-destructive/5 p-5 card-elevated">
        <header className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <h3 className="font-display text-lg font-bold leading-tight text-destructive">
            {t.redFlags}
          </h3>
        </header>
        {result.redFlags.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No major red flags detected.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {result.redFlags.map((flag, i) => (
              <li key={i} className="rounded-2xl border border-destructive/20 bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-destructive">{flag.title}</p>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                    {severityLabel[flag.severity] ?? flag.severity}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{flag.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-success/25 bg-success/5 p-5 card-elevated">
        <header className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <h3 className="font-display text-lg font-bold leading-tight text-success">
            {t.verdict}
          </h3>
        </header>
        <p className="mt-4 text-sm leading-relaxed text-foreground">{result.verdict}</p>
        <ol className="mt-4 space-y-2.5">
          {result.nextSteps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-[11px] font-bold text-success">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
