import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway } from "../../ai-gateway.server";

const LANGUAGES = ["english", "urdu", "roman-urdu"] as const;

const languageInstruction: Record<(typeof LANGUAGES)[number], string> = {
  english: "Answer in simple, plain English.",
  urdu: "Answer in simple Urdu using Urdu script (اردو).",
  "roman-urdu": "Answer in Roman Urdu (Urdu written with English/Latin letters).",
};

export default defineTool({
  name: "explain_clause",
  title: "Explain a clause or legal term",
  description:
    "Translate one confusing clause or legal term into plain language, and say who it favours and what to watch out for.",
  inputSchema: {
    clause: z.string().trim().min(3).max(8000).describe("The clause or legal term to explain."),
    language: z.enum(LANGUAGES).default("english").describe("Language of the explanation."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ clause, language }) => {
    const lang = language ?? "english";
    try {
      const text = await callGateway([
        {
          role: "system",
          content: `You are Pocket Lawyer AI. Explain the given clause or legal term for an ordinary person in at most 4 short sentences: what it means, who it favours, and what to watch out for. ${languageInstruction[lang]}`,
        },
        { role: "user", content: clause },
      ]);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      throw new ToolError(error instanceof Error ? error.message : "Explanation failed.");
    }
  },
});
