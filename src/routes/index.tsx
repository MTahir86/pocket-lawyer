import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, Loader2, RotateCcw, Scale, FileCheck2 } from "lucide-react";
import { UploadCard, type PickedFile } from "@/components/UploadCard";
import { ResultCards } from "@/components/ResultCards";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { DocumentChat } from "@/components/DocumentChat";
import {
analyzeDocument,
LANGUAGE_LABELS,
type AnalysisResult,
type LanguageId,
} from "@/lib/analysis.functions";
import { useStrings } from "@/lib/i18n";

const TITLE = "LegalDoc AI — Understand any document in simple language";
const DESCRIPTION =
"Upload a contract or notice and get a plain-language summary, red flags, and a clear verdict in English, Urdu, or Roman Urdu.";

export const Route = createFileRoute("/")({
head: () => ({
meta: [
{ title: TITLE },
{ name: "description", content: DESCRIPTION },
{ property: "og:title", content: TITLE },
{ property: "og:description", content: DESCRIPTION },
{ property: "og:type", content: "website" },
{ name: "twitter:card", content: "summary_large_image" },
],
}),
component: Index,
});

const LANGS: LanguageId[] = ["english", "urdu", "roman-urdu"];
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 15;

function readAsDataUrl(file: File) {
return new Promise<string>((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(String(reader.result));
reader.onerror = () => reject(new Error("Could not read that file."));
reader.readAsDataURL(file);
});
}

function Index() {
const analyze = useServerFn(analyzeDocument);
const [language, setLanguage] = useState<LanguageId>("english");
const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
const [files, setFiles] = useState<PickedFile[]>([]);
const [result, setResult] = useState<AnalysisResult | null>(null);
const [error, setError] = useState<string | null>(null);

const t = useStrings(language);
const rtl = language === "urdu";

const fileName =
files.length === 0
? ""
: files.length === 1
? (files[0]?.file.name ?? "")
: t.pagesCombined(files.length);

function addFiles(picked: File[]) {
setError(null);

```
const allowed = ["application/pdf", "image/jpeg", "image/png"];
const next: PickedFile[] = [];

for (const file of picked) {
  if (!allowed.includes(file.type)) {
    setError(t.errUnsupported);
    continue;
  }

  if (file.size > MAX_BYTES) {
    setError(t.errTooLarge(file.name));
    continue;
  }

  next.push({
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    file,
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null,
  });
}

if (next.length) {
  setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES));
}
```

}

function removeFile(id: string) {
setFiles((prev) => {
const target = prev.find((f) => f.id === id);

```
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl);
  }

  return prev.filter((f) => f.id !== id);
});
```

}

async function handleAnalyze() {
if (!files.length) return;

```
setError(null);
setStatus("loading");

try {
  const payload = await Promise.all(
    files.map(async (f) => ({
      fileName: f.file.name,
      mimeType: f.file.type,
      dataUrl: await readAsDataUrl(f.file),
    })),
  );

  const res = await analyze({
    data: {
      files: payload,
      language,
    },
  });

  setResult(res);
  setStatus("done");
} catch (e) {
  setError(e instanceof Error ? e.message : t.errFailed);
  setStatus("idle");
}
```

}

function reset() {
files.forEach((f) => {
if (f.previewUrl) {
URL.revokeObjectURL(f.previewUrl);
}
});

```
setResult(null);
setStatus("idle");
setError(null);
setFiles([]);
```

}

return (
<div
className="min-h-screen bg-background"
dir={rtl ? "rtl" : "ltr"}
lang={rtl ? "ur" : "en"}
> <header className="legal-gradient px-5 pb-10 pt-8 text-primary-foreground"> <div className="mx-auto max-w-2xl"> <div className="flex items-center justify-between gap-2.5"> <span className="flex items-center gap-2.5"> <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15"> <Scale className="size-5" /> </span>

```
          <span className="text-base font-bold tracking-tight">
            LegalDoc AI
          </span>
        </span>

        <Link
          to="/templates"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold hover:bg-primary-foreground/25"
        >
          <FileText className="size-3.5" />
          Templates
        </Link>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl">
        {t.heroTitle}
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
        {t.heroSubtitle}
      </p>
    </div>
  </header>

  <main className="mx-auto -mt-5 max-w-2xl space-y-5 px-5 pb-16">
    <div className="rounded-3xl border border-border bg-card p-4 card-float">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.explainIn}
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

    {status === "idle" && (
      <UploadCard
        files={files}
        onAdd={addFiles}
        onRemove={removeFile}
        onAnalyze={handleAnalyze}
        t={t}
        rtl={rtl}
      />
    )}

    {error && (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </p>
    )}

    {status === "loading" && (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card p-10 text-center card-elevated">
        <Loader2 className="size-9 animate-spin text-primary" />

        <p className="mt-5 font-display text-lg font-bold">
          {t.loadingTitle}
        </p>

        <p className="mt-1.5 text-sm text-muted-foreground">
          {t.loadingSubtitle}
        </p>

        {fileName && (
          <span className="mt-4 max-w-full truncate rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            {fileName}
          </span>
        )}
      </div>
    )}

    {status === "done" && result && (
      <>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <FileCheck2 className="size-4 shrink-0 text-success" />

            <span className="truncate text-muted-foreground">
              {fileName}
            </span>
          </span>

          <button
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <RotateCcw className="size-3.5" />
            {t.newDoc}
          </button>
        </div>

        <ResultCards result={result} rtl={rtl} t={t} />

        <DownloadPdfButton
          result={result}
          fileName={fileName}
          t={t}
        />

        <DocumentChat
          context={JSON.stringify(result)}
          language={language}
          rtl={rtl}
          t={t}
        />
      </>
    )}

    <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground">
      {t.disclaimer}
    </p>
  </main>

  <footer className="legal-gradient px-5 py-7 text-primary-foreground">
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs leading-relaxed text-primary-foreground/70">
        {t.disclaimer}
      </p>

      <div className="mx-auto mt-3 h-px w-12 bg-primary-foreground/20" />

      <p className="mt-3 font-display text-sm font-medium tracking-wide text-primary-foreground/90">
        {t.footerName}
      </p>
    </div>
  </footer>
</div>
```

);
}
