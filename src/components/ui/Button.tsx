import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-parchment-50 hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white",
  secondary:
    "border border-parchment-400 bg-parchment-50 text-ink-800 hover:bg-parchment-200 dark:border-white/12 dark:bg-white/5 dark:text-parchment-100 dark:hover:bg-white/10",
  ghost:
    "text-ink-600 hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-white/10 dark:hover:text-parchment-50",
  danger: "bg-seal-600 text-white hover:bg-seal-500",
  subtle:
    "bg-parchment-200 text-ink-800 hover:bg-parchment-300 dark:bg-white/10 dark:text-parchment-100 dark:hover:bg-white/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<"button">, keyof CommonProps>) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, keyof CommonProps>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
