import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SecurityGuard from "./components/SecurityGuard";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "LogVault | Secure Daily Logbook",
  description:
    "Your life, encrypted. A cyber-bold, neobrutalist personal logbook for the modern era.",
  generator: "Next.js",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ServiceWorkerRegister />
        <SecurityGuard />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
