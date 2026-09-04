import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/session";

const NAV_ITEMS: NavItem[] = [
  { href: "/write", label: "Write something", icon: "pen", primary: true, post: true },
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/entries", label: "All entries", icon: "book" },
  { href: "/chapters", label: "Chapters", icon: "layers" },
  { href: "/timeline", label: "Timeline", icon: "timeline" },
  { href: "/people", label: "People", icon: "people" },
  { href: "/prompts", label: "Prompts", icon: "spark" },
  { href: "/export", label: "Export", icon: "download" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell navItems={NAV_ITEMS} userName={user.name} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
