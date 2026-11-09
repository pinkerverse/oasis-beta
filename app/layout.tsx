import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import LegalFooter from "@/app/components/LegalFooter";
import PwaInstallProvider from "@/app/components/PwaInstallProvider";
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
  applicationName: "OASIS",
  description: "Observe. Understand. Support.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OASIS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#093076",
  viewportFit: "cover",
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
        <PwaInstallProvider>
          <SessionTimeoutGuard />
          <div className="flex-1">{children}</div>
          <LegalFooter />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
