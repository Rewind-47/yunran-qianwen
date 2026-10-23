import { NextRequest, NextResponse } from "next/server";
import { techniqueMap, techniques } from "@/lib/data/techniques";
import { buildInpaintPrompt } from "@/lib/prompts";
import { editWithMask, isWanxReady, wanxStatus } from "@/lib/wanx";

/**
 * 局部重绘接口。
 *
 * 入参：底图（data URI 或公网 URL）+ 遮罩（黑底白区）+ 一句工艺/内容描述
 * 出参：模型返回的整图 URL；调用方必须再用同一个遮罩做 alpha 合成，
 *       只取遮罩内像素，保证「未涂抹区域一个像素都不动」。
 *
 * 这一条约束是本项目对 inpainting 的核心工程要求 —— 生成模型一定会重画整张图，
 * 靠 prompt 说「不要改其它区域」是不可靠的，必须靠合成阶段兜住。
 */

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  baseImage?: string;
  maskImage?: string;
  instruction?: string;
  techniqueId?: string;
  params?: Record<string, number>;
  regionHint?: string;
}

const MAX_IMAGE_CHARS = 8 * 1024 * 1024; // 约 6MB 图片

function validImage(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (src.length > MAX_IMAGE_CHARS) return false;
  return /^data:image\/(png|jpeg|webp);base64,/.test(src) || /^https?:\/\//.test(src);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const technique = techniqueMap[body.techniqueId ?? ""] ?? techniques[0];

  if (!validImage(body.baseImage) || !validImage(body.maskImage)) {
    return NextResponse.json(
      { error: "底图或遮罩格式不合法（需要 PNG/JPEG data URI 或公网地址）" },
      { status: 400 },
    );
  }

  const prompt = buildInpaintPrompt(
    technique,
    body.params ?? {},
    body.regionHint ?? "遮罩标记的区域",
    body.instruction,
  );

  const status = wanxStatus();
  if (!isWanxReady()) {
    return NextResponse.json({
      mode: "local" as const,
      imageUrl: null,
      prompt,
      model: null,
      reason: "未配置 DASHSCOPE_API_KEY，使用本地程序化纹样合成（链路一致，出图换成本地渲染）",
    });
  }

  const started = Date.now();
  try {
    const { imageUrl, model } = await editWithMask({
      prompt,
      baseImage: body.baseImage,
      maskImage: body.maskImage,
    });
    return NextResponse.json({
      mode: "model" as const,
      imageUrl,
      prompt,
      model,
      tookMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "局部重绘失败";
    return NextResponse.json(
      {
        error: message,
        prompt,
        model: status.editModel,
        fallback: "local",
      },
      { status: 502 },
    );
  }
}
