import {withEdgeOne} from '@edgeone/opennextjs-pages';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default withEdgeOne(nextConfig);