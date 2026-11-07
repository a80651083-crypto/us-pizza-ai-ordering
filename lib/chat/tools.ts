import { tool } from "ai";
import { z } from "zod";
import { formatRM } from "@/lib/money";
import { estimatedReadyAt, formatMYT, isFinished, statusLabel } from "@/lib/orderStatus";
import { getMyOrders, lookupOrderByPhone } from "@/lib/orders";

/** Tools are built per request, so the session id comes from the cookie and is never an input. */
export function createChatTools(sessionId: string | undefined) {
  return {
    get_my_orders: tool({
      description:
        "Get the current visitor's own recent orders, newest first, with live status and ETA.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(10).optional() }),
      execute: async ({ limit = 5 }) => {
        const orders = await getMyOrders(sessionId, limit);
        return {
          orders: orders.map((order) => ({
            orderNo: order.orderNo,
            status: statusLabel(order.status, order.orderType),
            orderType: order.orderType,
            placedAt: formatMYT(order.createdAt, { dateStyle: "medium", timeStyle: "short" }),
            estimatedBy: isFinished(order.status)
              ? null
              : formatMYT(estimatedReadyAt(order), { timeStyle: "short" }),
            items: order.items.map((item) => `${item.quantity} x ${item.nameSnapshot}`),
            total: formatRM(order.totalSen),
            outlet: order.outlet.name,
          })),
        };
      },
    }),

    get_order_status: tool({
      description:
        "Look up an order by order number. Only call this once the user has given the last 4 digits of the phone number on the order. If they haven't, ask for them instead of calling this.",
      inputSchema: z.object({
        orderNo: z.string().describe("e.g. USP-10001"),
        phoneLast4: z
          .string()
          .regex(/^\d{4}$/)
          .describe("Exactly 4 digits, given by the user"),
      }),
      execute: async ({ orderNo, phoneLast4 }) => {
        const order = await lookupOrderByPhone(orderNo, phoneLast4);
        // The same reply for a wrong number and a wrong phone, so neither can be probed.
        if (!order) return { found: false, message: "Order number and phone digits don't match." };
        return {
          found: true,
          orderNo: order.orderNo,
          status: statusLabel(order.status, order.orderType),
          orderType: order.orderType,
          estimatedBy: isFinished(order.status)
            ? null
            : formatMYT(estimatedReadyAt(order), { timeStyle: "short" }),
        };
      },
    }),
  };
}
