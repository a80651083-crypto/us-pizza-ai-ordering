import { OrderStatus, OrderType, type Order } from "@prisma/client";
import { prisma } from "@/lib/db";

const MINUTE = 60_000;
export const ORDER_READY_MINUTES = 30;

type StatusFields = Pick<Order, "id" | "status" | "orderType" | "createdAt">;

export function orderSteps(orderType: OrderType) {
  const isDelivery = orderType === OrderType.DELIVERY;
  return [
    { status: OrderStatus.RECEIVED, label: "Order received" },
    { status: OrderStatus.PREPARING, label: "Preparing" },
    { status: OrderStatus.BAKING, label: "Baking" },
    isDelivery
      ? { status: OrderStatus.OUT_FOR_DELIVERY, label: "Out for delivery" }
      : { status: OrderStatus.READY_FOR_PICKUP, label: "Ready for pickup" },
    { status: OrderStatus.DELIVERED, label: isDelivery ? "Delivered" : "Collected" },
  ];
}

export function statusLabel(status: OrderStatus, orderType: OrderType) {
  if (status === OrderStatus.CANCELLED) return "Cancelled";
  return orderSteps(orderType).find((step) => step.status === status)?.label ?? status;
}

export function isFinished(status: OrderStatus) {
  return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
}

export function estimatedReadyAt(order: Pick<Order, "createdAt">) {
  return new Date(order.createdAt.getTime() + ORDER_READY_MINUTES * MINUTE);
}

/** Where elapsed time says the order should be. It never moves an order backwards. */
export function statusAt(order: Omit<StatusFields, "id">, now: Date): OrderStatus {
  if (isFinished(order.status)) return order.status;

  const minutes = (now.getTime() - order.createdAt.getTime()) / MINUTE;
  const stepIndex = minutes < 2 ? 0 : minutes < 10 ? 1 : minutes < 15 ? 2 : minutes < 30 ? 3 : 4;

  const steps = orderSteps(order.orderType).map((step) => step.status);
  return steps[Math.max(stepIndex, steps.indexOf(order.status))];
}

/** Runs on every read, so the tracking page and the chatbot always agree. */
export async function advanceStatus<T extends StatusFields>(order: T, now = new Date()): Promise<T> {
  const status = statusAt(order, now);
  if (status === order.status) return order;
  await prisma.order.update({ where: { id: order.id }, data: { status } });
  return { ...order, status };
}

export function formatMYT(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", ...options });
}
