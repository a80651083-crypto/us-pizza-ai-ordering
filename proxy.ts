import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "site_access";
const GUEST_COOKIE = "guest_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
} as const;

const DENIED_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Private demo</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#333;text-align:center;padding:0 24px">
    <p>This is a private demo. Please use the link provided.</p>
  </body>
</html>`;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Hashing first gives both sides equal length, which timingSafeEqual requires. */
const isEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

/** The cookie holds a hash, so it never exposes the key and dies if the key changes. */
const accessToken = (accessKey: string) => sha256(accessKey).toString("hex");

function setGuestCookie(request: NextRequest, response: NextResponse, id: string) {
  if (!request.cookies.has(GUEST_COOKIE)) response.cookies.set(GUEST_COOKIE, id, cookieOptions);
}

export function proxy(request: NextRequest) {
  const accessKey = process.env.ACCESS_KEY;
  // No key configured means nobody gets in, rather than everybody.
  if (accessKey) {
    const keyParam = request.nextUrl.searchParams.get("key");
    if (keyParam && isEqual(keyParam, accessKey)) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("key");
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set(ACCESS_COOKIE, accessToken(accessKey), cookieOptions);
      setGuestCookie(request, response, randomUUID());
      return response;
    }

    const accessCookie = request.cookies.get(ACCESS_COOKIE)?.value;
    if (accessCookie && isEqual(accessCookie, accessToken(accessKey))) {
      if (request.cookies.has(GUEST_COOKIE)) return NextResponse.next();

      // Also add it to this request, so the page or API route can read it right away.
      const id = randomUUID();
      request.cookies.set(GUEST_COOKIE, id);
      const response = NextResponse.next({ request: { headers: request.headers } });
      response.cookies.set(GUEST_COOKIE, id, cookieOptions);
      return response;
    }
  }

  return new NextResponse(DENIED_HTML, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
