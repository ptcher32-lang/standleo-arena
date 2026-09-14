import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";

const display = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "STANDLEO LITE Arena",
  description: "Competitive platform for STANDLEO LITE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${display.variable} ${sans.variable} font-sans`}>
        <AuthProvider>
          <Header />
          <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
