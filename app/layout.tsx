import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DynamicBackground from "@/components/DynamicBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Supply Chain Simulator",
  description:
    "Experience a real-time multiplayer supply chain management simulation. Master the bullwhip effect, optimize inventory, and compete with AI-powered agents.",
  keywords: ["supply chain simulator", "supply chain", "simulation", "MIT", "bullwhip effect", "inventory management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`} data-scroll-behavior="smooth">
      <body className="min-h-screen font-[var(--font-inter)]">
        <DynamicBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
