/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 默认输出到 .next；本地受限环境可用 NEXT_DIST_DIR 指定其他目录
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // 智能知识库不再单独成页，问答收进全站右下角浮窗；旧链接与外部收藏夹里的地址回首页
  async redirects() {
    return [{ source: "/knowledge", destination: "/", permanent: false }];
  },
};

export default nextConfig;
