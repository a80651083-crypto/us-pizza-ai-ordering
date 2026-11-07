import { tool } from "ai";
import { z } from "zod";
import { cartLineSchema } from "@/lib/checkout";
import { formatRM } from "@/lib/money";
import { estimatedReadyAt, formatMYT, isFinished, statusLabel } from "@/lib/orderStatus";
import { CheckoutError, getMyOrders, lookupOrderByPhone, priceLines } from "@/lib/orders";
import { computeTotals, MAX_QUANTITY } from "@/lib/pricing";

/** Tools are built per request, so the session id comes from the cookie and is never an input. */
export function createChatTools(sessionId: string | undefined) {
  return {
    price_quote: tool({
      description:
        "Work out the exact price of a set of items. Use this for any total or budget question.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              menuItemId: z.number().int().positive(),
              sizeOptionId: z.number().int().positive().optional().describe("Required for pizzas"),
              crustOptionId: z.number().int().positive().optional().describe("Required for pizzas"),
              qty: z.number().int().min(1).max(MAX_QUANTITY),
            }),
          )
          .min(1)
          .max(20),
        budgetRM: z.number().positive().optional().describe("The user's budget, if they gave one"),
      }),
      execute: async ({ items, budgetRM }) => {
        try {
          // The same pricing code as checkout, so a quote always matches the real order.
          const lines = await priceLines(
            items.map(({ menuItemId, sizeOptionId, crustOptionId, qty }) => ({
              menuItemId,
              optionIds: [sizeOptionId, crustOptionId].filter((id) => id !== undefined),
              quantity: qty,
            })),
          );
          const totals = computeTotals({
            subtotalSen: lines.reduce((sum, line) => sum + line.lineTotalSen, 0),
            discountSen: 0,
            isDelivery: true,
          });
          return {
            lines: lines.map((line) => ({
              item: line.nameSnapshot,
              options: line.selectedOptions.map((option) => option.name).join(", "),
              qty: line.quantity,
              unitPrice: formatRM(line.unitPriceSen),
              linePrice: formatRM(line.lineTotalSen),
            })),
            subtotal: formatRM(totals.subtotalSen),
            deliveryFee: formatRM(totals.deliveryFeeSen),
            sst: formatRM(totals.taxSen),
            total: formatRM(totals.totalSen),
            ...(budgetRM !== undefined && {
              withinBudget: totals.totalSen <= Math.round(budgetRM * 100),
            }),
          };
        } catch (error) {
          if (error instanceof CheckoutError) return { error: error.message };
          throw error;
        }
      },
    }),

    // No execute: useChat handles this in the browser, where the cart lives.
    add_to_cart: tool({
      description:
        "Add an item to the visitor's cart. Only call this after the user has confirmed the item, size, crust and quantity.",
      inputSchema: cartLineSchema,
      outputSchema: z.string(),
    }),

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
