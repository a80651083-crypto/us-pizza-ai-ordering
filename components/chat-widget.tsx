"use client";

import { useChat } from "@ai-sdk/react";
import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, regenerate, status, error } = useChat();
  const scrollAnchor = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  // Covers waiting for the first token and any tool step between pieces of text.
  const thinking =
    busy && (lastMessage?.role !== "assistant" || lastMessage.parts.at(-1)?.type !== "text");

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking, error, open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
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
          <p className="text-sm text-muted-foreground">
            Hi, I&apos;m Pizzy! Ask me about the menu, your order, or anything else.
          </p>
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
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap",
                isUser ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {text}
            </div>
          );
        })}

        {thinking && (
          <p role="status" className="animate-pulse text-sm text-muted-foreground">
            Pizzy is thinking…
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-900">
            <p>Pizzy is busy, please try again.</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => void regenerate()}
            >
              Try again
            </Button>
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
