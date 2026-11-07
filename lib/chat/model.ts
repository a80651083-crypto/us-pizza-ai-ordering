import { google } from "@ai-sdk/google";
import { APICallError, wrapLanguageModel } from "ai";

/**
 * Uses the primary model, and switches to the fallback once if the primary is rate limited.
 * A 429 is raised before any tokens stream, so the customer never sees the switch.
 * Build one per request: the switch then lasts for that request's retries and tool steps.
 */
export function chatModel(primary: string, fallback: string | undefined) {
  let switched = false;

  return wrapLanguageModel({
    model: google(primary),
    middleware: {
      specificationVersion: "v4",
      wrapStream: async ({ doStream, params }) => {
        if (switched && fallback) return google(fallback).doStream(params);
        try {
          return await doStream();
        } catch (error) {
          const rateLimited = APICallError.isInstance(error) && error.statusCode === 429;
          if (!rateLimited || !fallback) throw error;
          switched = true;
          console.warn(`${primary} is rate limited, falling back to ${fallback}`);
          return google(fallback).doStream(params);
        }
      },
    },
  });
}
