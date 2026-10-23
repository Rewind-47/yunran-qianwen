import { GalleryGrid } from "@/components/gallery-grid";
import { SectionHeading } from "@/components/section-heading";

export const metadata = { title: "数字展馆" };

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="DIGITAL GALLERY"
        title="纹样图鉴"
        description="十二枚纹样，对应六种捆扎技法。每一枚都能点开看它的寓意、用途与技法要点，也可以直接听一段解说。"
      />
      <div className="mt-10">
        <GalleryGrid />
      </div>
    </div>
  );
}
