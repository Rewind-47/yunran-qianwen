import { SectionHeading } from "@/components/section-heading";
import { ClothBackdrop } from "@/components/section-chrome";
import { inheritorsData } from "@/lib/data/inheritors";

export function AtlasInheritors() {
  return (
    <section
      id="inheritors"
      className="relative scroll-mt-[10.625rem] md:scroll-mt-[8rem]"
    >
      <ClothBackdrop
        seams={false}
        style={{
          backgroundImage:
            "linear-gradient(180deg,#F6F1E7 0%,#FBF8F1 100%)",
        }}
      />

      <div aria-hidden className="relative mx-auto max-w-6xl px-5">
        <div className="h-[2px] [background-image:repeating-linear-gradient(90deg,rgba(23,46,68,0.2)_0_10px,transparent_10px_24px)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12">
        <SectionHeading
          eyebrow="Living Heritage Bearers"
          title="非遗传承人"
          description="他们以代代相传的手艺守护传统，也不断为扎染技艺探索新的表达。"
        />

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {inheritorsData.map((inheritor) => (
            <li
              key={inheritor.name}
              className="card-lift flex min-h-full flex-col rounded-card border border-dye-900/10 bg-white/75 p-6 shadow-[0_8px_24px_-16px_rgba(16,31,47,0.38)] backdrop-blur-[2px] hover:shadow-[0_24px_42px_-20px_rgba(16,31,47,0.38)]"
            >
              <p className="eyebrow text-[9px] text-dye-600/65">
                {inheritor.title}
              </p>
              <h3 className="mt-3 text-[21px] leading-[1.4] text-dye-900">
                {inheritor.name}
              </h3>
              <p className="mt-4 flex-1 text-[12.5px] leading-[1.95] text-dye-800/65">
                {inheritor.desc}
              </p>
              <a
                href={inheritor.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-fit items-center gap-2 text-[12px] text-dye-700 transition-colors hover:text-dye-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dye-600"
              >
                了解详情
                <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
