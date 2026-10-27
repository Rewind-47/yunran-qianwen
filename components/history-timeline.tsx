"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "@/lib/data/history";

export function HistoryTimeline({ items }: { items: HistoryEntry[] }) {
  const [selectedItem, setSelectedItem] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (!selectedItem) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItem(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedItem]);

  return (
    <>
      <ol
        aria-label="历史阶段时间轴"
        className="relative mt-11 before:absolute before:inset-y-7 before:left-[100px] before:w-px before:bg-dye-700/25 before:content-[''] sm:before:left-[168px]"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[84px_minmax(0,1fr)] gap-4 border-t border-dye-900/[0.1] py-7 sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-8"
          >
            <button
              type="button"
              onClick={() => setSelectedItem(item)}
              aria-label={`查看${item.era}：${item.title}`}
              className="col-span-2 grid grid-cols-[84px_minmax(0,1fr)] gap-4 rounded-sm text-left outline-none transition-colors hover:bg-dye-900/[0.025] focus-visible:ring-2 focus-visible:ring-dye-600/50 sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-8"
            >
              <span className="pt-1 text-[12px] leading-[1.7] tracking-[0.04em] text-dye-700/65 sm:text-[13px]">
                {item.era}
              </span>

              <span className="relative pl-5 sm:pl-7">
                <span
                  aria-hidden
                  className="absolute -left-1 top-[7px] h-[9px] w-[9px] rounded-full border border-dye-700/55 bg-cloth-50"
                />
                <span className="block text-[17px] leading-[1.5] text-dye-900 sm:text-[19px]">
                  {item.title}
                </span>
                <span className="mt-2 block max-w-3xl whitespace-pre-line text-[13px] leading-[1.95] text-dye-800/70">
                  {item.summary}
                </span>
                <span className="mt-3 block text-[12px] text-dye-700/70">
                  查看详细资料
                  <span aria-hidden className="ml-2">
                    →
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-dye-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            className="relative my-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card border border-dye-900/10 bg-cloth-50 p-6 shadow-2xl sm:p-9"
          >
            <button
              type="button"
              autoFocus
              onClick={() => setSelectedItem(null)}
              aria-label="关闭详细资料"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-dye-800/60 transition-colors hover:bg-dye-900/[0.06] hover:text-dye-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dye-600"
            >
              ×
            </button>
            <p className="pr-10 text-[12px] tracking-[0.04em] text-dye-700/65">
              {selectedItem.era}
            </p>
            <h2
              id="history-detail-title"
              className="mt-3 pr-8 text-[20px] leading-[1.5] text-dye-900 sm:text-[24px]"
            >
              {selectedItem.title}
            </h2>
            <p className="mt-5 border-l-2 border-dye-700/25 pl-4 text-[13px] leading-[1.95] text-dye-800/75">
              {selectedItem.detail}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
