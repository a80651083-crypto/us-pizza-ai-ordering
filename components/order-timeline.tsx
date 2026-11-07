import type { OrderStatus, OrderType } from "@prisma/client";
import { Check } from "lucide-react";
import { orderSteps } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";

export function OrderTimeline({
  status,
  orderType,
}: {
  status: OrderStatus;
  orderType: OrderType;
}) {
  const steps = orderSteps(orderType);
  const currentIndex = steps.findIndex((step) => step.status === status);

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li
            key={step.status}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-3"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                isDone
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
            <span className={cn(isCurrent && "font-bold", !isDone && "text-muted-foreground")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
