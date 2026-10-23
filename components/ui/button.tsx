import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "cloth" | "outline" | "ghost" | "madder";
type Size = "sm" | "md" | "lg";

/**
 * 按钮不再用单色块。
 * primary 走 .btn-dye（靛蓝染液晕散 + 坯布经纬），cloth 走 .btn-cloth（米白坯布）。
 * 两个类都在 globals.css 里，改纹理只改一处。
 */
const variants: Record<Variant, string> = {
  primary: "btn-dye text-cloth-50 border border-dye-900/40 hover:text-white",
  cloth:
    "btn-cloth text-dye-900 border border-white/70 hover:text-dye-950",
  outline:
    "bg-transparent text-dye-800 border border-dye-900/20 hover:border-dye-700/50 hover:bg-dye-50/70",
  ghost: "bg-transparent text-dye-700 hover:bg-dye-900/5 border border-transparent",
  madder:
    "bg-madder-500 text-cloth-50 hover:bg-madder-400 border border-madder-500",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dye-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cloth-50",
        "disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" || variant === "cloth"
          ? "transition-transform"
          : "transition-colors duration-200",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
