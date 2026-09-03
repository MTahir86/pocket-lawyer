import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Scale,
} from "lucide-react";
import {
  generateTemplate,
  TEMPLATES,
  type TemplateDef,
} from "@/lib/templates.functions";
import {
  LANGUAGE_LABELS,
  type LanguageId,
} from "@/lib/analysis.functions";

const TITLE = "Legal Templates Generator — Pocket Lawyer AI";
const DESCRIPTION =
  "Generate ready-to-use Pakistani legal drafts: rent agreements, vehicle sale deeds, and affidavits in English, Urdu, or Roman Urdu.";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplatesPage,
});

const LANGS: LanguageId[] = ["english", "urdu", "roman-urdu"];

function TemplatesPage() {
  const generate = useServerFn(generateTemplate);
  const [template, setTemplate] = useState<TemplateDef>(TEMPLATES[0]!);
  const [language, setLanguage] = useState<LanguageId>("english");
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rtl = language === "urdu";

  function selectTemplate(tpl: TemplateDef) {
    setTemplate(tpl);
    setValues({});
    setDraft(null);
    setError(null);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const text = await generate({
        data: { templateId: template.id, language, values },
      });
      setDraft(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Please select the text manually.");
    }
  }

  async function handleDownloadPdf() {
    if (!draft) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);

    const lines = doc.splitTextToSize(draft, maxWidth) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
    doc.save(`${template.id}-draft-${Date.now()}.pdf`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="legal-gradient px-5 pb-10 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold hover:bg-primary-foreground/25"
            >
              <ArrowLeft className="size-3.5" /> Analyze a document
            </Link>
            <span className="flex items-center gap-2 text-sm font-bold tracking-tight">
              <Scale className="size-4" /> Pocket Lawyer AI
            </span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl">
            Legal Templates Generator
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            Pick a template, fill in the details, and get a complete legal draft you can
            copy or download.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-2xl space-y-5 px-5 pb-16">
        <div className="rounded-3xl border border-border bg-card p-4 card-float">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Choose a template
          </p>
          <div className="mt-2.5 grid gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  template.id === tpl.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary hover:bg-accent"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                    template.id === tpl.id
                      ? "legal-gradient text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <FileText className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {tpl.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {tpl.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 card-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Draft language
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {LANGS.map((id) => (
              <button
                key={id}
                onClick={() => setLanguage(id)}
                className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                  language === id
                    ? "border-transparent legal-gradient text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {LANGUAGE_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 card-elevated">
          <h2 className="font-display text-lg font-bold">{template.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Fill what you know — anything left empty becomes a blank line in the draft.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {template.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold text-foreground">
                  {field.label}
                </span>
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  maxLength={500}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </label>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl legal-gradient text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Drafting your document…
              </>
            ) : (
              "Generate legal draft"
            )}
          </button>
        </div>

        {error && (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        )}

        {draft && (
          <div className="rounded-3xl border border-border bg-card p-5 card-elevated">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Your draft</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  {copied ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  <Download className="size-3.5" /> PDF
                </button>
                <button
                  onClick={() => setDraft(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                >
                  <RotateCcw className="size-3.5" /> Edit
                </button>
              </div>
            </div>
            <pre
              dir={rtl ? "rtl" : "ltr"}
              className="mt-4 max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/50 p-4 font-body text-sm leading-relaxed text-foreground"
            >
              {draft}
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Review the draft carefully and have it verified by a licensed lawyer before
              signing or use.
            </p>
          </div>
        )}

        <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground">
          Pocket Lawyer AI gives general guidance, not formal legal advice.
        </p>
      </main>

      <footer className="legal-gradient px-5 py-7 text-primary-foreground">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs leading-relaxed text-primary-foreground/70">
            Pocket Lawyer AI gives general guidance, not formal legal advice.
          </p>
          <div className="mx-auto mt-3 h-px w-12 bg-primary-foreground/20" />
          <p className="mt-3 font-display text-sm font-medium tracking-wide text-primary-foreground/90">
            Developed by Muhammad Tahir
          </p>
        </div>
      </footer>
    </div>
  );
}
