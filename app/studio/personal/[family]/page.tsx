import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InpaintStudio } from "@/components/inpaint-studio";
import { PersonalWorkshop } from "@/components/personal-workshop";
import { styleCategories } from "@/lib/data/styles";
import { techniqueCategories } from "@/lib/data/techniques";
import type { TechniqueCategory } from "@/lib/types";

const families = techniqueCategories.map((c) => c.id);

export function generateStaticParams() {
  return families.map((family) => ({ family }));
}

export function generateMetadata({ params }: { params: { family: string } }) {
  const hit = techniqueCategories.find((c) => c.id === params.family);
  return { title: hit ? `创作工坊 · ${hit.label}` : "创作工坊" };
}

export default function PersonalFamilyPage({
  params,
  searchParams,
}: {
  params: { family: string };
  searchParams?: { styleCategory?: string };
}) {
  const hit = techniqueCategories.find((c) => c.id === params.family);
  if (!hit) notFound();

  const styleCategory = styleCategories.find(
    (category) => category.id === searchParams?.styleCategory,
  )?.id;

  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <div className="space-y-12">
        <section id="inpaint" aria-labelledby="inpaint-heading">
          <div className="mb-5">
            <p className="eyebrow text-[9px] text-dye-700/55">FREEHAND DYEING</p>
            <h2
              id="inpaint-heading"
              className="mt-1.5 font-song text-[25px] font-semibold text-dye-900"
            >
              随心点染
            </h2>
            <p className="mt-1.5 text-[12px] text-dye-800/55">
              在画纸上绘制或重绘纹样，再把设计应用到下方的实物坯布。
            </p>
          </div>
          <InpaintStudio />
        </section>

        <section id="personal" aria-labelledby="personal-heading">
          <div className="mb-5">
            <p className="eyebrow text-[9px] text-dye-700/55">PERSONAL STUDIO</p>
            <h2
              id="personal-heading"
              className="mt-1.5 font-song text-[25px] font-semibold text-dye-900"
            >
              个性工坊
            </h2>
            <p className="mt-1.5 text-[12px] text-dye-800/55">
              选择款式、工艺与配色，在三维坯布上继续完成你的设计。
            </p>
          </div>
          <PersonalWorkshop
            family={hit.id as TechniqueCategory}
            initialStyleCategory={styleCategory}
          />
        </section>
      </div>
    </Suspense>
  );
}
