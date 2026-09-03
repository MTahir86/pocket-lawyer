import { useRef, useState } from "react";
import { FileText, ImageIcon, UploadCloud, X, Sparkles } from "lucide-react";
import type { Strings } from "@/lib/i18n";

export type PickedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

type Props = {
  files: PickedFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onAnalyze: () => void;
  disabled?: boolean;
  t: Strings;
  rtl?: boolean;
};

const ACCEPT = "application/pdf,image/jpeg,image/png";

export function UploadCard({
  files = [],
  onAdd,
  onRemove,
  onAnalyze,
  disabled,
  t,
  rtl,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);


  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = Array.from(e.dataTransfer.files ?? []);
          if (dropped.length) onAdd(dropped);
        }}
        className={`rounded-3xl border-2 border-dashed p-7 text-center transition-colors ${
          dragging ? "border-primary bg-accent/60" : "border-border bg-card"
        } card-elevated`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) onAdd(picked);
            e.target.value = "";
          }}
        />
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl legal-gradient text-primary-foreground">
          <UploadCloud className="size-8" strokeWidth={1.6} />
        </div>
        <h2 className="mt-5 font-display text-xl font-bold text-foreground">
          {t.uploadTitle}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t.uploadSubtitle}
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl legal-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {files.length ? t.addMore : t.chooseFiles}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5" />
          <ImageIcon className="size-3.5" />
          <span>{t.formats}</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-4 card-elevated">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.pagesReady(files.length)}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-secondary"
              >
                {f.previewUrl ? (
                  <img
                    src={f.previewUrl}
                    alt={`Page ${i + 1}: ${f.file.name}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                    <FileText className="size-6 text-primary" />
                    <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                      {f.file.name}
                    </span>
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded-md bg-foreground/70 px-1.5 py-0.5 text-[10px] font-semibold text-background">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={t.removeFile(f.file.name)}
                  onClick={() => onRemove(f.id)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background transition-opacity hover:bg-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onAnalyze}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl legal-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="size-4" /> {t.analyzeAll}
          </button>
        </div>
      )}
    </div>
  );
}
