/**
 * Minimal Gemini REST client (generateContent with function calling). Server
 * only: the key is read from GEMINI_API_KEY and sent as a header, never to the
 * browser. No SDK dependency.
 *
 * Models: GEMINI_MODEL first, then GEMINI_FALLBACK_MODEL. A model that is busy,
 * over quota or slow is skipped for a few minutes so later questions go
 * straight to the other one.
 */

export interface GeminiFunctionCall { name: string; args?: Record<string, unknown>; id?: string }
export interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
}
export interface GeminiContent { role: "user" | "model"; parts: GeminiPart[] }
export interface GeminiFunctionDeclaration { name: string; description: string; parameters?: Record<string, unknown> }

export interface GeminiRequest {
  systemInstruction: string;
  contents: GeminiContent[];
  tools?: GeminiFunctionDeclaration[];
  /** "NONE" forces a text answer (used on the last tool round). */
  toolMode?: "AUTO" | "NONE";
}

export interface GeminiResult { content: GeminiContent; finishReason?: string }

export class GeminiError extends Error {
  constructor(message: string, readonly status: number, readonly retryable: boolean) {
    super(message);
    this.name = "GeminiError";
  }
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-lite-latest";
const DEFAULT_FALLBACK = "gemini-flash-latest";
const TIMEOUT_MS = 20_000;
const COOLDOWN_MS = 5 * 60_000;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const globalForGemini = globalThis as typeof globalThis & { _geminiCooldown?: Map<string, number> };
const cooldown = (globalForGemini._geminiCooldown ??= new Map());

/** Configured models in order, with any cooling-down model moved to the end. */
export function geminiModels(now = Date.now()): string[] {
  const configured = [
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK,
  ];
  const unique = [...new Set(configured.filter(Boolean))];
  const ready = unique.filter((model) => (cooldown.get(model) ?? 0) <= now);
  return [...ready, ...unique.filter((model) => !ready.includes(model))];
}

export function markModelUnavailable(model: string, now = Date.now()) {
  cooldown.set(model, now + COOLDOWN_MS);
}

/** Test hook. */
export function resetGeminiCooldowns() {
  cooldown.clear();
}

export async function generateContent(
  model: string,
  request: GeminiRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set", 503, false);

  const body = {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.contents,
    ...(request.tools?.length ? {
      tools: [{ functionDeclarations: request.tools }],
      toolConfig: { functionCallingConfig: { mode: request.toolMode ?? "AUTO" } },
    } : {}),
    generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "low" } },
  };

  let response: Response;
  try {
    response = await fetchImpl(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // Timeouts and network failures: try the other model.
    throw new GeminiError(`Gemini request failed: ${(error as Error).name}`, 504, true);
  }

  const json = await response.json().catch(() => null) as {
    candidates?: { content?: GeminiContent; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string; status?: string };
  } | null;

  if (!response.ok) {
    // 429 quota / rate limit, 5xx overload, 404 model retired for this key.
    const retryable = response.status === 429 || response.status === 404 || response.status >= 500;
    // Google's message never contains the key; keep it short for logs.
    const detail = json?.error?.status ?? json?.error?.message?.slice(0, 120) ?? "unknown";
    throw new GeminiError(`Gemini ${response.status} (${detail})`, response.status, retryable);
  }

  const candidate = json?.candidates?.[0];
  return {
    content: { role: "model", parts: candidate?.content?.parts ?? [] },
    finishReason: candidate?.finishReason ?? json?.promptFeedback?.blockReason,
  };
}
