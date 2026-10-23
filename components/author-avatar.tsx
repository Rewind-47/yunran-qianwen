import { cn } from "@/lib/utils";
import type { CommunityAuthor } from "@/lib/data/community";

/**
 * 作者头像：没有真实头像图，用「名字首字 + 作者主色」的印章式圆牌。
 * 与全站的靛蓝 / 茜红配色一致，比灰色占位更像一个有身份的人。
 */
export function AuthorAvatar({
  author,
  size = 36,
  className,
  ring = false,
}: {
  author: CommunityAuthor;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-song text-cloth-50 select-none",
        ring && "ring-2 ring-white/80",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(140deg, ${author.hue} 0%, ${author.hue}CC 55%, #0B1622 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
      }}
    >
      {author.initial}
    </span>
  );
}
