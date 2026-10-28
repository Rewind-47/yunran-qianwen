"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function CarrierSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const lastTimeUpdateRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);

  useEffect(() => {
    const textContainer = textRef.current;
    if (!textContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTextVisible(entry.isIntersecting);
      },
      { threshold: 0.3 },
    );

    observer.observe(textContainer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncTime = (force = false) => {
      const now = performance.now();
      if (!force && now - lastTimeUpdateRef.current < 250) return;

      lastTimeUpdateRef.current = now;
      setCurrentTime(video.currentTime);
    };
    const handleTimeUpdate = () => syncTime();
    const handleSeeked = () => syncTime(true);
    const syncDuration = () =>
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const syncPlayback = () => setIsPlaying(!video.paused);
    const syncMuted = () => setIsMuted(video.muted);
    const syncVolume = () => setVolume(video.volume);
    const handleError = () =>
      setPlaybackError("视频加载失败，请检查视频文件是否存在。");

    syncTime(true);
    syncDuration();
    syncPlayback();
    syncMuted();
    syncVolume();

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("play", syncPlayback);
    video.addEventListener("pause", syncPlayback);
    video.addEventListener("ended", syncPlayback);
    video.addEventListener("volumechange", syncMuted);
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("play", syncPlayback);
      video.removeEventListener("pause", syncPlayback);
      video.removeEventListener("ended", syncPlayback);
      video.removeEventListener("volumechange", syncMuted);
      video.removeEventListener("volumechange", syncVolume);
      video.removeEventListener("error", handleError);
    };
  }, []);

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video
        .play()
        .then(() => setPlaybackError(""))
        .catch(() => setPlaybackError("视频暂时无法播放，请检查视频文件。"));
    } else {
      video.pause();
    }
  }

  function seekVideo(value: string) {
    const nextTime = Number(value);
    const video = videoRef.current;
    if (!video || !Number.isFinite(nextTime)) return;

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    lastTimeUpdateRef.current = performance.now();
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      if (video.volume === 0) {
        video.volume = 0.8;
        setVolume(video.volume);
      }
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }

  function changeVolume(value: string) {
    const nextVolume = Number(value);
    const video = videoRef.current;
    if (!video || !Number.isFinite(nextVolume)) return;

    video.volume = Math.min(1, Math.max(0, nextVolume));
    setVolume(video.volume);

    const nextMuted = video.volume === 0;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  return (
    <section
      id="carrier"
      className="relative flex h-screen w-full snap-always snap-start items-center justify-center overflow-hidden bg-dye-950 py-8 md:py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 dye-blot opacity-75"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:repeating-linear-gradient(0deg,rgba(201,219,233,0.09)_0px,rgba(201,219,233,0.09)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(90deg,rgba(201,219,233,0.06)_0px,rgba(201,219,233,0.06)_1px,transparent_1px,transparent_5px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cloth-100/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cloth-100/20 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="grid w-full items-center gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,13fr)] md:gap-12">
          <div
            ref={textRef}
            className={`min-w-0 transition-all duration-1000 ease-out ${
              isTextVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <p className="eyebrow text-[9px] text-cloth-100/45">
              From Craft to Creation
            </p>
            <h2 className="title-brush mt-5 text-[30px] leading-[1.4] tracking-[0.04em] text-cloth-50 sm:text-[36px]">
              看懂之后，动手做一块
            </h2>
            <p className="mt-4 text-[14px] leading-[1.9] text-cloth-100/65 sm:text-[15px]">
              从扎结到浸染，每一块布都有它的脾气。
            </p>
            <Link
              href="/studio"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-cloth-50 px-7 text-[13px] tracking-[0.12em] text-dye-950 shadow-lg transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cloth-50"
            >
              去创作工坊
            </Link>
          </div>

          <div
            className="relative aspect-video min-w-0 overflow-hidden rounded-2xl bg-[#0a192f] shadow-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <video
              ref={videoRef}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              src="/videos/dye-process.mp4"
              aria-label="扎染工艺展示视频"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div
              className={`absolute inset-x-3 bottom-3 rounded-xl bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-cloth-50 shadow-lg backdrop-blur-[2px] transition-opacity duration-300 sm:inset-x-5 sm:bottom-4 sm:px-4 ${
                isHovered
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isPlaying ? "暂停视频" : "播放视频"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cloth-50/10 text-cloth-50 transition-colors hover:bg-cloth-50/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cloth-50"
                >
                  {isPlaying ? (
                    <Pause aria-hidden="true" size={18} fill="currentColor" />
                  ) : (
                    <Play aria-hidden="true" size={18} fill="currentColor" />
                  )}
                </button>

                <span className="figure w-[76px] shrink-0 text-[10px] tabular-nums text-cloth-100/75 sm:w-[88px] sm:text-[11px]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seekVideo(event.target.value)}
                  aria-label="视频播放进度"
                  aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
                  className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-cloth-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cloth-50 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cloth-50 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cloth-50"
                  style={{
                    background: `linear-gradient(to right, rgba(251,248,241,0.95) ${progress}%, rgba(251,248,241,0.28) ${progress}%)`,
                  }}
                />

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "打开声音" : "静音"}
                  aria-pressed={!isMuted}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cloth-50/10 text-cloth-50 transition-colors hover:bg-cloth-50/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cloth-50"
                >
                  {isMuted ? (
                    <VolumeX aria-hidden="true" size={18} />
                  ) : (
                    <Volume2 aria-hidden="true" size={18} />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(event) => changeVolume(event.target.value)}
                  aria-label="视频音量"
                  aria-valuetext={`${Math.round(volume * 100)}%`}
                  className="h-1.5 w-12 shrink-0 cursor-pointer appearance-none rounded-full accent-cloth-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cloth-50 sm:w-16 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cloth-50 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cloth-50"
                  style={{
                    background: `linear-gradient(to right, rgba(251,248,241,0.95) ${(isMuted ? 0 : volume) * 100}%, rgba(251,248,241,0.28) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
              {playbackError && (
                <p role="status" className="mt-2 text-[11px] text-cloth-100/75">
                  {playbackError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
