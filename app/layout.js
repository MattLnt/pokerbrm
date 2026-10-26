import { Inter } from "next/font/google";
import MainNav from "@/components/MainNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
  themeColor: "#0a0f1c",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MainNav />
        {/* Décalé du rail latéral à partir de lg ; sinon place pour la nav basse. */}
        <div className="pb-nav lg:pl-[240px]">{children}</div>
      </body>
    </html>
  );
}
