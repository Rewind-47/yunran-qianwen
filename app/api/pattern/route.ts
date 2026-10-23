import { NextRequest, NextResponse } from "next/server";
import { techniqueMap } from "@/lib/data/techniques";
import { buildImagePrompt } from "@/lib/prompts";
import { isWanxReady, textToImage } from "@/lib/wanx";

export const runtime = "nodejs";
export const maxDuration = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body) || typeof body.techniqueId !== "string") {
    return NextResponse.json({ error: "请求参数不合法" }, { status: 400 });
  }

  const technique = techniqueMap[body.techniqueId];
  if (!technique || technique.category !== "tie") {
    return NextResponse.json({ error: "请选择有效的扎染工艺" }, { status: 400 });
  }

  const inputParams = body.params ?? {};
  if (!isRecord(inputParams)) {
    return NextResponse.json({ error: "工艺参数格式不合法" }, { status: 400 });
  }

  const params: Record<string, number> = {};
  for (const [key, value] of Object.entries(inputParams)) {
    const definition = technique.params.find((param) => param.key === key);
    if (
      !definition ||
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < definition.min ||
      value > definition.max
    ) {
      return NextResponse.json({ error: `工艺参数 ${key} 不合法` }, { status: 400 });
    }
    params[key] = value;
  }

  if (
    (body.theme !== undefined &&
      (typeof body.theme !== "string" || body.theme.length > 120)) ||
    (body.carrier !== undefined &&
      (typeof body.carrier !== "string" || body.carrier.length > 80))
  ) {
    return NextResponse.json({ error: "题材或载体信息不合法" }, { status: 400 });
  }

  if (!isWanxReady()) {
    return NextResponse.json(
      { error: "文生图服务未配置，请先配置 DASHSCOPE_API_KEY 后重试" },
      { status: 503 },
    );
  }

  const prompt = buildImagePrompt(
    technique,
    params,
    typeof body.theme === "string" ? body.theme.trim() || undefined : undefined,
    typeof body.carrier === "string" ? body.carrier.trim() || undefined : undefined,
  );

  try {
    const result = await textToImage({
      prompt,
      negativePrompt: "文字，水印，商标，塑料质感，非布料材质",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "扎染纹样生成失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
