"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { listWorks } from "@/lib/db/works";
import { useUserStore } from "@/store/use-user-store";

export interface PublishPayload {
  title: string;
  description: string;
  imageUrl: string;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (payload: PublishPayload) => void;
}

interface SavedWorkImage {
  id: string;
  imageUrl: string;
}

export function PublishModal({
  isOpen,
  onClose,
  onPublish,
}: PublishModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [works, setWorks] = useState<SavedWorkImage[]>([]);
  const [worksLoadedFor, setWorksLoadedFor] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [error, setError] = useState("");
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const userInfo = useUserStore((state) => state.userInfo);
  const username = isLoggedIn ? userInfo?.username ?? null : null;

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setSelectedImageUrl("");
    setError("");
    if (!username) {
      setWorks([]);
      setWorksLoadedFor(null);
      return;
    }
    try {
      const savedWorks = listWorks(username).flatMap((work) =>
        work.previewImage ? [{ id: work.id, imageUrl: work.previewImage }] : [],
      );
      setWorks(savedWorks);
      setWorksLoadedFor(username);
    } catch (loadError) {
      setWorks([]);
      setWorksLoadedFor(username);
      setError(
        loadError instanceof Error
          ? `读取作品库失败：${loadError.message}`
          : "读取作品库失败，请稍后重试。",
      );
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedImageUrl) {
      setError("请先从我的作品库中选择一张图片。");
      return;
    }
    if (!title.trim()) {
      setError("请填写作品标题。");
      return;
    }

    onPublish({
      title: title.trim(),
      description: description.trim(),
      imageUrl: selectedImageUrl,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        className="relative my-auto w-full max-w-lg overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_32px_100px_-35px_rgba(15,23,42,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-900 to-blue-300" />
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-blue-900/50">
                SHARE YOUR CRAFT
              </p>
              <h2
                id="publish-modal-title"
                className="mt-2 font-song text-2xl font-semibold tracking-wide text-slate-900"
              >
                发布我的创作
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                分享作品与染艺灵感，让更多人看见手作的温度。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭发布弹窗"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-2xl leading-none text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              ×
            </button>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              我的作品库
            </h3>
            {worksLoadedFor !== username ? (
              <p role="status" className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                正在读取作品库…
              </p>
            ) : works.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {works.map((work, index) => {
                  const isSelected = selectedImageUrl === work.imageUrl;
                  return (
                    <button
                      key={`${work.id}-${index}`}
                      type="button"
                      aria-label={`选择作品 ${index + 1}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedImageUrl(work.imageUrl);
                        setError("");
                      }}
                      className={`group aspect-square overflow-hidden rounded-xl border-2 bg-slate-100 transition hover:scale-[1.02] hover:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                        isSelected
                          ? "border-blue-700 ring-2 ring-blue-200"
                          : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={work.imageUrl}
                        alt={`我的作品 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm text-slate-500">
                  您还没有保存过作品，请先去工坊创作吧
                </p>
                <Link
                  href="/studio/personal"
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-blue-900 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-950"
                >
                  去创作工坊
                </Link>
              </div>
            )}
          </div>

          <label
            htmlFor="publish-title"
            className="mb-2 mt-5 block text-xs font-medium text-slate-700"
          >
            作品标题
          </label>
          <input
            id="publish-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            maxLength={60}
            placeholder="给这件作品起个名字"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          <label
            htmlFor="publish-description"
            className="mb-2 mt-4 block text-xs font-medium text-slate-700"
          >
            作品描述
          </label>
          <textarea
            id="publish-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="记录创作灵感、使用的工艺或想分享的故事……"
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          {error && (
            <p role="alert" className="mt-3 text-xs text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-full border border-slate-200 px-5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedImageUrl || !title.trim()}
              className="h-10 rounded-full bg-blue-900 px-6 text-sm font-medium text-white shadow-md shadow-blue-900/15 transition-colors hover:bg-blue-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              确认发布
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
