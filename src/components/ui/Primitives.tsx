import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------- input */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-ink-700 dark:text-parchment-200">{label}</label>
      {children}
      {error ? (
        <p className="text-[13px] text-seal-600 dark:text-seal-400">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-ink-500 dark:text-parchment-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/25 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50 dark:placeholder:text-parchment-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

/* -------------------------------------------------------------------- card */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-parchment-300 bg-parchment-50 shadow-page dark:border-white/10 dark:bg-white/[0.035]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-parchment-300 px-5 py-4 dark:border-white/10",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500 dark:text-parchment-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- badge */

const TONES = {
  neutral: "bg-parchment-200 text-ink-700 dark:bg-white/10 dark:text-parchment-200",
  brass: "bg-brass-300/50 text-brass-700 dark:bg-brass-700/25 dark:text-brass-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-parchment-400 px-6 py-14 text-center dark:border-white/15",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-brass-500">{icon}</div> : null}
      <h3 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500 dark:text-parchment-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ alerts */

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  title?: string;
  children?: ReactNode;
}) {
  const map = {
    info: "border-sky-300/60 bg-sky-50 text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200",
    error:
      "border-red-300/60 bg-red-50 text-red-900 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
    success:
      "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    warning:
      "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
  } as const;

  return (
    <div
      className={cn("rounded-lg border px-4 py-3 text-sm", map[tone])}
      role={tone === "error" ? "alert" : undefined}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ heading */

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 font-mono text-[11px] tracking-widest text-brass-600 uppercase dark:text-brass-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink-900 dark:text-parchment-50">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
