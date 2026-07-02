import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/nav/BottomNav";
import DbBootstrap from "@/components/DbBootstrap";
import PoolLanes from "@/components/PoolLanes";
import { basePath } from "@/lib/basePath";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <DbBootstrap />
        <PoolLanes />
        <div className="pool-edge-top" />
        <div className="relative z-[1] flex-1 pb-[calc(64px+var(--safe-bottom))]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
