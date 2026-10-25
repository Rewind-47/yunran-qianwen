import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooterGate } from "@/components/site-footer-gate";
import { ChatDock } from "@/components/chat-dock";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "云染千纹 · 云南白族扎染非遗 AI 交互展示平台",
    template: "%s · 云染千纹",
  },
  description:
    "以 AI 拆解扎染「局部防染」的工艺逻辑：数字展馆、工艺问答、创作工坊与灵感广场。",
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
