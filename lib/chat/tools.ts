import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMenu, type MenuItemView } from "@/lib/menu";
import { formatRM } from "@/lib/money";
import { estimatedReadyAt, formatMYT, isFinished, statusLabel } from "@/lib/orderStatus";
import { getMyOrders, lookupOrderByPhone } from "@/lib/orders";

// Prices leave these tools fully worked out, so the model only ever repeats them.

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word));

const optionsIn = (item: MenuItemView, group: string) =>
  item.options.filter((option) => option.groupName === group);

function describeItem(item: MenuItemView, maxPriceSen = Infinity) {
  const sizes = optionsIn(item, "Size");
  const crusts = optionsIn(item, "Crust");
  const details = {
    id: item.id,
    name: item.name,
    category: item.category.slug,
    description: item.description,
    vegetarian: item.isVegetarian,
    spicyLevel: item.spicyLevel,
    tags: item.tags,
  };

  if (sizes.length === 0) return { ...details, price: formatRM(item.basePriceSen) };

  return {
    ...details,
    finalPrices: sizes.flatMap((size) =>
      crusts.flatMap((crust) => {
        const priceSen = item.basePriceSen + size.priceDeltaSen + crust.priceDeltaSen;
        return priceSen <= maxPriceSen
          ? [`${size.name}, ${crust.name} crust: ${formatRM(priceSen)}`]
          : [];
      }),
    ),
    crustSurcharges: crusts.map(
      (crust) =>
        `${crust.name}: ${crust.priceDeltaSen ? `+${formatRM(crust.priceDeltaSen)}` : "no extra charge"}`,
    ),
  };
}

async function loadItems() {
  const categories = await getMenu();
  return categories.flatMap((category) =>
    category.items.map((item) => ({
      item,
      searchWords: words(
        [
          item.name,
          item.description,
          category.name,
          item.tags.join(" "),
          item.isVegetarian ? "vegetarian" : "",
          item.spicyLevel > 0 ? "spicy" : "",
        ].join(" "),
      ).join(" "),
    })),
  );
}

function currentTimeMYT(now: Date) {
  return formatMYT(now, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

const cityAliases: Record<string, string> = { kl: "kuala lumpur", jb: "johor bahru" };

/** Tools are built per request, so the session id comes from the cookie and is never an input. */
export function createChatTools(sessionId: string) {
  return {
    search_menu: tool({
      description:
        "Search the US Pizza menu. Returns matching items with final prices. Translate query words to English first. Call with no filters to list everything.",
      inputSchema: z.object({
        query: z.string().optional().describe("Short English keywords, e.g. chicken"),
        category: z.enum(["pizza", "pasta", "sides", "drinks", "desserts"]).optional(),
        vegetarian: z.boolean().optional().describe("Only vegetarian items"),
        spicy: z.boolean().optional().describe("Only spicy items"),
        maxPriceRM: z.number().optional().describe("Only prices at or below this, in RM"),
      }),
      execute: async ({ query, category, vegetarian, spicy, maxPriceRM }) => {
        const maxPriceSen = maxPriceRM === undefined ? Infinity : Math.round(maxPriceRM * 100);
        const filtered = (await loadItems()).filter(
          ({ item }) =>
            (!category || item.category.slug === category) &&
            (!vegetarian || item.isVegetarian) &&
            (!spicy || item.spicyLevel > 0) &&
            item.basePriceSen <= maxPriceSen,
        );

        const terms = words(query ?? "");
        const matchesAll = filtered.filter(({ searchWords }) =>
          terms.every((term) => searchWords.includes(term)),
        );
        const matches =
          matchesAll.length > 0
            ? matchesAll
            : filtered.filter(({ searchWords }) => terms.some((term) => searchWords.includes(term)));

        return {
          count: matches.length,
          items: matches.map(({ item }) => describeItem(item, maxPriceSen)),
        };
      },
    }),

    get_menu_item: tool({
      description:
        "Get one menu item by name or id, with the final price of every size and crust pairing.",
      inputSchema: z.object({
        name: z.string().optional().describe("Item name in English, e.g. Pepperoni"),
        id: z.number().int().optional(),
      }),
      execute: async ({ name, id }) => {
        const items = (await loadItems()).map(({ item }) => item);
        const terms = words(name ?? "");
        const matches = items.filter(
          (item) =>
            item.id === id ||
            (terms.length > 0 && terms.every((term) => words(item.name).join(" ").includes(term))),
        );
        return {
          found: matches.length > 0,
          items: matches.map((item) => ({ ...describeItem(item), calories: item.calories })),
        };
      },
    }),

    list_outlets: tool({
      description:
        "List US Pizza outlets with address, phone, hours and whether each is open right now.",
      inputSchema: z.object({
        city: z.string().optional().describe("City, e.g. Kuala Lumpur, Johor Bahru or Penang"),
      }),
      execute: async ({ city }) => {
        const now = currentTimeMYT(new Date());
        const wanted = city?.trim().toLowerCase();
        const search = wanted && (cityAliases[wanted] ?? wanted);
        const outlets = await prisma.outlet.findMany({
          where: { isActive: true },
          orderBy: { id: "asc" },
        });

        return {
          currentTimeMYT: now,
          outlets: outlets
            .filter(
              (outlet) =>
                !search || `${outlet.city} ${outlet.name}`.toLowerCase().includes(search),
            )
            .map((outlet) => ({
              name: outlet.name,
              city: outlet.city,
              address: outlet.address,
              phone: outlet.phone,
              hours: `${outlet.openTime} to ${outlet.closeTime}`,
              openNow: outlet.openTime <= now && now < outlet.closeTime,
              deliveryRadiusKm: outlet.deliveryRadiusKm,
            })),
        };
      },
    }),

    get_promotions: tool({
      description: "List promo codes that are active right now, with their rules.",
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
          where: { isActive: true, validFrom: { lte: now }, validTo: { gte: now } },
          orderBy: { id: "asc" },
        });
        return {
          promotions: promotions.map((promotion) => ({
            code: promotion.code,
            title: promotion.title,
            description: promotion.description,
            minimumSpend: promotion.minSpendSen ? formatRM(promotion.minSpendSen) : "none",
            validUntil: formatMYT(promotion.validTo, { dateStyle: "medium" }),
          })),
        };
      },
    }),

    search_faq: tool({
      description:
        "Search US Pizza policy answers: delivery fees and areas, payment, allergens, pork, opening hours, cancellations. Translate query words to English first.",
      inputSchema: z.object({ query: z.string().describe("English keywords") }),
      execute: async ({ query }) => {
        const terms = words(query);
        const faqs = await prisma.faq.findMany({ orderBy: { id: "asc" } });
        const ranked = faqs
          .map((faq) => {
            const text = words(`${faq.topic} ${faq.question} ${faq.answer}`).join(" ");
            return { faq, hits: terms.filter((term) => text.includes(term)).length };
          })
          .filter(({ hits }) => hits > 0)
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 4);
        return {
          answers: ranked.map(({ faq }) => ({ question: faq.question, answer: faq.answer })),
        };
      },
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
        "Look up any order by order number. Requires the last 4 digits of the phone number on the order, so ask the user for them first and never guess.",
      inputSchema: z.object({
        orderNo: z.string().describe("e.g. USP-10001"),
        phoneLast4: z.string().describe("Last 4 digits of the phone number on the order"),
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
