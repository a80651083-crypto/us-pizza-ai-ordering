import type { NextRequest } from "next/server";
import { lookupPromotion } from "@/lib/promo";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) return Response.json({ error: "Enter a promo code." }, { status: 400 });

  const { promotion, error } = await lookupPromotion(code);
  if (!promotion) return Response.json({ error }, { status: 404 });

  const { title, discountType, discountValue, minSpendSen } = promotion;
  return Response.json({ code: promotion.code, title, discountType, discountValue, minSpendSen });
}
