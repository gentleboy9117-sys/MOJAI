import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-detail font-medium leading-tight",
  {
    variants: {
      tone: {
        neutral: "border-line bg-gray-5 text-ink-body",
        navy: "border-navy-20 bg-navy-5 text-navy-60",
        blue: "border-blue-20 bg-blue-5 text-blue-60",
        success: "border-success/30 bg-success-bg text-success",
        warning: "border-warning/40 bg-warning-bg text-[#9a6a00]",
        danger: "border-danger/30 bg-danger-bg text-danger",
        info: "border-info/30 bg-info-bg text-info",
        outline: "border-line-strong bg-white text-ink-muted",
        solid: "border-primary bg-primary text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}

export { badgeVariants };
