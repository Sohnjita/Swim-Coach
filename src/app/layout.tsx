import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import DbBootstrap from "@/components/DbBootstrap";
import PoolLanes from "@/components/PoolLanes";
import { basePath } from "@/lib/basePath";
import "./globals.css";

const displayFont = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono-crisp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swim Coach",
  description: "Personal swim training log, scoring, and meet planning.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Swim Coach",
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icons/favicon-16.png`, sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050d16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-bg text-text-primary">
        <DbBootstrap />
        <PoolLanes />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
