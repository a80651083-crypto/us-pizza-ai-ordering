import { z } from "zod";
import { MAX_QUANTITY } from "@/lib/pricing";

// Shared by the checkout form and POST /api/orders, so the server re-checks
// exactly what the browser checked.

const phone = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^\+?60/, "0"))
  .refine((value) => /^0[1-9]\d{7,9}$/.test(value), {
    error: "Enter a Malaysian phone number, e.g. 012-345 6789",
  });

const base = {
  customerName: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  phone,
  outletId: z.number({ error: "Choose an outlet" }).int().positive("Choose an outlet"),
  promoCode: z.string().trim().toUpperCase().max(30).optional(),
  paymentMethod: z.enum(["CASH", "CARD_DEMO"], { error: "Choose a payment method" }),
  lines: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        optionIds: z.array(z.number().int().positive()).max(10),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1, "Your cart is empty")
    .max(50, "Your cart has too many items"),
};

export const checkoutSchema = z.discriminatedUnion("orderType", [
  z.object({
    ...base,
    orderType: z.literal("DELIVERY"),
    deliveryAddress: z
      .string({ error: "Enter your full delivery address" })
      .trim()
      .min(10, "Enter your full delivery address")
      .max(200, "Address is too long"),
  }),
  z.object({ ...base, orderType: z.literal("PICKUP") }),
]);

export type CheckoutData = z.output<typeof checkoutSchema>;
export type CheckoutErrors = Record<string, string | undefined>;

export function toCheckoutErrors(error: z.ZodError): CheckoutErrors {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const errors: CheckoutErrors = { form: formErrors[0] };
  for (const [field, messages] of Object.entries(fieldErrors)) {
    errors[field] = (messages as string[] | undefined)?.[0];
  }
  return errors;
}
