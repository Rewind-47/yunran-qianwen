"use client";

import { openChat } from "@/components/chat-dock";

/**
 * 首页快捷区里的「工艺问答」。
 * 知识库不再单独成页，问答收在右下角悬浮窗里，所以这一项不跳页、直接唤起浮窗，
 * 样式与旁边的两条页面入口保持一致，读起来仍是一列。
 */
export function QaQuickLink({ label, en }: { label: string; en: string }) {
  return (
    <button
      type="button"
      onClick={() => openChat()}
      className="group flex w-full items-center justify-between py-2.5 text-left text-[12.5px] text-dye-800/80 transition-colors hover:text-dye-900"
    >
      <span>{label}</span>
      <span className="text-[10px] tracking-[0.14em] text-dye-500/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-dye-700/70">
        {en} →
      </span>
    </button>
  );
}
