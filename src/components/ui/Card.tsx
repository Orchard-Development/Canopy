import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/[0.08] p-6",
        "text-[var(--card-foreground)]",
        "backdrop-blur-xl bg-white/[0.04]",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";
