import { knowledgeDocs, type KnowledgeDoc } from "@/lib/data/knowledge";
import { patterns } from "@/lib/data/patterns";
import { techniques } from "@/lib/data/techniques";
import type { Citation } from "@/lib/types";

/**
 * RAG 检索层。
 *
 * 两路召回 + 一路重排：
 *   1. 词法通道：字级 bigram + IDF 加权（对中文短问句比整词切分稳，不依赖分词词典）
 *   2. 向量通道：配置了 Embedding 模型时对语料与问题取向量，算余弦（可选，失败自动跳过）
 *   3. 重排：标签命中、标题命中的额外加权，避免长文档靠长度占便宜
 *
 * 语料来自 lib/data/knowledge.ts，每条都有 source，回答必须带引用 —— 这是防幻觉的硬约束。
 */

export interface RetrievalHit extends Citation {
  title: string;
  /** 命中的关键词，用于在 UI 上解释「为什么召回了这条」 */
  matched: string[];
  channel: "lexical" | "vector" | "hybrid";
}

interface Doc extends KnowledgeDoc {
  body: string;
  grams: Map<string, number>;
  length: number;
}

const SYNONYMS: Record<string, string[]> = {
  怎么染: ["流程", "浸染"],
  怎么做: ["流程", "步骤"],
  做法: ["工艺", "流程"],
  原理: ["防染", "为什么"],
  为什么: ["原理", "防染"],
  蝴蝶: ["蝴蝶纹", "纹样"],
  蓝色: ["靛蓝", "板蓝根"],
  染料: ["板蓝根", "靛蓝"],
  帽子: ["服饰", "文创"],
  颜色: ["染料", "靛蓝"],
  对称: ["夹缬", "对折"],
};

const STOP_WORDS = new Set(["的", "了", "吗", "呢", "是", "在", "有", "和", "与", "什", "么", "怎", "样", "如", "何", "为", "什"]);

/** 字级 bigram（中文）+ 英文数字词，去停用字 */
function bigrams(text: string): string[] {
  const cleaned = text.replace(/[\s，。、；：？！「」『』（）()《》,.!?;:"'·—-]+/g, " ");
  const out: string[] = [];
  for (const chunk of cleaned.split(" ")) {
    const latin = chunk.match(/[a-zA-Z0-9]{2,}/g);
    if (latin) out.push(...latin.map((w) => w.toLowerCase()));
    const cjk = chunk.replace(/[a-zA-Z0-9]/g, "");
    for (let i = 0; i < cjk.length - 1; i += 1) {
      const g = cjk.slice(i, i + 2);
      if (STOP_WORDS.has(g[0]) || STOP_WORDS.has(g[1])) continue;
      out.push(g);
    }
    if (cjk.length === 1) out.push(cjk);
  }
  return out;
}

function expandQuery(query: string): string[] {
  const extra: string[] = [];
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) extra.push(...vals);
  }
  return [query, ...extra];
}

const corpus: Doc[] = [
  ...knowledgeDocs.map((d) => {
    const body = `${d.title} ${d.tags.join(" ")} ${d.text}`;
    const grams = new Map<string, number>();
    for (const g of bigrams(body)) grams.set(g, (grams.get(g) ?? 0) + 1);
    return { ...d, body, grams, length: [...grams.values()].reduce((a, b) => a + b, 0) };
  }),
  ...techniques.map((t) => {
    const text =
      `${t.name}（${t.alias ?? ""}）属于白族扎染技法，防染原理是${t.principle}。` +
      `典型纹样为${t.signature}。可调工艺参数包括${t.params.map((p) => p.label).join("、")}。` +
      `制作步骤：${t.steps.map((s) => s.title).join(" → ")}。`;
    const title = `白族扎染技艺·${t.name}`;
    const tags = [t.name, t.alias ?? "", t.signature, "技法", "捆扎"].filter(Boolean);
    const body = `${title} ${tags.join(" ")} ${text}`;
    const grams = new Map<string, number>();
    for (const g of bigrams(body)) grams.set(g, (grams.get(g) ?? 0) + 1);
    return {
      id: `tech-${t.id}`,
      title,
      source: title,
      tags,
      text,
      body,
      grams,
      length: [...grams.values()].reduce((a, b) => a + b, 0),
    } satisfies Doc;
  }),
  ...patterns.map((p) => {
    const title = `周城扎染纹样志·${p.name}`;
    const text = `${p.name}：${p.meaning} 常见于${p.usage.join("、")}，流传于${p.region}。`;
    const tags = [p.name, "纹样", "寓意", ...p.usage];
    const body = `${title} ${tags.join(" ")} ${text}`;
    const grams = new Map<string, number>();
    for (const g of bigrams(body)) grams.set(g, (grams.get(g) ?? 0) + 1);
    return {
      id: `pat-${p.id}`,
      title,
      source: title,
      tags,
      text,
      body,
      grams,
      length: [...grams.values()].reduce((a, b) => a + b, 0),
    } satisfies Doc;
  }),
];

/** IDF：语料里越少见的 bigram 越有区分度 */
const idf = (() => {
  const df = new Map<string, number>();
  for (const doc of corpus) {
    for (const g of doc.grams.keys()) df.set(g, (df.get(g) ?? 0) + 1);
  }
  const map = new Map<string, number>();
  for (const [g, n] of df) map.set(g, Math.log(1 + corpus.length / (1 + n)));
  return map;
})();

const K1 = 1.4;
const B = 0.72;
const avgLength = corpus.reduce((a, d) => a + d.length, 0) / Math.max(corpus.length, 1);

interface LexicalResult {
  doc: Doc;
  score: number;
  matched: Set<string>;
}

function lexicalSearch(query: string, limit: number): LexicalResult[] {
  const terms = [...new Set(expandQuery(query).flatMap((q) => bigrams(q)))];
  if (!terms.length) return [];
  const lower = query.toLowerCase();

  const results = corpus.map((doc) => {
    let score = 0;
    const matched = new Set<string>();

    for (const term of terms) {
      const tf = doc.grams.get(term) ?? 0;
      if (!tf) continue;
      matched.add(term);
      const weight = idf.get(term) ?? 0.3;
      // BM25 饱和项：词频高但不会无限加分，长文档做长度归一
      score += weight * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avgLength)));
    }

    // 标签与标题命中加权：短问句靠这个准头
    for (const tag of doc.tags) {
      if (tag && lower.includes(tag.toLowerCase())) score += 1.8;
    }
    if (doc.title && lower.includes(doc.title.slice(-3))) score += 0.6;

    return { doc, score, matched };
  });

  return results
    .filter((r) => r.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------- 向量通道（可选） ---------- */

type EmbedCache = { key: string; vectors: number[][] };
const globalCache = globalThis as unknown as { __yunranEmbed?: EmbedCache };

async function embed(texts: string[]): Promise<number[][] | null> {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key || process.env.ENABLE_EMBEDDING === "false") return null;
  const model = process.env.EMBEDDING_MODEL || "text-embedding-v3";

  const cacheKey = `${model}:${corpus.length}`;
  if (globalCache.__yunranEmbed?.key === cacheKey) {
    // 语料向量已缓存，只对问题编码
  }

  try {
    const res = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ model, input: texts, dimensions: 512 }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { embedding: number[]; index: number }[] };
    if (!json.data?.length) return null;
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function vectorSearch(query: string, limit: number): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const cacheKey = `${process.env.EMBEDDING_MODEL || "text-embedding-v3"}:${corpus.length}`;

  if (globalCache.__yunranEmbed?.key !== cacheKey) {
    const docVectors = await embed(corpus.map((d) => d.body));
    if (!docVectors) return out;
    globalCache.__yunranEmbed = { key: cacheKey, vectors: docVectors };
  }

  const [queryVector] = (await embed([query])) ?? [];
  const vectors = globalCache.__yunranEmbed?.vectors;
  if (!queryVector || !vectors) return out;

  corpus.forEach((doc, i) => {
    if (!vectors[i]) return;
    out.set(doc.id, cosine(queryVector, vectors[i]));
  });
  return out;
}

/* ---------- 对外接口 ---------- */

export interface RetrieveResult {
  hits: RetrievalHit[];
  /** 实际生效的召回通道，用于在 UI / 文档里如实标注 */
  mode: "hybrid" | "lexical";
  tookMs: number;
}

export async function retrieve(query: string, topK = 3): Promise<RetrieveResult> {
  const started = Date.now();
  const q = query.trim();
  if (!q) return { hits: [], mode: "lexical", tookMs: 0 };

  const lexical = lexicalSearch(q, Math.max(topK * 3, 8));
  const vectorScores = await vectorSearch(q, topK);

  const pooled = new Map<string, { doc: Doc; score: number; matched: Set<string>; channel: RetrievalHit["channel"] }>();

  for (const r of lexical) {
    pooled.set(r.doc.id, { doc: r.doc, score: r.score, matched: r.matched, channel: "lexical" });
  }

  for (const [id, sim] of vectorScores) {
    const doc = corpus.find((d) => d.id === id);
    if (!doc) continue;
    const existing = pooled.get(id);
    const boost = Math.max(0, sim) * 6;
    if (existing) {
      existing.score += boost;
      existing.channel = "hybrid";
    } else {
      pooled.set(id, { doc, score: boost, matched: new Set(), channel: "vector" });
    }
  }

  const sorted = [...pooled.values()].sort((a, b) => b.score - a.score).slice(0, topK);
  const top = sorted[0]?.score ?? 1;

  const hits: RetrievalHit[] = sorted.map((r) => ({
    id: r.doc.id,
    title: r.doc.title,
    source: r.doc.source,
    snippet: r.doc.text,
    // 归一到 0~1，方便前端展示
    score: Number(Math.min(0.99, r.score / top).toFixed(3)),
    matched: [...r.matched].slice(0, 8),
    channel: r.channel,
  }));

  return {
    hits,
    mode: vectorScores.size > 0 ? "hybrid" : "lexical",
    tookMs: Date.now() - started,
  };
}

/** 拼成给模型的上下文，带编号方便引用 */
export function buildContext(hits: RetrievalHit[]): string {
  if (!hits.length) return "（未检索到相关资料）";
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] 出处：${h.source}\n标题：${h.title}\n内容：${h.snippet}`,
    )
    .join("\n\n");
}
