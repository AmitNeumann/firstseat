import "server-only";

import { GoogleGenAI } from "@google/genai";

/**
 * Current Flash-Lite alias on the Gemini free tier.
 *
 * `gemini-2.5-flash` 404s for new keys. `gemini-3.5-flash` works but spends ~10s
 * thinking. `gemini-flash-lite-latest` is the fast extraction model on this key.
 */
export const PARSE_MODEL = "gemini-flash-lite-latest";

/** Slow valid calls have been ~8–12s; 20s left the spinner hanging on a dead request. */
export const PARSE_TIMEOUT_MS = 12_000;

const PARSE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    restaurant: { type: "string" },
    date: { type: "string" },
    partySize: { type: "integer" },
    meal: { type: "string", enum: ["BREAKFAST", "BRUNCH", "LUNCH", "DINNER"] },
  },
  required: ["restaurant"],
  propertyOrdering: ["restaurant", "date", "partySize", "meal"],
};

export class ParseConfigError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "ParseConfigError";
  }
}

export class ParseModelError extends Error {
  constructor(message = "Gemini returned nothing usable") {
    super(message);
    this.name = "ParseModelError";
  }
}

let cachedClient: { apiKey: string; ai: GoogleGenAI } | undefined;

function getClient(apiKey: string): GoogleGenAI {
  if (!cachedClient || cachedClient.apiKey !== apiKey) {
    cachedClient = { apiKey, ai: new GoogleGenAI({ apiKey }) };
  }

  return cachedClient.ai;
}

function describeError(error: unknown): string {
  if (isAbortError(error)) {
    return "timed out";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Gemini request failed";
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
}

function buildPrompt(input: {
  text: string;
  timezone: string;
  todayLabel: string;
  todayIso: string;
}): string {
  return [
    `Today is ${input.todayLabel} (${input.todayIso}) in ${input.timezone}.`,
    "Extract restaurant, date (YYYY-MM-DD), partySize (1-20), meal (BREAKFAST|BRUNCH|LUNCH|DINNER). Omit unknown fields. If that month/day already passed this year, use next year. Do not invent a restaurant they did not name.",
    `Sentence: ${input.text}`,
  ].join("\n");
}

/**
 * Ask Gemini for JSON. The key is read here, on the server, from `GEMINI_API_KEY` —
 * never a `NEXT_PUBLIC_` variable, so it is never inlined into the browser bundle.
 *
 * Restaurant matching happens after this returns, against the seeded list — the prompt
 * does not include that catalog, so we can start the model call without waiting on it.
 */
export async function extractWatchJson(input: {
  text: string;
  timezone: string;
  todayLabel: string;
  todayIso: string;
}): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ParseConfigError();
  }

  const prompt = buildPrompt(input);
  const started = performance.now();
  const abort = AbortSignal.timeout(PARSE_TIMEOUT_MS);

  let response: {
    text?: string;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  try {
    response = await getClient(apiKey).models.generateContent({
      model: PARSE_MODEL,
      contents: prompt,
      config: {
        abortSignal: abort,
        temperature: 0,
        // Flash-Lite already does not think; `thinkingBudget: 0` 400s this alias
        // (`INVALID_ARGUMENT`). Leave thinking config off.
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: PARSE_RESPONSE_SCHEMA,
        httpOptions: {
          timeout: PARSE_TIMEOUT_MS,
          retryOptions: { attempts: 1 },
        },
      },
    });
  } catch (error) {
    if (error instanceof ParseModelError) {
      throw error;
    }

    const message = describeError(error);
    console.error("[watches/parse] Gemini request failed:", message, {
      model: PARSE_MODEL,
      ms: Math.round(performance.now() - started),
      promptChars: prompt.length,
    });
    throw new ParseModelError(message);
  }

  const usage = response.usageMetadata;
  console.info("[watches/parse] gemini", {
    model: PARSE_MODEL,
    ms: Math.round(performance.now() - started),
    promptChars: prompt.length,
    promptTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    thoughtsTokens: usage?.thoughtsTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount,
  });

  const text = response.text?.trim();

  if (!text) {
    console.error("[watches/parse] Gemini returned an empty body");
    throw new ParseModelError();
  }

  try {
    return JSON.parse(stripFences(text));
  } catch {
    console.error("[watches/parse] Gemini text was not JSON:", text.slice(0, 200));
    throw new ParseModelError();
  }
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
}
