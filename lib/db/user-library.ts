"use client";

/**
 * 本地用户库：收藏、最近使用、取色历史。
 *
 * 静态部署没有服务端数据库，这些「只属于这台设备」的数据放 localStorage 最合适：
 * 不涉及账号，不会因为刷新丢失，也不会把用户的配色传到任何地方。
 * 结构带 version，字段变化时可以直接丢弃旧数据而不是崩掉。
 */

const KEY_PREFIX = "yunran:style-library:";

export interface UserStyleLibrary {
  version: 1;
  favorites: string[];
  recent: string[];
  colors: string[];
}

const EMPTY: UserStyleLibrary = { version: 1, favorites: [], recent: [], colors: [] };

const MAX_RECENT = 8;
const MAX_COLORS = 6;

function storageKey(username: string) {
  const normalized = username.trim();
  if (!normalized) throw new Error("用户库需要有效的登录用户名。");
  return `${KEY_PREFIX}${encodeURIComponent(normalized)}:v1`;
}

function sanitize(value: unknown): UserStyleLibrary {
  if (!value || typeof value !== "object") return { ...EMPTY };
  const raw = value as Partial<UserStyleLibrary>;
  const list = (v: unknown, max: number) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))].slice(0, max) : [];
  return {
    version: 1,
    favorites: list(raw.favorites, 200),
    recent: list(raw.recent, MAX_RECENT),
    colors: list(raw.colors, MAX_COLORS),
  };
}

export function readLibrary(username: string | null): UserStyleLibrary {
  if (typeof window === "undefined" || !username) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(storageKey(username));
    return raw ? sanitize(JSON.parse(raw)) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function writeLibrary(
  username: string | null,
  next: UserStyleLibrary,
): UserStyleLibrary {
  if (!username) return { ...EMPTY };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(username), JSON.stringify(next));
    } catch {
      // 隐私模式 / 配额满：功能降级为「本次会话有效」，不打断创作
    }
  }
  return next;
}

export function toggleFavorite(username: string | null, id: string): UserStyleLibrary {
  const lib = readLibrary(username);
  const favorites = lib.favorites.includes(id)
    ? lib.favorites.filter((x) => x !== id)
    : [id, ...lib.favorites];
  return writeLibrary(username, { ...lib, favorites });
}

export function rememberStyle(username: string | null, id: string): UserStyleLibrary {
  const lib = readLibrary(username);
  const recent = [id, ...lib.recent.filter((x) => x !== id)].slice(0, MAX_RECENT);
  return writeLibrary(username, { ...lib, recent });
}

export function rememberColor(username: string | null, hex: string): UserStyleLibrary {
  const lib = readLibrary(username);
  const color = hex.toUpperCase();
  const colors = [color, ...lib.colors.filter((x) => x !== color)].slice(0, MAX_COLORS);
  return writeLibrary(username, { ...lib, colors });
}

export function clearLibrary(username: string | null): UserStyleLibrary {
  return writeLibrary(username, { ...EMPTY });
}
