// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: {
    default: "DocQualis | SaaS Enterprise",
    template: "%s | DocQualis",
  },
  description: "Sistema integrado de gestão da qualidade empresarial.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 overflow-hidden`}>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />

          <main className="flex-1 min-w-0 h-screen overflow-y-auto bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
