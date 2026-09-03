import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, extractJson, GatewayError } from "./ai-gateway.server";

const LANGUAGES = ["english", "urdu", "roman-urdu"] as const;
export type LanguageId = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageId, string> = {
  english: "English",
  urdu: "اردو",
  "roman-urdu": "Roman Urdu",
};

const languageInstruction: Record<LanguageId, string> = {
  english: "Write every value in simple, plain English.",
  urdu: "Write every value in simple Urdu using Urdu script (اردو).",
  "roman-urdu":
    "Write every value in Roman Urdu (Urdu language written with English/Latin letters), simple and conversational.",
};

const AnalyzeInput = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        dataUrl: z.string().min(20),
      }),
    )
    .min(1)
    .max(15),
  language: z.enum(LANGUAGES),
});

export type AnalysisResult = {
  documentType: string;
  summary: string[];
  redFlags: { title: string; detail: string; severity: "high" | "medium" | "low" }[];
  verdict: string;
  nextSteps: string[];
};

const jsonShape = `{
  "documentType": "short label of what this document is",
  "summary": ["4-6 short bullet points of the main terms"],
  "redFlags": [{ "title": "short title", "detail": "one clear sentence", "severity": "high|medium|low" }],
  "verdict": "one short paragraph: sign, negotiate, or refuse, and why",
  "nextSteps": ["3-5 short practical actions"]
}`;

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const systemPrompt = `You are Pocket Lawyer AI, a helpful legal document explainer for ordinary people.
The user may attach several files — treat them as consecutive pages of ONE single document and give one combined analysis.
${languageInstruction[data.language]}
Field names/keys must stay in English exactly as given.
Respond with ONLY valid minified JSON in this shape:
${jsonShape}`;

    try {
      const raw = await callGateway([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze the following ${data.files.length} file(s) as ONE document (${data.files
                .map((f, i) => `page ${i + 1}: "${f.fileName}"`)
                .join(", ")}). Highlight hidden conditions, unfair clauses, penalties, auto-renewals, and anything risky. Return one combined analysis for the whole set.`,
            },
            ...data.files.map((f) =>
              f.mimeType === "application/pdf"
                ? {
                    type: "file" as const,
                    file: { filename: f.fileName, file_data: f.dataUrl },
                  }
                : { type: "image_url" as const, image_url: { url: f.dataUrl } },
            ),
          ],
        },
      ]);
      const parsed = extractJson(raw) as AnalysisResult;
      return {
        documentType: parsed.documentType ?? "Document",
        summary: parsed.summary ?? [],
        redFlags: parsed.redFlags ?? [],
        verdict: parsed.verdict ?? "",
        nextSteps: parsed.nextSteps ?? [],
      };
    } catch (err) {
      if (err instanceof GatewayError) throw new Error(err.message);
      throw err instanceof Error ? err : new Error("Analysis failed.");
    }
  });

const ChatInput = z.object({
  question: z.string().min(1).max(1000),
  language: z.enum(LANGUAGES),
  context: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
});

export const askAboutDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }): Promise<string> => {
    try {
      return await callGateway([
        {
          role: "system",
          content: `You are Pocket Lawyer AI. Answer questions about the user's document based on this analysis:
${data.context}

Answer in 2-4 short sentences, no jargon. ${languageInstruction[data.language]}
If the answer is not in the document, say so honestly and give general guidance. Remind the user this is not formal legal advice only when it truly matters.`,
        },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.question },
      ]);
    } catch (err) {
      if (err instanceof GatewayError) throw new Error(err.message);
      throw err instanceof Error ? err : new Error("Chat failed.");
    }
  });
