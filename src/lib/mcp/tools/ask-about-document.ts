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
  name: "ask_about_document",
  title: "Ask a question about a document",
  description:
    "Answer a specific question about a contract or notice, such as cancellation rights, penalties or notice periods, in 2-4 plain sentences.",
  inputSchema: {
    documentText: z
      .string()
      .trim()
      .min(20)
      .max(60000)
      .describe("Text of the document (or a prior analysis) the question is about."),
    question: z.string().trim().min(3).max(1000).describe("The user's question."),
    language: z.enum(LANGUAGES).default("english").describe("Language of the answer."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ documentText, question, language }) => {
    const lang = language ?? "english";
    try {
      const answer = await callGateway([
        {
          role: "system",
          content: `You are Pocket Lawyer AI. Answer questions about the user's document using this content:
${documentText}

Answer in 2-4 short sentences, no jargon. ${languageInstruction[lang]}
If the answer is not in the document, say so honestly and give general guidance. This is general guidance, not formal legal advice.`,
        },
        { role: "user", content: question },
      ]);
      return { content: [{ type: "text", text: answer }] };
    } catch (error) {
      throw new ToolError(error instanceof Error ? error.message : "Question failed.");
    }
  },
});
