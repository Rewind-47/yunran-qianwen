import {
  styleCategories,
  styleCounts,
  styles,
  stylesByCategory,
  type Style,
  type StyleCategory,
} from "@/lib/data/styles";
import type { CarrierId } from "@/lib/data/carriers";

/**
 * 本地款式库（Style DB）。
 *
 * 没有后端也能有「数据库」的样子：种子数据来自 lib/data/styles.ts，
 * 这里在模块加载时一次性建好四张索引（品类、版型、标签、检索），
 * 上层 UI 只查索引，不遍历全表。
 *
 * 选这种实现的原因：
 *   1. 纯静态部署也能跑，不需要数据库服务；
 *   2. 查询接口与真实数据库一致（query/get/limit/offset/sort），
 *      以后换 SQLite / Supabase 时只替换这一层，页面不用动；
 *   3. 300 条数据全量驻留内存约几十 KB，比一次网络请求还便宜。
 */

export interface StyleQuery {
  category?: StyleCategory;
  /** 关键词：中文名、英文名、标签都参与匹配 */
  q?: string;
  /** 标签过滤，取交集 */
  tags?: string[];
  /** 版型过滤 */
  model?: CarrierId;
  sort?: "hot" | "name" | "new";
  limit?: number;
  offset?: number;
}

export interface StyleTag {
  tag: string;
  count: number;
}

/* ---------------- 索引 ---------------- */

const tagIndex = new Map<string, Map<string, number>>();

for (const category of styleCategories) {
  const counter = new Map<string, number>();
  for (const style of stylesByCategory[category.id]) {
    for (const tag of style.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }
  tagIndex.set(category.id, counter);
}

const modelIndex = new Map<string, Style[]>();
for (const style of styles) {
  const list = modelIndex.get(style.model) ?? [];
  list.push(style);
  modelIndex.set(style.model, list);
}

/** 预先拼好的检索串，避免每次查询重复拼接 */
const searchIndex = styles.map((style) => ({
  style,
  haystack: `${style.name} ${style.en} ${style.tags.join(" ")} ${style.id}`.toLowerCase(),
}));

/* ---------------- 查询 ---------------- */

function matchScore(style: Style, keyword: string): number {
  const k = keyword.toLowerCase();
  if (style.name.toLowerCase() === k || style.en.toLowerCase() === k) return 100;
  if (style.name.toLowerCase().startsWith(k)) return 80;
  if (style.name.toLowerCase().includes(k)) return 60;
  if (style.tags.some((t) => t.toLowerCase().includes(k))) return 30;
  if (style.en.toLowerCase().includes(k)) return 20;
  return 0;
}

export const styleDb = {
  /** 库的版本号：数据 schema 变了就 +1，配合本地存储做迁移 */
  version: 1,

  size: styles.length,

  categories: styleCategories,

  counts: styleCounts,

  /** 全表（只读，别在 UI 里改） */
  all(): readonly Style[] {
    return styles;
  },

  get(id: string | undefined): Style | undefined {
    if (!id) return undefined;
    return styles.find((s) => s.id === id);
  },

  byCategory(category: StyleCategory): readonly Style[] {
    return stylesByCategory[category] ?? [];
  },

  byModel(model: CarrierId): readonly Style[] {
    return modelIndex.get(model) ?? [];
  },

  /**
   * 精选款：工坊的「选款式」区只展示这些款式。
   * 全库仍有 300 余款，检索、作品引用走 query / get。
   */
  featured(category?: StyleCategory): Style[] {
    const pool = category ? (stylesByCategory[category] ?? []) : styles;
    return pool.filter((s) => s.featured);
  },

  featuredCount(category?: StyleCategory): number {
    return styleDb.featured(category).length;
  },

  tags(category?: StyleCategory): StyleTag[] {
    const counter = new Map<string, number>();
    const pool = category ? stylesByCategory[category] : styles;
    if (category && tagIndex.has(category)) {
      for (const [tag, count] of tagIndex.get(category)!) counter.set(tag, count);
    } else {
      for (const style of pool) {
        for (const tag of style.tags) counter.set(tag, (counter.get(tag) ?? 0) + 1);
      }
    }
    return [...counter.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  },

  query(params: StyleQuery = {}): Style[] {
    const { category, q, tags, model, sort = "hot", limit, offset = 0 } = params;
    const keyword = q?.trim().toLowerCase() ?? "";

    let rows: { style: Style; score: number }[] = searchIndex
      .filter(({ style }) => (category ? style.category === category : true))
      .filter(({ style }) => (model ? style.model === model : true))
      .filter(({ style }) => (tags && tags.length ? tags.every((t) => style.tags.includes(t)) : true))
      .map(({ style, haystack }) => ({
        style,
        score: keyword ? (haystack.includes(keyword) ? matchScore(style, keyword) || 10 : 0) : 0,
      }))
      .filter((row) => (keyword ? row.score > 0 : true));

    rows.sort((a, b) => {
      if (keyword && b.score !== a.score) return b.score - a.score;
      if (sort === "name") return a.style.name.localeCompare(b.style.name, "zh-Hans-CN");
      if (sort === "new") return b.style.id.localeCompare(a.style.id);
      return b.style.hot - a.style.hot;
    });

    const sliced = rows.slice(offset, limit ? offset + limit : undefined);
    return sliced.map((row) => row.style);
  },

  /** 同类推荐：优先同标签，排除自身 */
  related(id: string, limit = 4): Style[] {
    const base = styleDb.get(id);
    if (!base) return [];
    return styles
      .filter((s) => s.id !== id && s.category === base.category)
      .map((s) => ({
        style: s,
        score: s.tags.filter((t) => base.tags.includes(t)).length * 10 + s.hot / 100,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.style);
  },

  /** 库统计，展示在界面上：品类数 / 款式总数 / 标签数 / 版型数 */
  stats() {
    return {
      categories: styleCategories.length,
      styles: styles.length,
      tags: styleDb.tags().length,
      models: modelIndex.size,
      featured: styles.filter((s) => s.featured).length,
    };
  },
};

export type { Style, StyleCategory };
