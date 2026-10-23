import Link from "next/link";

/**
 * 工坊模块页的悬浮返回键。
 *
 * 三个模块（个性工坊 / 灵感广场 / 局部重绘）都是从 /studio 的三张大卡片点进来的，
 * 点进来之后顶部导航只有栏目名，没有「上一级」。所以在这里补一个悬浮键：
 * 固定在左上角（吸顶导航之下），收起时是一枚圆形箭头，悬停展开成「返回创作工坊」胶囊。
 *
 * 为什么不做成普通的一行返回链路：工作台是全屏双栏，页面里没有留给面包屑的位置，
 * 悬浮键不占文档流，也不会像面包屑那样把首屏往下推。
 */
export function StudioBack() {
  return (
    <Link
      href="/studio"
      aria-label="返回创作工坊"
      title="返回创作工坊"
      className="group fixed left-4 top-[72px] z-30 inline-flex h-10 items-center rounded-full border border-dye-900/12 bg-white/85 px-[11px] text-dye-800/70 shadow-[0_12px_28px_-20px_rgba(16,31,47,0.85)] backdrop-blur-md transition-all duration-300 ease-soft hover:border-dye-700/35 hover:bg-white hover:pr-4 hover:text-dye-900 xl:left-5"
    >
      <span
        aria-hidden
        className="text-[15px] leading-none transition-transform duration-300 ease-soft group-hover:-translate-x-0.5"
      >
        ←
      </span>
      <span
        aria-hidden
        className="max-w-0 overflow-hidden whitespace-nowrap text-[12.5px] opacity-0 transition-all duration-300 ease-soft group-hover:ml-1.5 group-hover:max-w-[7rem] group-hover:opacity-100"
      >
        返回创作工坊
      </span>
    </Link>
  );
}
