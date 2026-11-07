import type { GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from "ai";
import { chatModel } from "@/lib/chat/model";
import { buildSystemPrompt, findPriceLimitSen } from "@/lib/chat/prompt";
import { createChatTools } from "@/lib/chat/tools";
import { readSessionId } from "@/lib/session";

export const maxDuration = 60;

const MAX_HISTORY_MESSAGES = 20;
const MAX_REQUEST_CHARS = 200_000;
const BUSY_MESSAGE = "Pizzy is busy, please try again.";

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_REQUEST_CHARS) {
    return Response.json({ error: "Message is too long." }, { status: 413 });
  }

  let messages: unknown;
  try {
    messages = JSON.parse(body).messages;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const validated = await safeValidateUIMessages({ messages });
  if (!validated.success || validated.data.some((message) => message.role === "system")) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) {
    console.error("GEMINI_MODEL is not set");
    return Response.json({ error: BUSY_MESSAGE }, { status: 500 });
  }

  const lastText = (validated.data.at(-1)?.parts ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ");
  // Working with prices needs some thinking. Everything else is faster with almost none.
  const thinkingLevel = /\d/.test(lastText) ? "low" : "minimal";

  const [instructions, sessionId] = await Promise.all([
    buildSystemPrompt(new Date(), findPriceLimitSen(lastText)),
    readSessionId(),
  ]);

  const result = streamText({
    model: chatModel(model, process.env.GEMINI_FALLBACK_MODEL),
    instructions,
    messages: await convertToModelMessages(validated.data.slice(-MAX_HISTORY_MESSAGES)),
    tools: createChatTools(sessionId),
    stopWhen: stepCountIs(5),
    temperature: 0.3,
    maxOutputTokens: 2048,
    maxRetries: 1, // A quota 429 lasts for hours, so retrying only delays the error.
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel } } satisfies GoogleLanguageModelOptions,
    },
    onError: ({ error }) => console.error("Chat stream failed", error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, onError: () => BUSY_MESSAGE }),
  });
}
