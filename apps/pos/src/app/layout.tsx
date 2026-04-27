import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "MR-KING POS | Premium Snack Management",
  description: "High-performance POS system for MR-KING restaurant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans overflow-hidden">
        {children}
      </body>
    </html>
  );
}
