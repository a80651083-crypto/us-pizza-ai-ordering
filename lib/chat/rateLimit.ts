const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 20;

// In memory to keep the database off the chat path, so each server instance counts
// separately. That's fine for protecting a demo's quota, but not for billing.
const requests = new Map<string, number[]>();

/** Records one chat request. Returns false if this session is over its limit. */
export function takeChatSlot(sessionId: string, now = Date.now()) {
  const recent = (requests.get(sessionId) ?? []).filter((time) => now - time < WINDOW_MS);
  const allowed = recent.length < MAX_REQUESTS;
  if (allowed) recent.push(now);
  requests.set(sessionId, recent);

  if (requests.size > 5000) {
    for (const [id, times] of requests) {
      if (times.every((time) => now - time >= WINDOW_MS)) requests.delete(id);
    }
  }
  return allowed;
}
