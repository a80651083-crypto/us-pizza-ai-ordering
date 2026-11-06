export const DELIVERY_FEE_SEN = 500;
export const FREE_DELIVERY_MIN_SEN = 6000;
export const SST_PERCENT = 6;

/**
 * The one place order totals are worked out. All amounts are integer sen.
 * Free delivery is judged on the subtotal after discount, and SST applies to
 * the discounted subtotal plus the delivery fee.
 */
export function computeTotals(input: {
  subtotalSen: number;
  discountSen: number;
  isDelivery: boolean;
}) {
  const { subtotalSen, isDelivery } = input;
  const discountSen = Math.min(input.discountSen, subtotalSen);
  const afterDiscountSen = subtotalSen - discountSen;
  const deliveryFeeSen =
    isDelivery && afterDiscountSen < FREE_DELIVERY_MIN_SEN ? DELIVERY_FEE_SEN : 0;
  const taxSen = Math.round(((afterDiscountSen + deliveryFeeSen) * SST_PERCENT) / 100);
  const totalSen = afterDiscountSen + deliveryFeeSen + taxSen;
  return { subtotalSen, discountSen, deliveryFeeSen, taxSen, totalSen };
}
