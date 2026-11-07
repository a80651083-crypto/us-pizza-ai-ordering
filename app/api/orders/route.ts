import { checkoutSchema, toCheckoutErrors } from "@/lib/checkout";
import { CheckoutError, createOrder } from "@/lib/orders";
import { getSessionId } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: toCheckoutErrors(parsed.error) }, { status: 400 });
  }

  try {
    const orderNo = await createOrder(parsed.data, await getSessionId());
    return Response.json({ orderNo }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ errors: { [error.field]: error.message } }, { status: 400 });
    }
    console.error("Failed to create order", error);
    return Response.json(
      { errors: { form: "We couldn't place your order. Please try again." } },
      { status: 500 },
    );
  }
}
