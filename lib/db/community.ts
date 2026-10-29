"use client";

import { useSyncExternalStore } from "react";

/**
 * 灵感广场的「社交状态」：点赞、收藏、关注、评论、私信。
 *
 * 静态部署没有账号体系，这些交互同样落在本机 localStorage。
 * 用 useSyncExternalStore 做一层极轻量的订阅，让同页的卡片、详情、私信面板
 * 共享同一份状态——点收藏，列表上的星标立刻跟着亮，不用手动刷新。
 */

const KEY_PREFIX = "yunran:community:";

export interface LocalComment {
  id: string;
  text: string;
  at: number;
}

export interface DmMessage {
  id: string;
  from: "me" | "author";
  text: string;
  at: number;
  /** 对方正在输入时的占位 */
  typing?: boolean;
}

export interface CommunityState {
  version: 1;
  liked: string[];
  saved: string[];
  following: string[];
  /** workId → 我发的评论（种子评论在数据层，不混在一起） */
  comments: Record<string, LocalComment[]>;
  /** authorId → 私信会话 */
  dms: Record<string, DmMessage[]>;
}

const EMPTY: CommunityState = {
  version: 1,
  liked: [],
  saved: [],
  following: [],
  comments: {},
  dms: {},
};

const MAX_LIST = 500;
const MAX_DM = 60;

function sanitize(value: unknown): CommunityState {
  if (!value || typeof value !== "object") return { ...EMPTY };
  const raw = value as Partial<CommunityState>;
  const list = (v: unknown, max: number) =>
    Array.isArray(v)
      ? [...new Set(v.filter((x): x is string => typeof x === "string"))].slice(0, max)
      : [];
  const comments: Record<string, LocalComment[]> = {};
  if (raw.comments && typeof raw.comments === "object") {
    for (const [k, v] of Object.entries(raw.comments)) {
      if (!Array.isArray(v)) continue;
      comments[k] = v
        .filter((c): c is LocalComment => Boolean(c) && typeof c.text === "string")
        .slice(-40);
    }
  }
  const dms: Record<string, DmMessage[]> = {};
  if (raw.dms && typeof raw.dms === "object") {
    for (const [k, v] of Object.entries(raw.dms)) {
      if (!Array.isArray(v)) continue;
      dms[k] = v
        .filter((m): m is DmMessage => Boolean(m) && typeof m.text === "string")
        .slice(-MAX_DM);
    }
  }
  return {
    version: 1,
    liked: list(raw.liked, MAX_LIST),
    saved: list(raw.saved, MAX_LIST),
    following: list(raw.following, MAX_LIST),
    comments,
    dms,
  };
}

/* ---------------- 读取 + 订阅 ---------------- */

const cache = new Map<string, { raw: string | null; state: CommunityState }>();

function storageKey(username: string) {
  const normalized = username.trim();
  if (!normalized) throw new Error("社区数据需要有效的登录用户名。");
  return `${KEY_PREFIX}${encodeURIComponent(normalized)}:v1`;
}

export function getCommunitySnapshot(username: string | null): CommunityState {
  if (typeof window === "undefined" || !username) return EMPTY;
  const key = storageKey(username);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  const previous = cache.get(key);
  if (raw === previous?.raw) return previous.state;
  if (!raw) {
    cache.set(key, { raw, state: EMPTY });
    return EMPTY;
  }
  try {
    const state = sanitize(JSON.parse(raw));
    cache.set(key, { raw, state });
    return state;
  } catch {
    cache.set(key, { raw, state: EMPTY });
    return EMPTY;
  }
}

const getEmptySnapshot = () => EMPTY;

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("yunran:community", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("yunran:community", handler);
    window.removeEventListener("storage", handler);
  };
}

/** React 侧读取：可在未授权访问用户社交资产时禁用本地快照读取 */
export function useCommunity(username: string | null): CommunityState {
  return useSyncExternalStore(
    subscribe,
    username ? () => getCommunitySnapshot(username) : getEmptySnapshot,
    getEmptySnapshot,
  );
}

function commit(username: string | null, next: CommunityState): CommunityState {
  if (!username) return EMPTY;
  const key = storageKey(username);
  const raw = JSON.stringify(next);
  cache.set(key, { raw, state: next });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // 隐私模式 / 配额满：本次会话内仍然生效
    }
    window.dispatchEvent(new Event("yunran:community"));
  }
  return next;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ---------------- 动作 ---------------- */

function toggleIn(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}

export function toggleLike(username: string | null, workId: string): CommunityState {
  const s = getCommunitySnapshot(username);
  return commit(username, { ...s, liked: toggleIn(s.liked, workId) });
}

export function toggleSave(username: string | null, workId: string): CommunityState {
  const s = getCommunitySnapshot(username);
  return commit(username, { ...s, saved: toggleIn(s.saved, workId) });
}

export function toggleFollow(username: string | null, authorId: string): CommunityState {
  const s = getCommunitySnapshot(username);
  return commit(username, { ...s, following: toggleIn(s.following, authorId) });
}

export function addWorkComment(username: string | null, workId: string, text: string): CommunityState {
  const clean = text.trim().slice(0, 300);
  if (!clean) return getCommunitySnapshot(username);
  const s = getCommunitySnapshot(username);
  const next = [...(s.comments[workId] ?? []), { id: uid(), text: clean, at: Date.now() }].slice(-40);
  return commit(username, { ...s, comments: { ...s.comments, [workId]: next } });
}

export function sendDirectMessage(username: string | null, authorId: string, text: string): CommunityState {
  const clean = text.trim().slice(0, 500);
  if (!clean) return getCommunitySnapshot(username);
  const s = getCommunitySnapshot(username);
  const list = s.dms[authorId] ?? [];
  const next = [...list, { id: uid(), from: "me" as const, text: clean, at: Date.now() }].slice(-MAX_DM);
  return commit(username, { ...s, dms: { ...s.dms, [authorId]: next } });
}

/** 模拟对方回话（演示数据：不是真人，也不接大模型，纯本地预置话术） */
export function receiveDirectMessage(username: string | null, authorId: string, text: string): CommunityState {
  const s = getCommunitySnapshot(username);
  const list = s.dms[authorId] ?? [];
  const next = [...list, { id: uid(), from: "author" as const, text, at: Date.now() }].slice(-MAX_DM);
  return commit(username, { ...s, dms: { ...s.dms, [authorId]: next } });
}

export function clearConversation(username: string | null, authorId: string): CommunityState {
  const s = getCommunitySnapshot(username);
  const dms = { ...s.dms };
  delete dms[authorId];
  return commit(username, { ...s, dms });
}
