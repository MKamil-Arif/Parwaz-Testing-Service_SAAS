import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", display: "swap", weight: ["500", "600", "700", "800"] });

// Every page reads live data (sessions, competitions, settings) from SQL Server.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Rewarding Potential — Test Your Knowledge, Earn Your Future",
    template: "%s · Rewarding Potential",
  },
  description:
    "Affordable online academic competitions for Class 9–12 students across Sindh. Sit a fair, timed online exam and compete for laptops and Chromebooks on a transparent merit list.",
  applicationName: "Rewarding Potential",
};

export const viewport: Viewport = {
  themeColor: "#122042",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
