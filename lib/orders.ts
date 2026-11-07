import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { CheckoutData } from "@/lib/checkout";
import { prisma } from "@/lib/db";
import { formatRM } from "@/lib/money";
import { advanceStatus } from "@/lib/orderStatus";
import { calcDiscountSen, computeTotals } from "@/lib/pricing";
import { lookupPromotion } from "@/lib/promo";

/** A problem the customer can fix. `field` matches a checkout form field. */
export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly field = "form",
  ) {
    super(message);
  }
}

/** Builds order lines from database prices. Only ids and quantities come from the browser. */
export async function priceLines(lines: CheckoutData["lines"]) {
  const items = await prisma.menuItem.findMany({
    where: { id: { in: lines.map((line) => line.menuItemId) }, isAvailable: true },
    include: { options: true },
  });

  return lines.map((line) => {
    const item = items.find((candidate) => candidate.id === line.menuItemId);
    if (!item) {
      throw new CheckoutError("An item in your cart is no longer available. Please remove it.");
    }

    const selected = item.options.filter((option) => line.optionIds.includes(option.id));
    const groupCount = new Set(item.options.map((option) => option.groupName)).size;
    const selectedGroupCount = new Set(selected.map((option) => option.groupName)).size;
    // Every id must belong to this item, with exactly one choice per group.
    if (
      selected.length !== line.optionIds.length ||
      selected.length !== groupCount ||
      selectedGroupCount !== groupCount
    ) {
      throw new CheckoutError(`The options for ${item.name} have changed. Please add it again.`);
    }

    const unitPriceSen =
      item.basePriceSen + selected.reduce((sum, option) => sum + option.priceDeltaSen, 0);
    return {
      menuItemId: item.id,
      nameSnapshot: item.name,
      unitPriceSen,
      quantity: line.quantity,
      selectedOptions: selected.map((option) => ({
        group: option.groupName,
        name: option.name,
        priceDeltaSen: option.priceDeltaSen,
      })),
      lineTotalSen: unitPriceSen * line.quantity,
    };
  });
}

async function resolvePromotion(code: string | undefined, subtotalSen: number) {
  if (!code) return null;
  const { promotion, error } = await lookupPromotion(code);
  if (!promotion) throw new CheckoutError(error, "promoCode");
  if (subtotalSen < promotion.minSpendSen) {
    throw new CheckoutError(
      `${promotion.code} needs a minimum spend of ${formatRM(promotion.minSpendSen)}.`,
      "promoCode",
    );
  }
  return promotion;
}

export async function createOrder(input: CheckoutData, sessionId: string) {
  const outlet = await prisma.outlet.findFirst({ where: { id: input.outletId, isActive: true } });
  if (!outlet) throw new CheckoutError("Choose an outlet", "outletId");

  const orderItems = await priceLines(input.lines);
  const subtotalSen = orderItems.reduce((sum, line) => sum + line.lineTotalSen, 0);
  const promotion = await resolvePromotion(input.promoCode, subtotalSen);
  const isDelivery = input.orderType === "DELIVERY";

  const data = {
    ...computeTotals({
      subtotalSen,
      discountSen: promotion ? calcDiscountSen(promotion, subtotalSen) : 0,
      isDelivery,
    }),
    sessionId,
    customerName: input.customerName,
    phone: input.phone,
    orderType: input.orderType,
    outletId: outlet.id,
    deliveryAddress: isDelivery ? input.deliveryAddress : null,
    promotionId: promotion?.id,
    paymentMethod: input.paymentMethod,
    items: { create: orderItems },
  };

  // Random numbers can't be walked through one by one. Retry on the rare collision.
  for (let attempt = 0; ; attempt++) {
    const orderNo = `USP-${randomInt(10003, 100000)}`;
    try {
      await prisma.order.create({ data: { ...data, orderNo } });
      return orderNo;
    } catch (error) {
      const isCollision =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isCollision || attempt >= 4) throw error;
    }
  }
}

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  outlet: { select: { name: true, phone: true } },
} satisfies Prisma.OrderInclude;

/** Always scoped by session: other people's orders behave as if they don't exist. */
export async function getMyOrder(orderNo: string, sessionId: string | undefined) {
  if (!sessionId) return null;
  const order = await prisma.order.findFirst({
    where: { orderNo, sessionId },
    include: orderInclude,
  });
  return order && advanceStatus(order);
}

/** For orders outside this session: the phone digits prove the caller knows the customer. */
export async function lookupOrderByPhone(orderNo: string, phoneLast4: string) {
  if (!/^\d{4}$/.test(phoneLast4.trim())) return null;
  const order = await prisma.order.findUnique({
    where: { orderNo: orderNo.trim().toUpperCase() },
  });
  if (!order?.phone.endsWith(phoneLast4.trim())) return null;
  return advanceStatus(order);
}

export async function getMyOrders(sessionId: string | undefined, limit = 20) {
  if (!sessionId) return [];
  const orders = await prisma.order.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: orderInclude,
  });
  return Promise.all(orders.map((order) => advanceStatus(order)));
}
