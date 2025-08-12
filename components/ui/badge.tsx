import * as React from "react";
import { clsx } from "clsx";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", 
  {
    variants: {
      variant: {
        default: "border-transparent bg-neutral-800 text-neutral-200",
        secondary: "border-transparent bg-neutral-700 text-neutral-200",
        outline: "border-neutral-700 text-neutral-200",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function cn(...classes: unknown[]): string {
  return clsx(classes);
}

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
