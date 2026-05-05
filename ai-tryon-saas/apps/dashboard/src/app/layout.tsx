import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Try-On — Đăng nhập",
  description: "Dashboard đăng nhập",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
