import { NextRequest, NextResponse } from "next/server";

/**
 * 生成图代理。
 *
 * 两个作用：
 * 1. 通义万相返回的是 OSS 签名地址，不一定带 CORS 头；直接进 canvas 会污染画布，
 *    导致拿不到 getImageData，也就没法做「遮罩外像素零变更」的校验。走同源代理即可解决。
 * 2. 签名地址会过期，演示期间截图/复用更稳。
 *
 * 只允许阿里云域，避免变成任意 URL 的开放代理（SSRF）。
 */

export const runtime = "nodejs";

const ALLOWED_HOSTS = [/\.aliyuncs\.com$/i, /\.aliyun\.com$/i, /\.alicdn\.com$/i];

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "缺少 url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "url 不合法" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) {
    return NextResponse.json({ error: "仅允许代理阿里云图床地址" }, { status: 403 });
  }

  const upstream = await fetch(parsed, { signal: AbortSignal.timeout(30_000) });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `上游返回 ${upstream.status}` }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
