import { Inter, JetBrains_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Poker BRM",
  description: "Bankroll, ranges, étude et trainer MTT",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#090a1f",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto w-full max-w-[480px] pb-nav">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
