import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import LegalFooter from "@/app/components/LegalFooter";
import SessionTimeoutGuard from "@/app/components/SessionTimeoutGuard";

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
  title: "OASIS",
  description:
    "Evidence-led observation and assessment for early years educators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SessionTimeoutGuard />
        <div className="flex-1">{children}</div>
        <LegalFooter />
      </body>
    </html>
  );
}
