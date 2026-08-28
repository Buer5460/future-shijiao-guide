import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./account.css";

export const metadata: Metadata = {
  title: "未来仕角｜智能导诊服务",
  description: "成都市青白江区人民医院智能导诊、院内导航与就医服务平台。",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f8f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
