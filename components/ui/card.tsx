import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

function cn(...classes: unknown[]): string {
  return clsx(classes);
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

function Card({ className, asChild, ...props }: CardProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "rounded-3xl bg-white/5 shadow-2xl shadow-purple-900/20 ring-1 ring-white/10 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}

export { Card, CardHeader, CardFooter };
