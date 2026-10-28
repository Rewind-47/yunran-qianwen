"use client";

import Link from "next/link";
import { categoryNames, galleryData } from "@/lib/data/gallery-data";

type GalleryPageProps = {
  params: { id: string };
};

export default function CategoryGalleryPage({ params }: GalleryPageProps) {
  const categoryId = params.id as keyof typeof galleryData;
  const images = galleryData[categoryId];
  const categoryName = categoryNames[categoryId];

  if (!images || !categoryName) {
    return (
      <section className="min-h-screen bg-cloth-50 px-5 py-16 text-dye-900 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-dye-900/15 bg-white/70 px-4 py-2 text-sm text-dye-800 transition-colors hover:border-dye-700 hover:text-dye-700"
          >
            ← 返回首页
          </Link>
          <p className="mt-16 text-center font-song text-2xl">暂无该品类图片</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-cloth-50 px-5 py-12 text-dye-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-dye-900/15 bg-white/70 px-4 py-2 text-sm text-dye-800 transition-colors hover:border-dye-700 hover:text-dye-700"
        >
          ← 返回首页
        </Link>

        <header className="mb-8 mt-10 sm:mb-10">
          <p className="eyebrow text-xs tracking-[0.2em] text-dye-700/55">CATEGORY GALLERY</p>
          <h1 className="mt-2 font-song text-3xl font-semibold sm:text-4xl">
            {categoryName}专属图库
          </h1>
        </header>

        {images.length > 0 ? (
          <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4">
            {images.map((src) => (
              <div
                key={src}
                className="group mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${categoryName}扎染作品`}
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                  onError={(event) => {
                    console.error(`图库图片加载失败: ${src}`);
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/images/gallery/dress/dress-1.png";
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-dye-800/60">暂无该品类图片</p>
        )}
      </div>
    </section>
  );
}
