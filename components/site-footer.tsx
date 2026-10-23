export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-dye-900/10 bg-cloth-100/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="title-brush text-[26px] leading-none text-dye-900">
            云染千纹
          </p>
          <p className="eyebrow mt-2 text-[8.5px] text-dye-700/50">
            Yunnan Bai Tie-dye · AI Atelier
          </p>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-dye-800/65">
            云南白族扎染非遗 AI 交互展示平台。以 AI 拆解「局部防染」的工艺逻辑，
            让不临现场的人也能看懂、能上手、能理解这方蓝白。
          </p>
          <p className="mt-4 text-[11px] leading-relaxed text-dye-800/45">
            本站 AI 生成图像均为工艺效果参考，不代表真实扎染成品。
          </p>
        </div>

        <div>
          <p className="eyebrow mb-3.5 text-[9px] text-dye-800/45">Sections</p>
          <ul className="space-y-2 font-song text-[13px] text-dye-800/70">
            <li>数字展馆 · 纹样图鉴</li>
            <li>工艺问答 · 右下角浮窗</li>
            <li>创作工坊 · 个性扎染</li>
            <li>灵感广场 · 作品共赏</li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3.5 text-[9px] text-dye-800/45">Stack</p>
          <ul className="space-y-2 text-[13px] text-dye-800/70">
            <li>Next.js 14 · React · TypeScript</li>
            <li>Tailwind CSS · Zustand</li>
            <li>通义千问 / DeepSeek · 万相</li>
            <li>RAG · Agent · Function Calling</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-dye-900/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[11px] text-dye-800/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 云染千纹 · 传智杯 AI Web 网页开发挑战赛参赛作品</span>
          <span className="figure tracking-[0.14em]">选题方向：文化共创</span>
        </div>
      </div>
    </footer>
  );
}
