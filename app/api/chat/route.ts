import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from "ai";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { createChatTools } from "@/lib/chat/tools";
import { getSessionId } from "@/lib/session";

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

  const result = streamText({
    model: google(model),
    instructions: buildSystemPrompt(new Date()),
    messages: await convertToModelMessages(validated.data.slice(-MAX_HISTORY_MESSAGES)),
    tools: createChatTools(await getSessionId()),
    stopWhen: stepCountIs(5),
    temperature: 0.3,
    maxOutputTokens: 2048,
    maxRetries: 1, // A quota 429 lasts for hours, so retrying only delays the error.
    // Tools do the real work here, and deeper thinking made replies far too slow.
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "minimal" } } satisfies GoogleLanguageModelOptions,
    },
    onError: ({ error }) => console.error("Chat stream failed", error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, onError: () => BUSY_MESSAGE }),
  });
}
