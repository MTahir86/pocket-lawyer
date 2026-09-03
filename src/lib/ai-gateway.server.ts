const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent";

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

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      ...(systemText
        ? {
            systemInstruction: {
              parts: [{ text: systemText }],
            },
          }
        : {}),
      contents,
    }),
  });

  if (!res.ok) {
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

    if (res.status === 429) {
      message =
        "Too many AI requests right now. Please try again shortly.";
    }

    if (res.status === 401 || res.status === 403) {
      message =
        "Gemini API key is invalid or does not have access.";
    }

    throw new GatewayError(res.status, message);
  }

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
