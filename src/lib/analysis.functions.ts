import { del, get } from "@vercel/blob";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  callGateway,
  extractJson,
  GatewayError,
} from "./ai-gateway.server";

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

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const FileInput = z
  .object({
    fileName: z.string().min(1),
    mimeType: z.string().min(1),

    // Existing Base64 flow remains temporarily supported.
    dataUrl: z.string().min(20).optional(),

    // New Vercel Blob flow.
    pathname: z.string().min(1).optional(),
    size: z.number().int().positive().max(MAX_FILE_SIZE).optional(),
  })
  .superRefine((file, ctx) => {
    const hasLegacyFile = Boolean(file.dataUrl);

    const hasBlobFile =
      Boolean(file.pathname) &&
      typeof file.size === "number";

    if (!hasLegacyFile && !hasBlobFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Uploaded file information is incomplete.",
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported file type.",
      });
    }

    if (
      file.pathname &&
      !file.pathname.startsWith("legal-docs/")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid uploaded file path.",
      });
    }
  });

const AnalyzeInput = z.object({
  files: z.array(FileInput).min(1).max(15),
  language: z.enum(LANGUAGES),
});

export type AnalysisResult = {
  documentType: string;
  summary: string[];
  redFlags: {
    title: string;
    detail: string;
    severity: "high" | "medium" | "low";
  }[];
  verdict: string;
  nextSteps: string[];
};

type GeminiUploadedFile = {
  name: string;
  uri: string;
  mimeType: string;
};

const jsonShape = `{
  "documentType": "short label of what this document is",
  "summary": ["4-6 short bullet points of the main terms"],
  "redFlags": [{ "title": "short title", "detail": "one clear sentence", "severity": "high|medium|low" }],
  "verdict": "one short paragraph: sign, negotiate, or refuse, and why",
  "nextSteps": ["3-5 short practical actions"]
}`;

async function uploadBlobToGemini(
  pathname: string,
  fileName: string,
  mimeType: string,
  expectedSize: number,
  apiKey: string,
): Promise<GeminiUploadedFile> {
  const blobResult = await get(pathname, {
    access: "private",
    useCache: false,
  });

  if (!blobResult || blobResult.statusCode !== 200) {
    throw new Error(
      `Uploaded file "${fileName}" could not be found.`,
    );
  }

  if (blobResult.blob.size > MAX_FILE_SIZE) {
    throw new Error(
      `"${fileName}" is larger than the 50 MB limit.`,
    );
  }

  if (
    expectedSize &&
    blobResult.blob.size !== expectedSize
  ) {
    throw new Error(
      `"${fileName}" upload size could not be verified.`,
    );
  }

  if (
    blobResult.blob.contentType &&
    blobResult.blob.contentType !== mimeType
  ) {
    throw new Error(
      `"${fileName}" file type could not be verified.`,
    );
  }

  const startResponse = await fetch(
    "https://generativelanguage.googleapis.com/upload/v1beta/files",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length":
          String(blobResult.blob.size),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          display_name: fileName,
        },
      }),
    },
  );

  if (!startResponse.ok) {
    const message = await startResponse.text();

    throw new Error(
      message ||
        `Gemini could not prepare "${fileName}" for analysis.`,
    );
  }

  const uploadUrl =
    startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error(
      `Gemini did not return an upload URL for "${fileName}".`,
    );
  }

  const uploadResponse = await fetch(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(blobResult.blob.size),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        "Content-Type": mimeType,
      },
      body: blobResult.stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" },
  );

  if (!uploadResponse.ok) {
    const message = await uploadResponse.text();

    throw new Error(
      message ||
        `Gemini could not upload "${fileName}" for analysis.`,
    );
  }

  const uploadData = (await uploadResponse.json()) as {
    file?: {
      name?: string;
      uri?: string;
      mimeType?: string;
      mime_type?: string;
    };
  };

  const name = uploadData.file?.name;
  const uri = uploadData.file?.uri;

  if (!name || !uri) {
    throw new Error(
      `Gemini did not return a usable file reference for "${fileName}".`,
    );
  }

  return {
    name,
    uri,
    mimeType:
      uploadData.file?.mimeType ??
      uploadData.file?.mime_type ??
      mimeType,
  };
}

