import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Amherst Woods", template: "%s · Amherst Woods" },
  description: "Amherst Woods Neighborhood Association portal",
  appleWebApp: { capable: true, title: "Amherst Woods" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2E6A4F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
