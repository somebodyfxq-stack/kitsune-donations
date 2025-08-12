"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { clsx } from "clsx";

function cn(...classes: unknown[]): string {
  return clsx(classes);
}

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-6 left-1/2 z-50 flex w-full max-w-xs -translate-x-1/2 flex-col-reverse gap-2 p-4",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group relative grid w-full items-center justify-between rounded-full bg-white/10 px-3 py-2 text-sm shadow-lg ring-1 ring-white/20 sm:px-4 sm:py-2 md:px-6 md:py-3 lg:px-8 lg:py-4",
      className,
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn(className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-white/60 transition hover:text-white focus:outline-none focus:ring-1 focus:ring-white/20",
      className,
    )}
    aria-label="Close"
    {...props}
  >
    <span aria-hidden>×</span>
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastClose };

