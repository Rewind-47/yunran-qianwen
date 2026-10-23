/**
 * 通义万相（DashScope）图像能力封装。
 *
 * 文生图与局部重绘都是异步任务：先提交拿 task_id，再轮询直到 SUCCEEDED。
 * 这里把「提交 → 轮询 → 取图」抽成一层，上层路由只管业务语义。
 *
 * 未配置密钥时 isWanxReady() 为 false，调用方走本地程序化渲染，
 * 保证演示环境不出现空白图或红色报错。
 */

const DEFAULT_BASE = "https://dashscope.aliyuncs.com";

export function isWanxReady(): boolean {
  return Boolean(process.env.DASHSCOPE_API_KEY) && process.env.ENABLE_IMAGE_API !== "false";
}

export function wanxStatus() {
  return {
    configured: isWanxReady(),
    textToImageModel: process.env.WANX_T2I_MODEL ?? "wanx2.1-t2i-turbo",
    editModel: process.env.WANX_EDIT_MODEL ?? "wanx2.1-imageedit",
  };
}

function baseURL() {
  return (process.env.DASHSCOPE_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
}

function authHeaders() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("未配置 DASHSCOPE_API_KEY");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    "X-DashScope-Async": "enable",
  };
}

interface TaskSubmitResponse {
  output?: { task_id?: string; task_status?: string; message?: string };
  message?: string;
  code?: string;
}

async function submit(path: string, body: unknown): Promise<string> {
  const res = await fetch(`${baseURL()}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const json = (await res.json().catch(() => ({}))) as TaskSubmitResponse;
  if (!res.ok || !json.output?.task_id) {
    const reason = json.message ?? json.output?.message ?? `HTTP ${res.status}`;
    throw new Error(`万相任务提交失败：${reason}`);
  }
  return json.output.task_id;
}

interface TaskResult {
  task_status?: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  message?: string;
  code?: string;
  results?: { url?: string; code?: string; message?: string }[];
}

async function poll(taskId: string, timeoutMs = 120_000, intervalMs = 2_500): Promise<TaskResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${baseURL()}/api/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as { output?: TaskResult };
    const output = json.output ?? {};
    const status = output.task_status;

    if (status === "SUCCEEDED") return output;
    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(`万相任务失败：${output.message ?? output.code ?? status}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("万相任务超时（120s），请稍后重试");
}

function pickUrl(output: TaskResult): string {
  const url = output.results?.find((r) => r.url)?.url;
  if (!url) {
    const reason = output.results?.[0]?.message ?? "返回结果中不含图片地址";
    throw new Error(`万相生成失败：${reason}`);
  }
  return url;
}

/** 文生图：给工艺提示词，出扎染成品效果图 */
export async function textToImage(args: {
  prompt: string;
  negativePrompt?: string;
  size?: string;
  seed?: number;
}): Promise<{ imageUrl: string; model: string }> {
  const model = process.env.WANX_T2I_MODEL ?? "wanx2.1-t2i-turbo";
  const taskId = await submit("/api/v1/services/aigc/text2image/image-synthesis", {
    model,
    input: {
      prompt: args.prompt,
      ...(args.negativePrompt ? { negative_prompt: args.negativePrompt } : {}),
    },
    parameters: {
      size: args.size ?? "1024*1024",
      n: 1,
      // 关闭提示词改写：我们要的是「工艺参数可解释」，不能让模型自由发挥
      prompt_extend: false,
      ...(typeof args.seed === "number" ? { seed: args.seed } : {}),
    },
  });

  const output = await poll(taskId);
  return { imageUrl: pickUrl(output), model };
}

/**
 * 局部重绘：description_edit_with_mask。
 * base / mask 支持公网 URL 或 data URI（本地开发用 data URI 即可）。
 * mask 约定：白色区域 = 要重绘，黑色 = 保持不变。
 */
export async function editWithMask(args: {
  prompt: string;
  baseImage: string;
  maskImage: string;
  negativePrompt?: string;
}): Promise<{ imageUrl: string; model: string }> {
  const model = process.env.WANX_EDIT_MODEL ?? "wanx2.1-imageedit";
  const taskId = await submit("/api/v1/services/aigc/image2image/image-synthesis", {
    model,
    input: {
      function: "description_edit_with_mask",
      prompt: args.prompt,
      base_image_url: args.baseImage,
      mask_image_url: args.maskImage,
      ...(args.negativePrompt ? { negative_prompt: args.negativePrompt } : {}),
    },
    parameters: { n: 1 },
  });

  const output = await poll(taskId, 150_000);
  return { imageUrl: pickUrl(output), model };
}
