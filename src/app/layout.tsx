import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Word Rush - Multiplayer Word Game",
  description: "The ultimate multiplayer word game challenge! Fill 6 categories with words starting from a selected letter. Compete with friends in real-time!",
  keywords: ["word game", "multiplayer", "Sinhala", "real-time", "party game"],
  authors: [{ name: "Word Rush Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Word Rush - Multiplayer Word Game",
    description: "Compete with friends in this exciting word game!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
