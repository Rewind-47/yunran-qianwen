"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Heart,
  LockKeyhole,
  Pencil,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { GarmentShot } from "@/components/garment-shot";
import { WorkPoster } from "@/components/work-poster";
import { AuthorAvatar } from "@/components/author-avatar";
import { SectionHeading } from "@/components/section-heading";
import { techniqueMap, techniqueCategories } from "@/lib/data/techniques";
import { styleMap } from "@/lib/data/styles";
import {
  communityAuthorMap,
  communityWorkMap,
  type CommunityWork,
} from "@/lib/data/community";
import { toggleSave, toggleFollow, useCommunity } from "@/lib/db/community";
import {
  embroideryPatternMap,
  embroideryPatterns,
  stitchLayouts,
} from "@/lib/data/embroidery";
import { listWorks, removeWork, type SavedWork } from "@/lib/db/works";
import { listSketches, removeSketch, type SavedSketch } from "@/lib/db/sketches";
import { useStudioStore } from "@/store/studio";
import { useUserStore } from "@/store/use-user-store";
import type { Technique } from "@/lib/types";

/**
 * 「我的」页面：本地成品、手绘稿与收藏的广场作品。
 *
 * 没有账号体系（静态部署），这些数据都属于当前设备：
 * - 我制作的成品：工坊里点「保存成品」存下的设计快照，用同一套渲染器复现成品图；
 */

const familyLabel = (category: string) =>
  techniqueCategories.find((c) => c.id === category)?.label ?? category;

type PrivacySettings = {
  publicWorks: boolean;
  publicFavorites: boolean;
  activityNotifications: boolean;
};

const defaultPrivacySettings: PrivacySettings = {
  publicWorks: true,
  publicFavorites: true,
  activityNotifications: false,
};

const privacyOptions: {
  key: keyof PrivacySettings;
  title: string;
  description: string;
}[] = [
  {
    key: "publicWorks",
    title: "公开我的作品",
    description: "允许其他人浏览你发布的作品。",
  },
  {
    key: "publicFavorites",
    title: "允许陌生人查看我的收藏",
    description: "让其他人看到你收藏的作品。",
  },
  {
    key: "activityNotifications",
    title: "接收点赞和评论通知",
    description: "接收作品互动的消息提醒。",
  },
];

function isPrivacySettings(value: unknown): value is PrivacySettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "publicWorks" in value &&
    typeof value.publicWorks === "boolean" &&
    "publicFavorites" in value &&
    typeof value.publicFavorites === "boolean" &&
    "activityNotifications" in value &&
    typeof value.activityNotifications === "boolean"
  );
}

const PRIVACY_SETTINGS_KEY = "my-page-privacy-settings";

