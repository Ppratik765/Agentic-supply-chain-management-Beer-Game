import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DynamicBackground from "@/components/DynamicBackground";
import ThemeToggle from "@/components/ThemeToggle";

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
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-[var(--font-inter)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <DynamicBackground />
        <div className="relative z-10">{children}</div>
        <div className="fixed bottom-4 right-4 z-50">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
