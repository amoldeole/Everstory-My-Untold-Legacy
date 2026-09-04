"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { MoonIcon, SunIcon, navIcon } from "@/components/layout/NavIcons";
import { cn } from "@/lib/utils/cn";
import { signOutAction } from "@/server/actions/auth";
import { createEntryAction } from "@/server/actions/entries";

export interface NavItem {
  href: string;
  label: string;
  /** Key into `NAV_ICONS` — a function cannot be serialised across the RSC boundary. */
  icon: string;
  primary?: boolean;
  /**
   * Render as a POST form instead of a link.
   *
   * Creating a draft is a mutation, and Next.js prefetches `<Link>` targets —
   * a prefetch of `/write` would litter the database with empty drafts.
   */
  post?: boolean;
}

export function AppShell({
  navItems,
  userName,
  userEmail,
  children,
}: {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer when the route changes. Adjusting state during render
  // (rather than in an effect) is what React recommends for state derived
  // from a prop, and it avoids a render-then-immediately-render-again flash.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Escape closes the drawer; the body stops scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav className="flex h-full flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const className = cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          item.primary &&
            "mt-2 bg-ink-900 text-parchment-50 hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white",
          !item.primary &&
            active &&
            "bg-parchment-200 font-medium text-ink-900 dark:bg-white/10 dark:text-parchment-50",
          !item.primary &&
            !active &&
            "text-ink-600 hover:bg-parchment-200/60 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-white/5 dark:hover:text-parchment-50",
        );
        const Icon = navIcon(item.icon);
        const inner = (
          <>
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </>
        );

        return item.post ? (
          <form key={item.href} action={createEntryAction}>
            <button type="submit" className={className}>
              {inner}
            </button>
          </form>
        ) : (
          <Link key={item.href} href={item.href} className={className}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900 text-parchment-100 dark:bg-parchment-100 dark:text-ink-900">
          <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
            <path
              d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5v-15Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 8h7M8.5 12h7M8.5 16h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-serif text-[15px] leading-tight font-semibold text-ink-900 dark:text-parchment-50">
            Everstory
          </p>
          <p className="truncate text-[11px] text-ink-500 dark:text-parchment-500">My Untold Legacy</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">{nav}</div>

      <div className="border-t border-parchment-300 px-3 py-3 dark:border-white/10">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass-300/60 text-sm font-semibold text-brass-700 dark:bg-brass-700/30 dark:text-brass-300">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink-800 dark:text-parchment-100">
              {userName}
            </p>
            <p className="truncate text-[11px] text-ink-500 dark:text-parchment-500">{userEmail}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-md p-1.5 text-ink-500 transition hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-400 dark:hover:bg-white/10 dark:hover:text-parchment-50"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M15 5.5V4.5A1.5 1.5 0 0 0 13.5 3h-8A1.5 1.5 0 0 0 4 4.5v15A1.5 1.5 0 0 0 5.5 21h8a1.5 1.5 0 0 0 1.5-1.5v-1M10 12h11m0 0-3-3m3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-parchment-100 dark:bg-[#100e0c]">
      {/* ------------------------------------------------------- desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-parchment-300 bg-parchment-50 lg:block dark:border-white/10 dark:bg-white/[0.02]">
        {sidebar}
      </aside>

      {/* ------------------------------------------------------ mobile drawer */}
      <div
        className={cn("fixed inset-0 z-40 lg:hidden", open ? "block" : "pointer-events-none hidden")}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        />
        <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-parchment-300 bg-parchment-50 shadow-lift dark:border-white/10 dark:bg-[#171412]">
          {sidebar}
        </div>
      </div>

      <div className="lg:pl-60">
        {/* --------------------------------------------------- mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-parchment-300 bg-parchment-100/90 px-4 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#100e0c]/90">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 rounded-md p-2 text-ink-700 transition hover:bg-parchment-200 dark:text-parchment-200 dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="font-serif text-[15px] font-semibold text-ink-900 dark:text-parchment-50">
            Everstory
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ theme store --
   A tiny external store so the toggle can read the real theme without an
   effect that sets state on mount. `getServerSnapshot` keeps SSR happy.     */

const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(next: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("everstory-theme", next);
  } catch {
    /* private browsing — the choice just will not persist */
  }
  for (const listener of themeListeners) listener();
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "light" as const);

  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "rounded-md p-2 text-ink-600 transition hover:bg-parchment-200 hover:text-ink-900 dark:text-parchment-300 dark:hover:bg-white/10 dark:hover:text-parchment-50",
        className,
      )}
    >
      {theme === "dark" ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
