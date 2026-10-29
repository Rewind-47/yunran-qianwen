import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { NewsList } from "@/components/news-list";
import { newsSorted } from "@/lib/data/news";

export const metadata = {
  description:
    "云染千纹的公告、媒体报道、工艺科普与活动信息。全部公告逐条收录，可点开阅读完整稿件。",
};

export default function NewsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <SectionHeading
        index="01"
        eyebrow="Newsroom"
        title="资讯中心"
        description="公告、媒体报道、工艺科普与活动安排。列表只放摘要，点开是完整稿件。"
        action={
          <p className="figure text-[12px] tracking-[0.08em] text-dye-800/40">
            共 {String(newsSorted.length).padStart(2, "0")} 条 · 截至{" "}
            {newsSorted[0].date.replaceAll("-", ".")}
          </p>
        }
      />

      <div className="mt-11">
        <NewsList />
      </div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-dye-900/10 pt-6">
        <Link
          href="/"
          className="text-[12.5px] text-dye-700/60 transition-colors hover:text-dye-900"
        >
          ← 返回首页
        </Link>
        <p className="figure text-[11.5px] tracking-[0.1em] text-dye-800/35">
          YUNRAN QIANWEN · NEWSROOM
        </p>
      </div>
    </div>
  );
}
