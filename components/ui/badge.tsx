import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "dye" | "cloth" | "madder" | "woad";

const tones: Record<Tone, string> = {
  dye: "bg-dye-100 text-dye-800 border-dye-700/15",
  cloth: "bg-cloth-200 text-dye-800 border-dye-900/10",
  madder: "bg-madder-50 text-madder-500 border-madder-200",
  woad: "bg-woad-100 text-woad-500 border-woad-500/20",
};

export function Badge({
  children,
  tone = "dye",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] leading-none tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
