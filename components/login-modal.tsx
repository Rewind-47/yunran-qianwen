"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useUserStore } from "@/store/use-user-store";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MockUser {
  username: string;
  password: string | number;
}

type AuthTab = "login" | "register";
type Feedback = { type: "error" | "success"; message: string } | null;

const USERS_STORAGE_KEY = "mock_users";

function readMockUsers(): MockUser[] {
  const rawUsers = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (rawUsers === null) return [];

  const users: unknown = JSON.parse(rawUsers);
  if (
    !Array.isArray(users) ||
    !users.every(
      (user): user is MockUser =>
        typeof user === "object" &&
        user !== null &&
        typeof user.username === "string" &&
        (typeof user.password === "string" ||
          typeof user.password === "number"),
    )
  ) {
    throw new Error("本地账号数据格式异常，请清理 mock_users 后重试。");
  }

  return users;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  if (!isOpen) return null;
  return <LoginModalContent onClose={onClose} />;
}

function LoginModalContent({ onClose }: Pick<LoginModalProps, "onClose">) {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const login = useUserStore((state) => state.login);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  function switchTab(tab: AuthTab) {
    setActiveTab(tab);
    setFeedback(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = username.trim();
    setFeedback(null);

    if (!normalizedUsername) {
      setFeedback({ type: "error", message: "请输入用户名。" });
      return;
    }

    if (activeTab === "register" && password.length < 6) {
      setFeedback({ type: "error", message: "密码长度不能少于 6 位。" });
      return;
    }

    if (activeTab === "register" && password !== confirmPassword) {
      setFeedback({ type: "error", message: "两次输入的密码不一致，请重新确认。" });
      return;
    }

    try {
      const users = readMockUsers();

      if (activeTab === "register") {
        if (users.some((user) => user.username === normalizedUsername)) {
          setFeedback({ type: "error", message: "该用户名已注册，请直接登录。" });
          return;
        }

        users.push({ username: normalizedUsername, password });
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        setUsername(normalizedUsername);
        setPassword("");
        setConfirmPassword("");
        setActiveTab("login");
        setFeedback({ type: "success", message: "注册成功，请使用新账号登录。" });
        return;
      }

      const matchedUser = users.find(
        (user) =>
          user.username === normalizedUsername &&
          String(user.password).trim() === String(password).trim(),
      );
      if (!matchedUser) {
        setFeedback({ type: "error", message: "账号或密码错误。" });
        return;
      }

      login(normalizedUsername);
      onClose();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof SyntaxError
            ? "本地账号数据无法读取，请清理 mock_users 后重试。"
            : error instanceof Error
              ? error.message
              : "本地账号操作失败，请稍后重试。",
      });
    }
  }

  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative my-auto w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_32px_100px_-35px_rgba(15,23,42,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-200 via-blue-900 to-blue-300"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-blue-900/[0.06]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-blue-900/[0.06]"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="关闭登录弹窗"
          className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-2xl leading-none text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/70"
        >
          ×
        </button>

        <div className="relative px-6 pb-7 pt-9 sm:px-10 sm:pb-9 sm:pt-11">
          <div className="mb-7 flex items-center gap-3">
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-blue-900 text-white shadow-lg shadow-blue-900/20">
              <span className="absolute h-7 w-7 rounded-full border border-white/70" />
              <span className="h-3 w-3 rounded-full border border-white/90" />
            </span>
            <div>
              <p className="font-song text-lg font-semibold tracking-[0.12em] text-blue-950">
                云染拾光
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-blue-900/45">
                YUN RAN · TIE-DYE
              </p>
            </div>
          </div>

          <h2
            id="login-modal-title"
            className="font-song text-[27px] font-semibold tracking-wide text-slate-900 sm:text-[30px]"
          >
            {activeTab === "login" ? "欢迎回来" : "开启染艺之旅"}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-500">
            {activeTab === "login"
              ? "登录后继续珍藏灵感，让每一份创作都有迹可循。"
              : "创建一个账号，保存您的扎染创作并分享灵感。"}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="auth-username"
                className="mb-2 block text-xs font-medium tracking-wide text-slate-700"
              >
                用户名
              </label>
              <input
                id="auth-username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-2 block text-xs font-medium tracking-wide text-slate-700"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={activeTab === "register" ? "至少输入 6 位密码" : "请输入密码"}
                  autoComplete={activeTab === "register" ? "new-password" : "current-password"}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="absolute inset-y-0 right-3 px-2 text-xs font-medium text-blue-900/65 transition-colors hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  {showPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </div>

            {activeTab === "register" && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="mb-2 block text-xs font-medium tracking-wide text-slate-700"
                >
                  确认密码
                </label>
                <input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}

            <div className="text-right">
              <button
                type="button"
                onClick={() =>
                  switchTab(activeTab === "login" ? "register" : "login")
                }
                className="text-xs font-medium text-blue-800 transition-colors hover:text-blue-950 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                {activeTab === "login"
                  ? "没有账号？去注册一个"
                  : "已有账号？去登录"}
              </button>
            </div>

            {feedback && (
              <p
                role="alert"
                className={`rounded-xl px-3.5 py-3 text-[13px] leading-5 ${
                  feedback.type === "error"
                    ? "border border-rose-100 bg-rose-50 text-rose-700"
                    : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                }`}
              >
                {feedback.message}
              </p>
            )}

            <button
              type="submit"
              className="group relative mt-1 inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-blue-900 px-5 text-sm font-medium tracking-wide text-white shadow-lg shadow-blue-950/15 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-950 hover:shadow-xl hover:shadow-blue-950/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:translate-y-0"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">
                {activeTab === "login" ? "登录 / 进入拾光" : "创建账号"}
              </span>
              <span aria-hidden className="relative ml-2 text-blue-200">
                →
              </span>
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] tracking-[0.12em] text-slate-400">
              或者
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 h-10 w-full rounded-xl text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            以游客身份浏览
          </button>

          <p className="mt-5 text-center text-[10px] leading-5 text-slate-400">
            一针一线，染出独一无二的时光
          </p>
        </div>
      </section>
    </div>,
    portalRoot,
  );
}
