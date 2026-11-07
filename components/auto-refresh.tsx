"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the server components on the current page every few seconds. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
