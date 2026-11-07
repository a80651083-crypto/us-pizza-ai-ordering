"use client";

import { useChat } from "@ai-sdk/react";
import {
  APICallError,
  lastAssistantMessageIsCompleteWithToolCalls,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-store";
import type { createChatTools } from "@/lib/chat/tools";
import { cn } from "@/lib/utils";

type ChatMessage = UIMessage<
  unknown,
  UIDataTypes,
  InferUITools<ReturnType<typeof createChatTools>>
>;

const SUGGESTIONS = [
  "What's vegetarian?",
  "Where is my order?",
  "Any promos?",
  "How is pizza dough made?",
];

const TOOL_STATUS: Record<string, string> = {
  "tool-get_my_orders": "Checking your order…",
  "tool-get_order_status": "Checking your order…",
  "tool-price_quote": "Working out the price…",
  "tool-add_to_cart": "Adding to your cart…",
};

// Text from the model only gets these tags: no links or images it could be tricked into.
const MARKDOWN_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "br"];

/** Prices and names come from the server, so the model can only choose ids. */
async function addToCart(input: unknown) {
  const response = await fetch("/api/cart-line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  useCart.getState().addLine(data);
  return `Added ${data.quantity} x ${data.name} ${data.optionSummary}`.trim();
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollAnchor = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, regenerate, addToolOutput, status, error } = useChat<ChatMessage>({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic || toolCall.toolName !== "add_to_cart") return;
      const { toolCallId } = toolCall;
      // Not awaited, as the docs advise, because that can deadlock the chat.
      addToCart(toolCall.input).then(
        (output) => void addToolOutput({ tool: "add_to_cart", toolCallId, output }),
        (failure: Error) =>
          void addToolOutput({
            tool: "add_to_cart",
            toolCallId,
            state: "output-error",
            errorText: failure.message,
          }),
      );
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.role === "assistant" ? lastMessage.parts.at(-1) : undefined;
  // Covers waiting for the first token and any tool step between pieces of text.
  const statusText =
    busy && lastPart?.type !== "text"
      ? ((lastPart && TOOL_STATUS[lastPart.type]) ?? "Pizzy is thinking…")
      : null;
  const rateLimited = APICallError.isInstance(error) && error.statusCode === 429;

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ block: "end" });
  }, [messages, statusText, error, open]);

  function send(text: string) {
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input.trim());
  }

  if (!open) {
    return (
      <Button
        size="icon"
        className="fixed right-4 bottom-4 z-30 size-14 rounded-full shadow-lg"
        aria-label="Chat with Pizzy"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="size-6" />
      </Button>
    );
  }

  return (
    <section
      aria-label="Chat with Pizzy"
      className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[560px] sm:max-h-[calc(100dvh-2rem)] sm:w-[380px] sm:overflow-hidden sm:rounded-xl sm:border sm:shadow-xl"
    >
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="font-bold">Pizzy</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          aria-label="Close chat"
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {messages.length === 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Hi, I&apos;m Pizzy! Ask me about the menu, your order, or anything else.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full py-1.5 whitespace-normal"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </>
        )}

        {messages.map((message) => {
          const text = message.parts
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join("");
          if (!text) return null;
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              data-role={message.role}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm wrap-break-word",
                isUser
                  ? "ml-auto bg-primary whitespace-pre-wrap text-primary-foreground"
                  : "space-y-2 bg-muted [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4",
              )}
            >
              {isUser ? (
                text
              ) : (
                <Markdown allowedElements={MARKDOWN_ELEMENTS} unwrapDisallowed>
                  {text}
                </Markdown>
              )}
            </div>
          );
        })}

        {statusText && (
          <p role="status" className="animate-pulse text-sm text-muted-foreground">
            {statusText}
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-900">
            {rateLimited ? (
              <p>You&apos;ve sent a lot of messages. Please try again in a few minutes.</p>
            ) : (
              <>
                <p>Pizzy is busy, please try again.</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => void regenerate()}
                >
                  Try again
                </Button>
              </>
            )}
          </div>
        )}

        <div ref={scrollAnchor} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
        <Input
          autoFocus
          aria-label="Message Pizzy"
          placeholder="Ask Pizzy anything"
          maxLength={1000}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={busy || !input.trim()}>
          <SendHorizontal />
        </Button>
      </form>
    </section>
  );
}
