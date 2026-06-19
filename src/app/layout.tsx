import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SwRegistrar } from "@/components/SwRegistrar";
import { SyncBoot } from "@/components/SyncBoot";
import { OfflineStrip } from "@/components/OfflineStrip";
import { QuotaBanner } from "@/components/QuotaBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { BuildLabel } from "@/components/BuildLabel";
import { isDemoMode } from "@/lib/demo";

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
  title: "Kluslus",
  description: "Monteur-app voor opleveringen, klussen en meldingen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
        {isDemoMode() && <DemoBanner />}
        <SwRegistrar />
        <SyncBoot />
        <OfflineStrip />
        <QuotaBanner />
        {children}
        <BuildLabel />
      </body>
    </html>
  );
}
