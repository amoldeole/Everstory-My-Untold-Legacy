import type { Metadata, Viewport } from "next";

import "./globals.css";
import { getEnv } from "@/lib/env";

const description =
  "Everstory is a private, guided place to write the story only you can tell — chapter by chapter, at your own pace, in words that outlive you.";

export function generateMetadata(): Metadata {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL;
  return {
    metadataBase: new URL(appUrl),
    title: {
      default: "Everstory — My Untold Legacy",
      template: "%s · Everstory",
    },
    description,
    applicationName: "Everstory",
    keywords: ["memoir", "life story", "legacy", "journal", "writing", "family history"],
    authors: [{ name: "Everstory" }],
    openGraph: {
      type: "website",
      title: "Everstory — My Untold Legacy",
      description,
      siteName: "Everstory",
    },
    twitter: { card: "summary_large_image", title: "Everstory — My Untold Legacy", description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#100e0c" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Applies the stored theme before first paint. Without this the page flashes
 * light before switching to dark.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('everstory-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
