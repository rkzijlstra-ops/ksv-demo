import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SwRegistrar } from "@/components/SwRegistrar";
import { SyncBoot } from "@/components/SyncBoot";
import { OfflineStrip } from "@/components/OfflineStrip";
import { QuotaBanner } from "@/components/QuotaBanner";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KSV Opdrachten",
  description: "Meldingen en opdrachten voor monteurs van Keukenstudio Voorschoten",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#27272a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body>
        <SwRegistrar />
        <SyncBoot />
        <OfflineStrip />
        <QuotaBanner />
        {children}
      </body>
    </html>
  );
}