function timeLabel(ts: number) {
  try {
    return new Date(ts).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** 从快照还原出与工坊一致的 Technique（调色 + 刺绣题材三件套） */
function workTechnique(work: SavedWork): Technique | undefined {
  const base = techniqueMap[work.techniqueId];
  if (!base) return undefined;
  const palette = work.palette.length === 3 ? work.palette : base.palette;
  if (base.category !== "embroider") {
    return { ...base, palette };
  }
  const patternId =
    work.patternId && work.patternId in embroideryPatternMap
      ? work.patternId
      : embroideryPatterns[0].id;
  const layout =
    stitchLayouts.find((l) => l.id === work.layout)?.id ?? stitchLayouts[0].id;
  return {
    ...base,
    palette,
    pattern: patternId as typeof embroideryPatterns[number]["id"],
    layout,
    motifScale: work.motifScale ?? 1,
  };
}

function LoginRequiredCard({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/50 px-6 py-14 text-center shadow-[0_16px_40px_-34px_rgba(16,31,47,0.5)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-dye-900/5 text-dye-700">
        <LockKeyhole aria-hidden="true" size={21} strokeWidth={1.7} />
      </div>
      <p className="mt-4 font-song text-base font-semibold text-dye-900">
        登录后即可查看您的专属资产
      </p>
      <p className="mt-2 text-[11.5px] text-dye-800/45">
        登录以解锁您的作品库、手绘图案与收藏。
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="btn-dye mt-5 rounded-full px-6 py-2.5 text-[12.5px] text-cloth-50"
      >
        立即登录
      </button>
    </div>
  );
}

export function MyPage() {
  const [mounted, setMounted] = useState(false);
  const [assetsLoadedFor, setAssetsLoadedFor] = useState<string | null>(null);
  const [works, setWorks] = useState<SavedWork[]>([]);
  const [sketches, setSketches] = useState<SavedSketch[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [socialList, setSocialList] = useState<"following" | "followers" | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    defaultPrivacySettings,
  );
  const [privacyError, setPrivacyError] = useState("");
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const openLoginModal = useUserStore((state) => state.openLoginModal);
  const userInfo = useUserStore((state) => state.userInfo);
  const updateUsername = useUserStore((state) => state.updateUsername);
  const setCustomSketch = useStudioStore((s) => s.setCustomSketch);
  const router = useRouter();
  const username = isLoggedIn ? userInfo?.username ?? null : null;

  useEffect(() => {
    setWorks(username ? listWorks(username) : []);
    setSketches(username ? listSketches(username) : []);
    setAssetsLoadedFor(username);
    setMounted(true);
  }, [username]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!isPrivacySettings(parsed)) {
          throw new Error("隐私设置数据格式异常，已恢复默认选项。");
        }
        setPrivacySettings(parsed);
      }
    } catch (error) {
      setFeedback({
        title: "隐私设置",
        message:
          error instanceof Error
            ? error.message
            : "读取隐私设置失败，请检查浏览器本地存储。",
      });
    } finally {
      setPrivacyLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!privacyLoaded) return;
    try {
      window.localStorage.setItem(
        PRIVACY_SETTINGS_KEY,
        JSON.stringify(privacySettings),
      );
      setPrivacyError("");
    } catch {
      setPrivacyError("保存失败：浏览器本地存储不可用。");
    }
  }, [privacyLoaded, privacySettings]);

  useEffect(() => {
    if (!profileOpen && !feedback && !socialList && !privacyOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setFeedback(null);
        setSocialList(null);
        setPrivacyOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [profileOpen, feedback, socialList, privacyOpen]);

  /** 把手绘图稿贴到工坊的坯布上 */
  function applySketch(sketch: SavedSketch) {
    setCustomSketch({ id: sketch.id, dataUrl: sketch.dataUrl, name: `手绘 · ${sketch.techniqueName}` });
    const category = techniqueMap[sketch.techniqueId]?.category ?? "tie";
    router.push(`/studio/personal/${category}`);
  }

  const community = useCommunity(username);

  const savedWorks = useMemo(
    () => username
      ? community.saved
        .map((id) => communityWorkMap[id])
        .filter((w): w is CommunityWork => Boolean(w))
      : [],
    [community.saved, username],
  );

  const followedAuthors = useMemo(
    () => username
      ? community.following.map((id) => communityAuthorMap[id]).filter(Boolean)
      : [],
    [community.following, username],
  );

  const saved = username ? works.filter((w) => workTechnique(w)) : [];

  function openProfileEditor() {
    setUsernameInput(userInfo?.username ?? "");
    setProfileError("");
    setProfileOpen(true);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = usernameInput.trim();
    if (!username) {
      setProfileError("昵称不能为空。");
      return;
    }
    updateUsername(username);
    setProfileOpen(false);
  }

  function openSocialList(type: "following" | "followers") {
    setSocialList(type);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="MY STUDIO"
        title="我的"
        description="管理个人资料，继续整理你的创作与灵感收藏。"
      />

      <section className="mt-8 rounded-card border border-dye-900/10 bg-white/60 p-5 shadow-[0_16px_40px_-34px_rgba(16,31,47,0.5)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-dye-700 to-dye-950 text-xl font-medium text-cloth-50 ring-4 ring-dye-900/5">
              {userInfo?.avatar ? (
                <Image
                  src={userInfo.avatar}
                  alt={`${userInfo.username}的头像`}
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                (userInfo?.username.trim().charAt(0) || "访")
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.16em] text-dye-800/45">个人资料</p>
              <h2 className="mt-1 truncate font-song text-[22px] text-dye-950">
                {userInfo?.username || "访客"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={openProfileEditor}
            className="inline-flex items-center gap-2 rounded-full border border-dye-900/15 bg-white/75 px-4 py-2 text-[12.5px] text-dye-800 transition-colors hover:border-dye-700/35 hover:bg-white"
          >
            <Pencil aria-hidden="true" size={14} />
            编辑资料
          </button>
        </div>

        <div className="mt-6 flex items-center justify-around gap-3 border-t border-dye-900/10 pt-4">
          {[
            { label: "关注", Icon: UsersRound, action: () => openSocialList("following") },
            { label: "粉丝", Icon: UserRound, action: () => openSocialList("followers") },
          ].map(({ label, Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] text-dye-800/75 transition-colors hover:bg-dye-900/5 hover:text-dye-950"
            >
              <Icon aria-hidden="true" size={16} strokeWidth={1.7} />
              <span>{label} 0</span>
            </button>
          ))}
          <div
            aria-label="获赞 0"
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] text-rose-600"
          >
            <Heart aria-hidden="true" size={16} strokeWidth={1.7} className="fill-rose-600" />
            <span>获赞 0</span>
          </div>
        </div>
      </section>

      {/* ---------------- 我制作的成品 ---------------- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我制作的成品</h2>
          <p className="text-[11.5px] text-dye-800/45">
            在工坊 3D 预览右上角点「保存成品」，就能把当前设计存到这里
          </p>
        </div>

        {!mounted || assetsLoadedFor !== username ? (
          <div className="mt-5 h-40 rounded-card border border-dye-900/10 bg-white/40" />
        ) : !isLoggedIn ? (
          <LoginRequiredCard onLogin={openLoginModal} />
        ) : saved.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-14 text-center">
            <p className="text-[13px] text-dye-800/60">还没有保存的成品</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去个性工坊挑一款坯布、选一门工艺、调好颜色，然后点 3D
              预览右上角的「保存成品」——做好的设计会出现在这里。
            </p>
            <Link
              href="/studio/personal"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去工坊创作 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((work) => {
              const style = styleMap[work.styleId];
              const technique = workTechnique(work)!;
              return (
                <article
                  key={work.id}
                  className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60 transition-shadow duration-500 hover:shadow-[0_18px_44px_-30px_rgba(16,31,47,0.5)]"
                >
                  <div className="relative aspect-[4/3] bg-[#F6F5F1]">
                    {work.previewImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={work.previewImage}
                        alt={`${style?.name ?? "扎染作品"} 3D 成品预览`}
                        className="h-full w-full object-contain"
                      />
                    ) : style ? (
                      <GarmentShot
                        style={style}
                        technique={technique}
                        params={work.params}
                        seed={work.seed || style.id}
                        dye={!work.paint}
                        paintUrl={work.paint}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[11px] text-dye-800/35">
                        款式已下架
                      </div>
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-dye-950/60 px-2 py-0.5 text-[9.5px] tracking-wide text-cloth-50/90 backdrop-blur-sm">
                      {familyLabel(technique.category)}
                    </span>
                  </div>
                  <div className="border-t border-dye-900/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] text-dye-900">
                        {style?.name ?? work.styleId}
                        <span className="ml-2 text-[10.5px] text-dye-800/45">
                          {technique.name}
                        </span>
                      </p>
                      <span className="shrink-0 font-mono text-[9.5px] text-dye-800/30">
                        {timeLabel(work.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {technique.palette.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-dye-900/15"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/studio/personal/${technique.category}?workId=${encodeURIComponent(work.id)}`}
                          className="text-[10.5px] text-dye-700/70 underline-offset-2 hover:text-dye-900 hover:underline"
                        >
                          继续调整
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            username &&
                            setWorks(removeWork(username, work.id))
                          }
                          className="text-[10.5px] text-madder-500/80 underline-offset-2 hover:text-madder-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- 我的手绘图案 ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我的手绘图案</h2>
          <p className="text-[11.5px] text-dye-800/45">
            在随心点染的白纸上画的稿子，可以随时贴到工坊的坯布上
          </p>
        </div>

        {!mounted || assetsLoadedFor !== username ? (
          <div className="mt-5 h-40 rounded-card border border-dye-900/10 bg-white/40" />
        ) : !isLoggedIn ? (
          <LoginRequiredCard onLogin={openLoginModal} />
        ) : sketches.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-12 text-center">
            <p className="text-[13px] text-dye-800/60">还没有手绘图稿</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去随心点染选一门扎染手艺，在白纸上勾几笔——画完点「保存到我的」，
              画稿就会出现在这里，随时可以应用到实物。
            </p>
            <Link
              href="/studio/personal/tie#inpaint"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去画一张 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sketches.map((sketch) => (
              <article
                key={sketch.id}
                className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60"
              >
                <div className="relative aspect-[4/3] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sketch.dataUrl}
                    alt={`手绘图稿 · ${sketch.techniqueName}`}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-dye-950/60 px-2 py-0.5 text-[9.5px] tracking-wide text-cloth-50/90 backdrop-blur-sm">
                    手绘 · {sketch.techniqueName}
                  </span>
                </div>
                <div className="border-t border-dye-900/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] text-dye-800/30">
                      {timeLabel(sketch.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        username &&
                        setSketches(removeSketch(username, sketch.id))
                      }
                      className="text-[10.5px] text-madder-500/80 underline-offset-2 hover:text-madder-500 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-dye-800/45">
                      透明底笔稿 · 可反复应用
                    </span>
                    <button
                      type="button"
                      onClick={() => applySketch(sketch)}
                      className="text-[10.5px] text-dye-700/80 underline-offset-2 hover:text-dye-900 hover:underline"
                    >
                      应用到实物 →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- 我收藏的广场作品 ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我收藏的作品</h2>
          <p className="text-[11.5px] text-dye-800/45">
            灵感广场里点作品右上角的星标，会把成品连同参数一起收进这里
          </p>
        </div>

        {!isLoggedIn ? (
          <LoginRequiredCard onLogin={openLoginModal} />
        ) : savedWorks.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-12 text-center">
            <p className="text-[13px] text-dye-800/60">还没有收藏广场作品</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去灵感广场逛一圈，看到喜欢的成品点右上角的 ☆，它的扎法、参数、配色都会留在这里，
              方便回头照着染一遍。
            </p>
            <Link
              href="/inspiration"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去灵感广场 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedWorks.map((work) => {
              const author = communityAuthorMap[work.authorId];
              return (
                <article
                  key={work.id}
                  className="group relative overflow-hidden rounded-card border border-dye-900/10 bg-white/60"
                >
                  <div className="relative aspect-[4/3] bg-[#F4F2EC]">
                    <WorkPoster work={work} />
                    <Link
                      href={`/inspiration/${work.id}`}
                      aria-label={`查看 ${work.title}`}
                      className="absolute inset-0"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSave(username, work.id)}
                      aria-label={`取消收藏 ${work.title}`}
                      className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-[12px] text-dye-900 shadow-sm transition-colors hover:bg-white"
                    >
                      ★
                    </button>
                  </div>
                  <div className="border-t border-dye-900/10 px-4 py-3">
                    <p className="truncate text-[13px] text-dye-900">{work.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10.5px] text-dye-800/45">
                        {author && <AuthorAvatar author={author} size={16} />}
                        {author?.name ?? "作者"}
                      </span>
                      <Link
                        href={`/inspiration/${work.id}`}
                        className="text-[10.5px] text-dye-700/70 underline-offset-2 hover:text-dye-900 hover:underline"
                      >
                        看手记与评论 →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {followedAuthors.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] tracking-[0.14em] text-dye-800/35">
              关注的创作者
            </span>
            {followedAuthors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleFollow(username, a.id)}
                title="点击取消关注"
                className="group flex items-center gap-1.5 rounded-full border border-dye-900/12 bg-white/60 py-1 pl-1 pr-2.5 text-[11.5px] text-dye-800/65 transition-colors hover:border-madder-500/35 hover:text-madder-500"
              >
                <AuthorAvatar author={a} size={20} />
                {a.name}
                <span className="text-[10px] text-dye-800/25 group-hover:text-madder-500/70">
                  ✕
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 border-t border-dye-900/10 pt-6">
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-dye-900/15 bg-white/60 px-4 py-2.5 text-[12.5px] text-dye-800/75 transition-colors hover:bg-white hover:text-dye-950"
        >
          <LockKeyhole aria-hidden="true" size={15} />
          隐私设置
        </button>
      </section>

      <p className="mt-10 border-t border-dye-900/10 pt-4 text-[11px] leading-relaxed text-dye-800/40">
        成品与收藏保存在本机浏览器（localStorage），不会上传到任何服务器；清除浏览器数据会一并清空。
      </p>

      {socialList && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-dye-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSocialList(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-list-title"
            className="w-full max-w-lg rounded-2xl border border-white/70 bg-cloth-50 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="social-list-title" className="font-song text-xl text-dye-950">
                  {socialList === "following" ? "我关注的人" : "我的粉丝"}
                </h2>
                <p className="mt-1 text-[12px] text-dye-800/55">
                  {socialList === "following" ? "这些创作者带来新的灵感。" : "认识关注你的创作者。"}
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setSocialList(null)}
                className="rounded-full p-1.5 text-dye-800/55 transition-colors hover:bg-dye-900/5 hover:text-dye-950"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-dye-900/15 bg-white/55 px-4 py-10 text-center">
              <p className="text-[13px] text-dye-800/65">
                {socialList === "following" ? "暂无关注" : "暂无粉丝"}
              </p>
            </div>
          </section>
        </div>
      )}

      {profileOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-dye-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="w-full max-w-md rounded-2xl border border-white/70 bg-cloth-50 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-dialog-title" className="font-song text-xl text-dye-950">
                  编辑资料
                </h2>
                <p className="mt-1 text-[12px] text-dye-800/55">修改后会同步更新你的昵称。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setProfileOpen(false)}
                className="rounded-full p-1.5 text-dye-800/55 transition-colors hover:bg-dye-900/5 hover:text-dye-950"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <form onSubmit={saveProfile} className="mt-5">
              <label htmlFor="profile-username" className="text-[12px] text-dye-800/70">
                用户名称
              </label>
              <input
                id="profile-username"
                value={usernameInput}
                onChange={(event) => {
                  setUsernameInput(event.target.value);
                  setProfileError("");
                }}
                maxLength={30}
                required
                autoFocus
                className="mt-2 w-full rounded-xl border border-dye-900/15 bg-white px-3.5 py-3 text-[14px] text-dye-950 outline-none transition focus:border-dye-700/45 focus:ring-2 focus:ring-dye-700/10"
              />
              {profileError && (
                <p role="alert" className="mt-2 text-[12px] text-madder-500">
                  {profileError}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="rounded-full px-4 py-2 text-[12.5px] text-dye-800/65 transition-colors hover:bg-dye-900/5"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-dye-800 px-5 py-2 text-[12.5px] text-cloth-50 transition-colors hover:bg-dye-950"
                >
                  保存
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {privacyOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-dye-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPrivacyOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-white/70 bg-cloth-50 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="privacy-dialog-title" className="font-song text-xl text-dye-950">
                  隐私设置
                </h2>
                <p className="mt-1 text-[12px] text-dye-800/55">设置会保存在此浏览器中。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-full p-1.5 text-dye-800/55 transition-colors hover:bg-dye-900/5 hover:text-dye-950"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="mt-5 divide-y divide-dye-900/10">
              {privacyOptions.map(({ key: settingKey, title, description }) => {
                const enabled = privacySettings[settingKey];
                return (
                  <div key={key} className="flex items-center justify-between gap-4 py-4">
                    <span className="min-w-0">
                      <span className="block text-[13px] text-dye-950">{title}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-dye-800/55">
                        {description}
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={title}
                      onClick={() =>
                        setPrivacySettings((current) => ({
                          ...current,
                          [settingKey]: !current[settingKey],
                        }))
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dye-700 ${
                        enabled ? "bg-dye-700" : "bg-dye-900/20"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            {privacyError && (
              <p role="alert" className="mt-2 text-[12px] text-madder-500">
                {privacyError}
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-full bg-dye-800 px-5 py-2 text-[12.5px] text-cloth-50 transition-colors hover:bg-dye-950"
              >
                完成
              </button>
            </div>
          </section>
        </div>
      )}

      {feedback && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-dye-950/35 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFeedback(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-feedback-title"
            className="w-full max-w-sm rounded-2xl border border-white/70 bg-cloth-50 p-6 text-center shadow-2xl"
          >
            <h2 id="profile-feedback-title" className="font-song text-xl text-dye-950">
              {feedback.title}
            </h2>
            <p className="mt-3 text-[13px] text-dye-800/65">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="mt-5 rounded-full bg-dye-800 px-5 py-2 text-[12.5px] text-cloth-50 transition-colors hover:bg-dye-950"
            >
              知道了
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
