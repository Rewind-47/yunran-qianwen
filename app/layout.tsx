import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooterGate } from "@/components/site-footer-gate";
import { ChatDock } from "@/components/chat-dock";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "云染千纹——基于多模态大模型与 3D 实时材质映射的非遗扎染数字共创平台",
  description:
    "云染千纹——基于多模态大模型与 3D 实时材质映射的非遗扎染数字共创平台",
  keywords: ["扎染", "白族", "非遗", "云南", "AI", "文化共创"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooterGate />
        <ChatDock />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
