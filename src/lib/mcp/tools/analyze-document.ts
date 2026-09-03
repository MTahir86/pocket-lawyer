import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, extractJson } from "../../ai-gateway.server";

const LANGUAGES = ["english", "urdu", "roman-urdu"] as const;

const languageInstruction: Record<(typeof LANGUAGES)[number], string> = {
  english: "Write every value in simple, plain English.",
  urdu: "Write every value in simple Urdu using Urdu script (اردو).",
  "roman-urdu":
    "Write every value in Roman Urdu (Urdu language written with English/Latin letters), simple and conversational.",
};

const jsonShape = `{
  "documentType": "short label of what this document is",
  "summary": ["4-6 short bullet points of the main terms"],
  "redFlags": [{ "title": "short title", "detail": "one clear sentence", "severity": "high|medium|low" }],
  "verdict": "one short paragraph: sign, negotiate, or refuse, and why",
  "nextSteps": ["3-5 short practical actions"]
}`;

export default defineTool({
  name: "analyze_document",
  title: "Analyze a legal document",
  description:
    "Explain the text of a contract, agreement or legal notice in plain language: main points, hidden risks and red flags, a verdict on whether to sign, and next steps.",
  inputSchema: {
    documentText: z
      .string()
      .trim()
      .min(20)
      .max(60000)
      .describe("Full text of the contract, agreement or notice to analyze."),
    language: z
      .enum(LANGUAGES)
      .default("english")
      .describe("Language of the explanation: english, urdu or roman-urdu."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ documentText, language }) => {
    const lang = language ?? "english";
    try {
      const raw = await callGateway([
        {
          role: "system",
          content: `You are Pocket Lawyer AI, a helpful legal document explainer for ordinary people.
${languageInstruction[lang]}
Field names/keys must stay in English exactly as given.
Respond with ONLY valid minified JSON in this shape:
${jsonShape}`,
        },
        {
          role: "user",
          content: `Analyze this document. Highlight hidden conditions, unfair clauses, penalties and auto-renewals.\n\n${documentText}`,
        },
      ]);
      const parsed = extractJson(raw) as Record<string, unknown>;
      return {
        content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
        structuredContent: { analysis: parsed },
      };
    } catch (error) {
      throw new ToolError(error instanceof Error ? error.message : "Analysis failed.");
    }
  },
});