async function deleteGeminiFile(
  name: string,
  apiKey: string,
) {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}`,
      {
        method: "DELETE",
        headers: {
          "x-goog-api-key": apiKey,
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to delete temporary Gemini file:",
      error,
    );
  }
}

async function deleteBlob(pathname: string) {
  try {
    await del(pathname);
  } catch (error) {
    console.error(
      "Unable to delete temporary Vercel Blob:",
      error,
    );
  }
}

export const analyzeDocument = createServerFn({
  method: "POST",
})
  .inputValidator((input: unknown) =>
    AnalyzeInput.parse(input),
  )
  .handler(
    async ({ data }): Promise<AnalysisResult> => {
      const apiKey = process.env["GEMINI_API_KEY"];

      if (!apiKey) {
        throw new Error(
          "AI is not configured for this app.",
        );
      }

      const blobFiles = data.files.filter(
        (
          file,
        ): file is typeof file & {
          pathname: string;
          size: number;
        } =>
          Boolean(file.pathname) &&
          typeof file.size === "number",
      );

      const totalBlobSize = blobFiles.reduce(
        (total, file) => total + file.size,
        0,
      );

      if (totalBlobSize > MAX_TOTAL_SIZE) {
        throw new Error(
          "The selected files are too large together. Please keep the total upload under 100 MB.",
        );
      }

      const uploadedGeminiFiles: GeminiUploadedFile[] =
        [];

      const blobPathsToDelete = blobFiles.map(
        (file) => file.pathname,
      );

      const systemPrompt = `You are LegalDoc AI, a helpful legal document explainer for ordinary people.
The user may attach several files — treat them as consecutive pages of ONE single document and give one combined analysis.
${languageInstruction[data.language]}
Field names/keys must stay in English exactly as given.
Respond with ONLY valid minified JSON in this shape:
${jsonShape}`;

      try {
        const userContent: unknown[] = [
          {
            type: "text",
            text: `Analyze the following ${data.files.length} file(s) as ONE document (${data.files
              .map(
                (file, index) =>
                  `page ${index + 1}: "${file.fileName}"`,
              )
              .join(
                ", ",
              )}). Highlight hidden conditions, unfair clauses, penalties, auto-renewals, and anything risky. Return one combined analysis for the whole set.`,
          },
        ];

        for (const file of data.files) {
          if (
            file.pathname &&
            typeof file.size === "number"
          ) {
            const geminiFile =
              await uploadBlobToGemini(
                file.pathname,
                file.fileName,
                file.mimeType,
                file.size,
                apiKey,
              );

            uploadedGeminiFiles.push(geminiFile);

            userContent.push({
              type: "file",
              file: {
                filename: file.fileName,
                file_uri: geminiFile.uri,
                mime_type: geminiFile.mimeType,
              },
            });

            continue;
          }

          if (file.dataUrl) {
            if (file.mimeType === "application/pdf") {
              userContent.push({
                type: "file",
                file: {
                  filename: file.fileName,
                  file_data: file.dataUrl,
                },
              });
            } else {
              userContent.push({
                type: "image_url",
                image_url: {
                  url: file.dataUrl,
                },
              });
            }
          }
        }

        const raw = await callGateway([
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ]);

        const parsed =
          extractJson(raw) as AnalysisResult;

        return {
          documentType:
            parsed.documentType ?? "Document",
          summary: parsed.summary ?? [],
          redFlags: parsed.redFlags ?? [],
          verdict: parsed.verdict ?? "",
          nextSteps: parsed.nextSteps ?? [],
        };
      } catch (err) {
        if (err instanceof GatewayError) {
          throw new Error(err.message);
        }

        throw err instanceof Error
          ? err
          : new Error("Analysis failed.");
      } finally {
        await Promise.allSettled(
          uploadedGeminiFiles.map((file) =>
            deleteGeminiFile(file.name, apiKey),
          ),
        );

        await Promise.allSettled(
          blobPathsToDelete.map((pathname) =>
            deleteBlob(pathname),
          ),
        );
      }
    },
  );

const ChatInput = z.object({
  question: z.string().min(1).max(1000),
  language: z.enum(LANGUAGES),
  context: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
});

export const askAboutDocument = createServerFn({
  method: "POST",
})
  .inputValidator((input: unknown) =>
    ChatInput.parse(input),
  )
  .handler(async ({ data }): Promise<string> => {
    try {
      return await callGateway([
        {
          role: "system",
          content: `You are LegalDoc AI. Answer questions about the user's document based on this analysis:
${data.context}

Answer in 2-4 short sentences, no jargon. ${languageInstruction[data.language]}
If the answer is not in the document, say so honestly and give general guidance. Remind the user this is not formal legal advice only when it truly matters.`,
        },
        ...data.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user" as const,
          content: data.question,
        },
      ]);
    } catch (err) {
      if (err instanceof GatewayError) {
        throw new Error(err.message);
      }

      throw err instanceof Error
        ? err
        : new Error("Chat failed.");
    }
  });
