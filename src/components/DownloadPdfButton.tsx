import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/analysis.functions";
import type { Strings } from "@/lib/i18n";

export function DownloadPdfButton({
  result,
  fileName,
  t,
}: {
  result: AnalysisResult;
  fileName: string;
  t: Strings;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const margin = 48;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const heading = (text: string) => {
        ensureSpace(40);
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 95);
        doc.text(text, margin, y);
        y += 8;
        doc.setDrawColor(30, 58, 95);
        doc.setLineWidth(0.75);
        doc.line(margin, y, pageWidth - margin, y);
        y += 16;
      };

      const body = (text: string, indent = 0) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(text, maxWidth - indent) as string[];
        for (const line of lines) {
          ensureSpace(16);
          doc.text(line, margin + indent, y);
          y += 15;
        }
      };

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 95);
      doc.text(t.brand, margin, y);
      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      body(
        `${t.summary} — ${fileName || result.documentType} · ${new Date().toLocaleDateString()}`,
      );
      y += 6;

      // Summary
      heading(t.summary);
      result.summary.forEach((point, i) => body(`${i + 1}. ${point}`, 6));

      // Red flags
      heading(t.redFlags);
      if (result.redFlags.length === 0) {
        body("No major red flags detected.");
      } else {
        result.redFlags.forEach((flag, i) => {
          body(`${i + 1}. [${flag.severity.toUpperCase()}] ${flag.title}`, 6);
          body(flag.detail, 18);
          y += 4;
        });
      }

      // Verdict & next steps
      heading(t.verdict);
      body(result.verdict);
      y += 6;
      result.nextSteps.forEach((step, i) => body(`${i + 1}. ${step}`, 6));

      // Disclaimer
      ensureSpace(50);
      y += 14;
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      const disclaimerLines = doc.splitTextToSize(
        `${t.disclaimer} — ${t.footerName}`,
        maxWidth,
      ) as string[];
      disclaimerLines.forEach((line: string) => {
        ensureSpace(12);
        doc.text(line, margin, y);
        y += 12;
      });

      doc.save(`pocket-lawyer-summary-${Date.now()}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl legal-gradient text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {t.downloadPdf}
    </button>
  );
}
