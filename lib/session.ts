import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** For reads. proxy.ts sets the cookie, so this is only empty if something bypassed it. */
export async function readSessionId() {
  return (await cookies()).get("guest_session")?.value;
}

/** For writes. Makes sure the GuestSession row exists before anything points at it. */
export async function getSessionId() {
  const id = await readSessionId();
  if (!id) throw new Error("Missing guest_session cookie");
  await prisma.guestSession.upsert({ where: { id }, update: {}, create: { id } });
  return id;
}
