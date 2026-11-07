import { cartLineSchema } from "@/lib/checkout";
import { CheckoutError, priceLines } from "@/lib/orders";

/** Turns ids from the chatbot into a cart line, so names and prices come from the database. */
export async function POST(request: Request) {
  const parsed = cartLineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That item isn't valid." }, { status: 400 });
  }

  try {
    const [line] = await priceLines([parsed.data]);
    return Response.json({
      menuItemId: line.menuItemId,
      optionIds: parsed.data.optionIds,
      name: line.nameSnapshot,
      optionSummary: line.selectedOptions.map((option) => option.name).join(", "),
      unitPriceSen: line.unitPriceSen,
      quantity: line.quantity,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
