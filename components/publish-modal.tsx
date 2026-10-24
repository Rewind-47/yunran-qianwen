"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

export interface PublishPayload {
  title: string;
  description: string;
  imageUrl: string;
}

interface PublishModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onPublish: (payload: PublishPayload) => void;
}

export function PublishModal({
  isOpen,
  imageUrl,
  onClose,
  onPublish,
}: PublishModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setPreviewUrl(imageUrl);
    setError("");
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
        setError("");
      } else {
        setError("图片读取失败，请重试。");
      }
    };
    reader.onerror = () => setError("图片读取失败，请重试。");
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("请填写作品标题。");
      return;
    }
    if (!previewUrl) {
      setError("请先选择一张作品图片。");
      return;
    }

    onPublish({
      title: title.trim(),
      description: description.trim(),
      imageUrl: previewUrl,
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
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="待发布作品预览"
                  className="max-h-64 min-h-44 w-full object-contain"
                />
              ) : (
                <div className="grid min-h-44 place-items-center px-5 text-center text-sm text-slate-400">
                  暂无作品图片，请从本地选择一张图片
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-3 right-3 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 text-xs font-medium text-blue-950 shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                重新选择图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-label="选择作品图片"
              />
            </div>
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
            onChange={(event) => setTitle(event.target.value)}
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
              className="h-10 rounded-full bg-blue-900 px-6 text-sm font-medium text-white shadow-md shadow-blue-900/15 transition-colors hover:bg-blue-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              确认发布
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
