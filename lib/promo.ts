import { prisma } from "@/lib/db";

/** Checks the code itself. Minimum spend depends on the cart, so callers check that. */
export async function lookupPromotion(code: string, now = new Date()) {
  const promotion = await prisma.promotion.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!promotion || !promotion.isActive || now < promotion.validFrom) {
    return { error: "That promo code isn't valid." };
  }
  if (now > promotion.validTo) return { error: "That promo code has expired." };
  return { promotion };
}
