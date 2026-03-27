import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";

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
  title: "Program Planner - Planificación Académica Inteligente",
  description: "Crea y gestiona tus programaciones didácticas de forma profesional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark:bg-zinc-950`}>
      <body className="flex min-h-screen flex-col bg-white dark:bg-zinc-950 selection:bg-emerald-500/30">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
           &copy; {new Date().getFullYear()} Program Planner. Diseñado para docentes de FP.
        </footer>
      </body>
    </html>
  );
}
