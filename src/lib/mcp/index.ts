import { defineMcp, type McpDefinitionInput } from "@lovable.dev/mcp-js";
import analyzeDocumentTool from "./tools/analyze-document";
import askAboutDocumentTool from "./tools/ask-about-document";
import explainClauseTool from "./tools/explain-clause";

export default defineMcp({
  name: "pocket-lawyer-ai",
  title: "Pocket Lawyer AI",
  version: "0.1.0",
  instructions:
    "Tools for Pocket Lawyer AI. Use `analyze_document` for a full plain-language breakdown of a contract or notice, `ask_about_document` for a specific question about it, and `explain_clause` for a single confusing clause or term. All tools answer in English, Urdu or Roman Urdu.",
  tools: [analyzeDocumentTool, askAboutDocumentTool, explainClauseTool] as unknown as McpDefinitionInput["tools"],
});
