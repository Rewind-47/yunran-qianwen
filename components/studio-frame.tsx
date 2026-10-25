export function StudioFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-10">
      <div>
        <p className="eyebrow text-[9px] text-dye-700/55">Creation Studio</p>
        <h1 className="mt-2.5 font-song text-[32px] font-semibold leading-tight tracking-[-0.01em] text-dye-900">
          创作工坊
        </h1>
        <p className="lede mt-2.5 max-w-xl text-[13px] text-dye-800/60">
          从局部重绘到款式、工艺与配色设计，在同一画面中完成你的创作。
        </p>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
