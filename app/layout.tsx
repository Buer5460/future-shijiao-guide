import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./account.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "未来仕角｜智能导诊服务",
  description: "面向患者的智能导诊、院内导航与就医服务演示平台。",
  openGraph: {
    title: "未来仕角｜安心就医，一路相伴",
    description: "智能导诊、院内导航与就医服务演示平台。",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "未来仕角智慧导医平台" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "未来仕角｜安心就医，一路相伴",
    description: "智能导诊、院内导航与就医服务演示平台。",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
