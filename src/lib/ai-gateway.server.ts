const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

export type GatewayMessage = {
  role: "system" | "user" | "assistant";
  content: unknown;
};

export class GatewayError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHighDemandMessage(message: string) {
  const value = message.toLowerCase();
  return (
    value.includes("high demand") ||
    value.includes("temporarily unavailable") ||
    value.includes("resource exhausted") ||
    value.includes("overloaded") ||
    value.includes("try again later")
  );
}

function retryDelayMs(attempt: number) {
  const base = attempt === 1 ? 900 : attempt === 2 ? 1900 : 3600;
  const jitter = Math.floor(Math.random() * 300);
  return base + jitter;
}

function dataUrlToInlineData(dataUrl: string): GeminiPart {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);

  if (!match?.[1] || !match?.[2]) {
    throw new GatewayError(
      400,
      "The uploaded file could not be prepared for AI analysis.",
    );
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

function toParts(content: unknown): GeminiPart[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ text: String(content ?? "") }];
  }

  const parts: GeminiPart[] = [];

  for (const item of content) {
    if (!item || typeof item !== "object") continue;

    const part = item as {
      type?: string;
      text?: string;
      image_url?: { url?: string };
      file?: { file_data?: string };
    };

    if (part.type === "text" && typeof part.text === "string") {
      parts.push({ text: part.text });
      continue;
    }

    if (
      part.type === "image_url" &&
      typeof part.image_url?.url === "string"
    ) {
      parts.push(dataUrlToInlineData(part.image_url.url));
      continue;
    }

    if (
      part.type === "file" &&
      typeof part.file?.file_data === "string"
    ) {
      parts.push(dataUrlToInlineData(part.file.file_data));
    }
  }

  return parts;
}

async function readGeminiError(res: Response) {
  let message = `AI request failed (${res.status}).`;

  try {
    const body = (await res.json()) as {
      error?: {
        message?: string;
      };
    };

    message = body?.error?.message ?? message;
  } catch {
    // Ignore invalid error response JSON.
  }

  return message;
}

export async function callGateway(
  messages: GatewayMessage[],
): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];

  if (!key) {
    throw new GatewayError(401, "AI is not configured for this app.");
  }

  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : String(message.content ?? ""),
    )
    .join("\n\n");

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: toParts(message.content),
    }));

  const requestBody = JSON.stringify({
    ...(systemText
      ? {
          systemInstruction: {
            parts: [{ text: systemText }],
          },
        }
      : {}),
    contents,
  });

  let lastStatus = 503;
  let lastMessage =
    "Gemini is temporarily busy. Please try again in a few moments.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: requestBody,
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim() ?? "";

      if (!text) {
        throw new GatewayError(
          502,
          "Gemini returned an empty response. Please try again.",
        );
      }

      return text;
    }

    const rawMessage = await readGeminiError(res);
    lastStatus = res.status;
    lastMessage = rawMessage;

    if (res.status === 401 || res.status === 403) {
      throw new GatewayError(
        res.status,
        "Gemini API key is invalid or does not have access.",
      );
    }

    const shouldRetry =
      RETRYABLE_STATUSES.has(res.status) || isHighDemandMessage(rawMessage);

    if (!shouldRetry || attempt === MAX_ATTEMPTS) {
      if (res.status === 429 || isHighDemandMessage(rawMessage)) {
        throw new GatewayError(
          res.status,
          "Gemini is temporarily busy due to high demand. Please try again shortly.",
        );
      }

      throw new GatewayError(res.status, rawMessage);
    }

    await sleep(retryDelayMs(attempt));
  }

  throw new GatewayError(lastStatus, lastMessage);
}

export function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error(
      "The AI response could not be read. Please try again.",
    );
  }
}
