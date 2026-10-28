import { CarrierSection } from "@/components/carrier-section";
import { CraftIndex } from "@/components/craft-index";
import { HeroBanner } from "@/components/hero-banner";
import { HomeStatsFooter } from "@/components/home-stats-footer";
import { NewsCenter } from "@/components/news-center";

/**
 * 门户首页。
 *
 * 深浅节奏（自上而下）：
 *   首屏大图（暗）→ 通知条（浅）→ 扎染名录（深靛蓝）→ 新闻资讯（浅蓝纸）
 *   → 03 载体（深靛蓝染缸）→ 数字一览（深靛蓝）
 */
export default function PortalPage() {
  return (
    <div>
      <div className="h-screen snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth">
        <HeroBanner />
        <CraftIndex />
        <NewsCenter />
        <CarrierSection />
        <HomeStatsFooter />
      </div>
    </div>
  );
}
