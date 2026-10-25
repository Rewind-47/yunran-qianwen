"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PatternSwatch } from "@/components/pattern-swatch";
import { StyleSilhouette } from "@/components/style-silhouette";
import { EmbroiderySwatch } from "@/components/embroidery-swatch";
import { AgentTrace } from "@/components/agent-trace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  techniqueCategories,
  techniqueMap,
  techniquesByCategory,
} from "@/lib/data/techniques";
import { carrierMap } from "@/lib/data/carriers";
import {
  embroideryPatternMap,
  embroideryPatterns,
  stitchLayoutMap,
  stitchLayouts,
} from "@/lib/data/embroidery";
import {
  accentSwatches,
  dyeSwatches,
  palettes,
} from "@/lib/data/palettes";
import {
  shapeSummary,
  styleCategories,
  styleMap,
  type Style,
  type StyleCategory,
} from "@/lib/data/styles";
import { styleDb } from "@/lib/db/style-db";
import { listWorks, saveWork, type SavedWorkState } from "@/lib/db/works";
import {
  readLibrary,
  rememberColor,
  rememberStyle,
  toggleFavorite,
  type UserStyleLibrary,
} from "@/lib/db/user-library";
import { explainParam } from "@/lib/prompts";
import * as THREE from "three";
import {
  brushForCategory,
  clothPaint,
  type BrushSettings,
  type ClothPaint,
  type PaintTool,
} from "@/lib/render/cloth-paint";
import { useStudioStore } from "@/store/studio";
import { useUserStore } from "@/store/use-user-store";
import { toast } from "sonner";
import { cn, difficultyLabel } from "@/lib/utils";
import type { AgentStep, Technique, TechniqueCategory } from "@/lib/types";
import type { GarmentPaint, ViewAngle } from "@/components/garment/viewer";

/**
 * 个性工坊。
 *
 * 与上一版最大的区别：先选「品类 + 款式」，再选工艺和颜色。
 * 八个品类覆盖服饰 / 帽饰 / 发饰 / 箱包 / 围巾披肩 / 家居布艺，
 * 每个品类只摆几款精选（全库 300 余款仍在库里），每款都带廓形参数，
 * 所以换款不是换一张缩略图，而是真的把 3D 模型重新放样一遍。
 *
 * 染色的逻辑（按用户要求改过）：3D 始终是一件白坯布，选工艺不会把布换掉，
 * 工艺只决定「笔法」——扎染是晕染笔、印染是块面笔、刺绣是针脚笔；
 * 颜色是染料。用户按住鼠标在模型上涂，涂到哪染到哪。
 */

const GarmentViewer = dynamic(
  () => import("@/components/garment/viewer").then((m) => m.GarmentViewer),
  { ssr: false },
);

const viewLabels: { id: ViewAngle; label: string }[] = [
  { id: "front", label: "正面" },
  { id: "quarter", label: "四分之三" },
  { id: "side", label: "侧面" },
  { id: "back", label: "背面" },
];

const TOOL_LABEL: Record<PaintTool, string> = {
  soft: "晕染笔",
  flat: "块面笔",
  stitch: "针脚笔",
  erase: "洗笔",
};

function toolLabel(tool: PaintTool) {
  return TOOL_LABEL[tool];
}

const EMPTY_LIBRARY: UserStyleLibrary = {
  version: 1,
  favorites: [],
  recent: [],
  colors: [],
};

/** 取色器：一个圆点，点开是系统调色板 */
function ColorWell({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  return (
    <label
      className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-dye-900/15 shadow-inner"
      title="打开取色器"
    >
      <span className="block h-full w-full" style={{ background: value }} />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}

/** 小色点 */
function Dot({
  hex,
  active,
  onClick,
  title,
}: {
  hex: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "h-5 w-5 rounded-full border transition-transform duration-200 hover:scale-110",
        active
          ? "border-dye-900 ring-2 ring-dye-700/25"
          : "border-white/80 shadow-[inset_0_0_0_1px_rgba(16,31,47,0.12)]",
      )}
      style={{ background: hex }}
    />
  );
}

export function PersonalWorkshop({
  family,
  initialStyleCategory,
}: {
  family?: TechniqueCategory;
  initialStyleCategory?: StyleCategory;
}) {
  const searchParams = useSearchParams();
  const workId = searchParams.get("workId");
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const openLoginModal = useUserStore((state) => state.openLoginModal);
  const userInfo = useUserStore((state) => state.userInfo);

  const {
    techniqueId,
    styleId,
    paletteId,
    baseColor,
    dyeColor,
    accentColor,
    params,
    theme,
    patternId,
    layout,
    motifScale,
    setTechnique,
    setStyle,
    setPalette,
    setDyeColor,
    setAccentColor,
    setParam,
    setTheme,
    setPattern,
    setLayout,
    setMotifScale,
    resetParams,
    customSketch,
    clearCustomSketch,
  } = useStudioStore();

  const activeStyle = styleMap[styleId] ?? styleDb.featured("dress")[0];
  const carrier = carrierMap[activeStyle.model] ?? carrierMap.dress;

  const stored = techniqueMap[techniqueId] ?? techniqueMap.spiral;
  // 工艺大类由路由决定（/studio/personal/tie|print|embroider）：
  // 从别的工艺页切过来时，先落到这一类的第一种工艺，再把状态写回 store，
  // 保证 3D、局部重绘读到的始终是当前页面的这一类。
  const inFamily = !family || stored.category === family;
  const base = inFamily ? stored : (techniquesByCategory(family!)[0] ?? stored);
  const isEmbroidery = base.category === "embroider";
  const pattern = embroideryPatternMap[patternId] ?? embroideryPatterns[0];
  const stitchLayout = stitchLayoutMap[layout] ?? stitchLayouts[0];
  // 颜色是独立一层：换染料不改工艺，纹样骨架不变
  // 刺绣再多一层：针法（base）+ 图案 + 布局，三者组合后交给渲染器
  const technique = useMemo(
    () => ({
      ...base,
      palette: [baseColor, dyeColor, accentColor],
      ...(base.category === "embroider"
        ? { pattern: patternId, layout, motifScale }
        : {}),
    }),
    [base, baseColor, dyeColor, accentColor, patternId, layout, motifScale],
  );

  // 从别的工艺页切进来时，store 里的参数还属于上一类，先用当前这类的默认值兜底
  const activeParams = useMemo(
    () => (inFamily ? params : Object.fromEntries(base.params.map((p) => [p.key, p.default]))),
    [inFamily, params, base],
  );

  const [category, setCategory] = useState<StyleCategory>(activeStyle.category);
  const [library, setLibrary] = useState<UserStyleLibrary>(EMPTY_LIBRARY);

  const [view, setView] = useState<ViewAngle>("quarter");
  const [textureDensity, setTextureDensity] = useState(3);
  const capture3DRef = useRef<(() => string) | null>(null);
  const handleCaptureReady = useCallback((capture: (() => string) | null) => {
    capture3DRef.current = capture;
  }, []);
  // 布面图层：模型本体永远是一件白坯布，只有这里被涂过的地方才有颜色。
  const [cloth, setCloth] = useState<ClothPaint | null>(null);
  const [paintStrokes, setPaintStrokes] = useState(0);
  const [appliedPatternUrl, setAppliedPatternUrl] = useState<string | null>(null);
  const [paintOn, setPaintOn] = useState(true);
  const [brushTool, setBrushTool] = useState<PaintTool>("soft");
  const [brushSize, setBrushSize] = useState(0.12);
  const [brushOpacity, setBrushOpacity] = useState(0.85);
  const [tip, setTip] = useState<string | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashTip = useCallback((text: string) => {
    setTip(text);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(null), 2400);
  }, []);

  const previousStyleId = useRef(activeStyle.id);
  // 画布只能客户端建
  useEffect(() => {
    const p = clothPaint();
    setCloth(p);
    setPaintStrokes(p.strokes);
    setPaintOn(true);
  }, []);

  useEffect(
    () => () => {
      if (tipTimer.current) clearTimeout(tipTimer.current);
    },
    [],
  );

  // 工艺族决定默认笔法：扎染=晕染，印染=块面，刺绣=针脚
  useEffect(() => {
    setBrushTool(brushForCategory(base.category));
  }, [base.category]);

  // 从局部重绘带过来的手绘稿：铺到坯布上（之后还能继续涂）
  const sketchRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cloth || !customSketch) return;
    if (sketchRef.current === customSketch.id) return;
    sketchRef.current = customSketch.id;
    void cloth.applySketch(customSketch.dataUrl).then(() => {
      setPaintStrokes(cloth.strokes);
      setPaintOn(true);
      flashTip(`已把「${customSketch.name}」贴到坯布上`);
    });
  }, [cloth, customSketch, flashTip]);

  const brush: BrushSettings = useMemo(
    () => ({ color: dyeColor, size: brushSize, tool: brushTool, opacity: brushOpacity }),
    [dyeColor, brushSize, brushTool, brushOpacity],
  );

  const paintBinding = useMemo<GarmentPaint | null>(() => {
    if (!cloth) return null;
    return {
      engine: cloth,
      active: paintOn,
      begin: (layer) => cloth.begin(layer),
      stroke: (layer, u, v) => cloth.strokeTo(layer, u, v, brush),
      end: () => {
        setPaintStrokes(cloth.strokes);
      },
      layerOf: (object) => {
        const mat = (object as THREE.Mesh).material as
          | (THREE.MeshPhysicalMaterial & { userData: { paintLayer?: string } })
          | undefined;
        return mat?.userData?.paintLayer ?? null;
      },
    };
  }, [cloth, paintOn, brush]);

  /** 兼容未启用涂鸦时的静态兜底图 */
  const displayTechnique = technique;

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(false);
  const [advice, setAdvice] = useState("");
  const [asset, setAsset] = useState<{
    url: string;
    model: string | null;
    source: "model" | "local";
  } | null>(null);
  const [generatedPattern, setGeneratedPattern] = useState<{
    imageUrl: string;
    model: string;
  } | null>(null);
  const [restoreWorkState, setRestoreWorkState] =
    useState<SavedWorkState | null>(null);
  const requestedWorkId = useRef<string | null>(null);
  const restoredWorkId = useRef<string | null>(null);
  const [generatingPattern, setGeneratingPattern] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [engine, setEngine] = useState<{ mode: "llm" | "local"; label: string } | null>(null);

  const handlePatternImageError = useCallback((message: string) => {
    setAppliedPatternUrl(null);
    setPatternError(message);
  }, []);

  useEffect(() => {
    if (previousStyleId.current === activeStyle.id) return;
    previousStyleId.current = activeStyle.id;
    cloth?.reset();
    setPaintStrokes(0);
    setAppliedPatternUrl(null);
    setGeneratedPattern(null);
    setPatternError(null);
  }, [activeStyle.id, cloth]);

  // 本地库只在挂载后读，避免服务端渲染读到空
  useEffect(() => {
    setLibrary(readLibrary());
  }, []);

  // 从推荐位换到别的品类时，左侧分类跟着走
  useEffect(() => {
    setCategory(activeStyle.category);
  }, [activeStyle.category]);

  // 切到另一工艺页面：把 store 里的工艺换成这一类的第一种
  useEffect(() => {
    if (!inFamily) setTechnique(base.id);
  }, [inFamily, base.id, setTechnique]);

  /**
   * 选款区只摆每个品类的精选，不做搜索/标签筛选。
   * 连衣裙例外：它拆成「长裙 / 短裙」两组（都是实物扫描件），按组切换。
   */
  const dressGroups = useMemo(() => {
    const groups = new Map<string, Style[]>();
    for (const s of styleDb.featured("dress")) {
      const key = s.group ?? "长裙";
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  }, []);

  const [group, setGroup] = useState<string>(activeStyle.group ?? "长裙");

  const visibleStyles = useMemo(() => {
    const all = styleDb.featured(category);
    if (category !== "dress" || dressGroups.length < 2) return all;
    return dressGroups.find((g) => g.label === group)?.items ?? all;
  }, [category, group, dressGroups]);

  const related = useMemo(() => styleDb.related(activeStyle.id, 4), [activeStyle.id]);
  const specs = useMemo(() => shapeSummary(activeStyle.shape), [activeStyle.shape]);
  const isFavorite = library.favorites.includes(activeStyle.id);

  const activeFamily =
    techniqueCategories.find((c) => c.id === base.category) ?? techniqueCategories[0];
  const visibleTechniques = techniquesByCategory(base.category);

  // 刺绣针法缩略图：用当前图案把每种针法真正绣一遍，而不是画通用示意块
  const stitchPreviews = useMemo(() => {
    const map: Record<string, Technique> = {};
    for (const t of techniquesByCategory("embroider")) {
      map[t.id] = {
        ...t,
        palette: [baseColor, dyeColor, accentColor],
        pattern: patternId,
        layout: "chest",
        motifScale: 1.85,
      };
    }
    return map;
  }, [baseColor, dyeColor, accentColor, patternId]);
  const seed = `${base.id}-${styleId}-${dyeColor.slice(1)}-${accentColor.slice(1)}-${
    isEmbroidery ? `${patternId}-${layout}-${motifScale}-` : ""
  }${Object.values(activeParams).join("-")}`;

  // 保存成品：把当前设计打成最小快照存进「我的」页面（lib/db/works.ts）
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveWorkSnapshot() {
    if (!isLoggedIn || !userInfo) {
      toast.error("请先登录后再保存作品");
      openLoginModal();
      return;
    }

    try {
      const previewImage = capture3DRef.current?.();
      if (!previewImage) {
        throw new Error("3D 预览尚未就绪，请稍候再保存。");
      }

      const paintSnapshot =
        cloth && !cloth.isBlank ? cloth.snapshot() : undefined;
      const mockWorksRaw = window.localStorage.getItem("mock_works");
      const mockWorks: unknown = mockWorksRaw ? JSON.parse(mockWorksRaw) : [];
      if (!Array.isArray(mockWorks)) {
        throw new Error("本地作品数据格式异常，请检查 mock_works。");
      }

      const workState: SavedWorkState = {
        styleId: activeStyle.id,
        techniqueId: technique.id,
        palette: [baseColor, dyeColor, accentColor],
        params: activeParams,
        seed,
        ...(isEmbroidery ? { patternId, layout, motifScale } : {}),
        theme,
        textureDensity,
        paintStrokes,
        generatedPattern,
        appliedPatternUrl,
        paint: paintSnapshot,
        previewImage,
      };
      const savedWork = saveWork({
        ...workState,
        workState,
        previewImage,
      });

      mockWorks.unshift({
        id: savedWork.id,
        image: previewImage,
        previewImage,
        createdAt: savedWork.createdAt,
        username: userInfo.username,
        avatar: userInfo.avatar,
        workState,
      });
      window.localStorage.setItem(
        "mock_works",
        JSON.stringify(mockWorks.slice(0, 60)),
      );

      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1600);
      toast.success("作品已安全保存到我的图库");
    } catch (error) {
      toast.error(
        error instanceof Error ? `作品保存失败：${error.message}` : "作品保存失败，请稍后重试。",
      );
    }
  }

  function chooseCategory(id: StyleCategory) {
    setCategory(id);
    const first = styleDb.featured(id)[0] ?? styleDb.query({ category: id })[0];
    if (first) {
      setStyle(first.id);
      setGroup(first.group ?? "长裙");
    }
  }

  useEffect(() => {
    if (!initialStyleCategory) return;

    setCategory(initialStyleCategory);
    const first =
      styleDb.featured(initialStyleCategory)[0] ??
      styleDb.query({ category: initialStyleCategory })[0];
    if (first) {
      setStyle(first.id);
      setGroup(first.group ?? "长裙");
    }
  }, [initialStyleCategory, setStyle]);

  useEffect(() => {
    if (!workId || requestedWorkId.current === workId) return;
    requestedWorkId.current = workId;

    const savedWork = listWorks().find((work) => work.id === workId);
    if (!savedWork) {
      toast.error("找不到要恢复的作品，可能已被删除。");
      return;
    }

    const savedState: SavedWorkState = savedWork.workState ?? {
      styleId: savedWork.styleId,
      techniqueId: savedWork.techniqueId,
      palette: savedWork.palette,
      params: savedWork.params,
      seed: savedWork.seed,
      patternId: savedWork.patternId,
      layout: savedWork.layout,
      motifScale: savedWork.motifScale,
      textureDensity: 3,
      paintStrokes: savedWork.paint ? 1 : 0,
      generatedPattern: null,
      appliedPatternUrl: null,
      paint: savedWork.paint,
    };

    setTechnique(savedState.techniqueId);
    setStyle(savedState.styleId);
    if (savedState.palette[1]) setDyeColor(savedState.palette[1]);
    if (savedState.palette[2]) setAccentColor(savedState.palette[2]);
    if (savedState.patternId) {
      setPattern(savedState.patternId as typeof patternId);
    }
    if (savedState.layout) setLayout(savedState.layout as typeof layout);
    if (typeof savedState.motifScale === "number") {
      setMotifScale(savedState.motifScale);
    }
    setTheme(savedState.theme ?? "");
    Object.entries(savedState.params).forEach(([key, value]) => {
      setParam(key, value);
    });
    setRestoreWorkState(savedState);
  }, [
    workId,
    setTechnique,
    setStyle,
    setDyeColor,
    setAccentColor,
    setPattern,
    setLayout,
    setMotifScale,
    setTheme,
    setParam,
  ]);

  useEffect(() => {
    if (
      !workId ||
      !restoreWorkState ||
      !cloth ||
      activeStyle.id !== restoreWorkState.styleId ||
      restoredWorkId.current === workId
    ) {
      return;
    }
    restoredWorkId.current = workId;

    setTextureDensity(restoreWorkState.textureDensity);
    setGeneratedPattern(restoreWorkState.generatedPattern ?? null);
    setAppliedPatternUrl(restoreWorkState.appliedPatternUrl ?? null);
    setPaintOn(true);

    if (restoreWorkState.paint) {
      cloth.reset();
      void cloth
        .applySketch(restoreWorkState.paint)
        .then(() => setPaintStrokes(restoreWorkState.paintStrokes))
        .catch(() => toast.error("作品参数已恢复，但布面贴图加载失败。"));
    } else {
      cloth.reset();
      setPaintStrokes(0);
    }
  }, [workId, restoreWorkState, cloth, activeStyle.id]);

  function chooseStyle(id: string) {
    setStyle(id);
    // 深链或「相关推荐」进来的款式，分组标签也要跟过去，别让选中的卡不在当前组里
    const next = styleMap[id];
    if (next?.group) setGroup(next.group);
    setLibrary(rememberStyle(id));
  }

  // 换工艺 = 换笔法，不动模型本身；改颜色 = 换染料
  function chooseTechnique(id: string) {
    const next = techniqueMap[id];
    setTechnique(id);
    if (next) {
      const tool = brushForCategory(next.category);
      setBrushTool(tool);
      flashTip(`已换成${toolLabel(tool)} · ${next.name}`);
    }
  }

  function choosePalette(id: string) {
    setPalette(id);
  }

  async function generatePattern() {
    if (generatingPattern) return;
    setGeneratingPattern(true);
    setGeneratedPattern(null);
    setPatternError(null);

    try {
      const response = await fetch("/api/pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          techniqueId: base.id,
          params: activeParams,
          theme,
          carrier: carrier.name,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        imageUrl?: string;
        model?: string;
        error?: string;
      };
      if (!response.ok || !result.imageUrl || !result.model) {
        throw new Error(result.error ?? "扎染纹样生成失败，请稍后重试");
      }
      setGeneratedPattern({ imageUrl: result.imageUrl, model: result.model });
    } catch (error) {
      setPatternError(error instanceof Error ? error.message : "扎染纹样生成失败");
    } finally {
      setGeneratingPattern(false);
    }
  }

  function applyGeneratedPattern() {
    if (!generatedPattern) return;

    cloth?.reset();
    setPaintStrokes(0);
    setPatternError(null);
    setAppliedPatternUrl(
      `/api/image-proxy?url=${encodeURIComponent(generatedPattern.imageUrl)}`,
    );
  }

  function choosePattern(id: typeof patternId) {
    setPattern(id);
  }

  function chooseLayout(id: typeof layout) {
    setLayout(id);
  }

  function pickDye(hex: string) {
    setDyeColor(hex);
    setLibrary(rememberColor(hex));
  }

  function pickAccent(hex: string) {
    setAccentColor(hex);
  }

  function undoPaint() {
    if (!cloth) return;
    if (cloth.undo()) {
      setPaintStrokes(cloth.strokes);
      flashTip("已撤销上一笔");
    }
  }

  function clearPaint() {
    if (!cloth || paintStrokes === 0) return;
    cloth.clear();
    setPaintStrokes(0);
    flashTip("坯布已洗净");
  }

  async function runAgent() {
    if (running) return;
    setRunning(true);
    setSteps([]);
    setAdvice("");
    setAsset(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            theme ||
            (isEmbroidery
              ? `用${base.name}把${pattern.name}绣在${activeStyle.name}的${stitchLayout.label}，主线 ${dyeColor}`
              : `用${technique.signature}做一件${activeStyle.name}，主色 ${dyeColor}`),
          techniqueId: base.id,
          params: activeParams,
          theme,
          carrier: carrier.name,
          pattern: isEmbroidery ? pattern.name : undefined,
          layout: isEmbroidery ? stitchLayout.label : undefined,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as
            | { type: "meta"; mode: "llm" | "local"; label: string }
            | { type: "step"; step: AgentStep }
            | { type: "asset"; asset: { url: string; model: string | null; source: "model" | "local" } }
            | { type: "delta"; text: string }
            | { type: "done" };

          if (evt.type === "meta") {
            setEngine({ mode: evt.mode, label: evt.label });
          } else if (evt.type === "step") {
            setSteps((prev) => [...prev.filter((s) => s.id !== evt.step.id), evt.step]);
          } else if (evt.type === "asset") {
            setAsset(evt.asset);
          } else if (evt.type === "delta") {
            setAdvice((prev) => prev + evt.text);
          }
        }
      }
    } catch {
      setAdvice("Agent 执行中断了，再点一次试试。");
    } finally {
      setRunning(false);
    }
  }

  // 刺绣多一节「选图案」，后面几节的序号整体后移，避免出现两个「四」
  const sec = isEmbroidery
    ? { pattern: "四", color: "五", param: "六", agent: "七", process: "八" }
    : { pattern: "", color: "四", param: "五", agent: "六", process: "七" };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {/* 工艺大类：三张页面，路由切换。工坊的款式、颜色、参数跨页面保留 */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-dye-900/10 bg-white/50 p-1">
          {techniqueCategories.map((c) => {
            const active = c.id === base.category;
            return (
              <Link
                key={c.id}
                href={`/studio/personal/${c.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-dye-700 text-cloth-50"
                    : "text-dye-800/60 hover:bg-white/70 hover:text-dye-900",
                )}
              >
                {c.label}
                <span
                  className={cn(
                    "font-mono text-[9.5px]",
                    active ? "text-cloth-100/55" : "text-dye-800/30",
                  )}
                >
                  {techniquesByCategory(c.id).length}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="max-w-md text-[11px] leading-relaxed text-dye-800/45">
          {activeFamily.desc}
        </p>
      </div>

      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[382px_minmax(0,1fr)] lg:gap-5">
      {/* ---------------- 左：定制流程（可滚动） ---------------- */}
      <div className="order-2 space-y-4 lg:order-1 lg:h-full lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:thin] lg:[scrollbar-color:rgba(16,31,47,0.18)_transparent]">
        {/* 从局部重绘带来的手绘图案：贴图里已经叠进这张画稿 */}
        {customSketch && (
          <section className="flex items-center gap-3 rounded-card border border-madder-200 bg-madder-50/60 px-4 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-dye-900/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={customSketch.dataUrl} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-dye-900/85">
                手绘图案「{customSketch.name}」已贴上这件坯布
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-dye-800/50">
                已铺到 3D 坯布上，可以继续拿画笔在上面加工。
              </p>
            </div>
            <button
              type="button"
              onClick={clearCustomSketch}
              className="shrink-0 rounded-full border border-madder-500/30 px-3 py-1 text-[11px] text-madder-500 transition-colors hover:bg-madder-500 hover:text-cloth-50"
            >
              移除图案
            </button>
          </section>
        )}

        {/* 一、品类 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">一、选品类</p>
            <span className="text-[10.5px] text-dye-800/40">
              {styleDb.stats().categories} 类 · 精选 {styleDb.stats().featured} 款
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {styleCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => chooseCategory(c.id)}
                title={c.desc}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[12px] transition-colors",
                  category === c.id
                    ? "border-dye-700 bg-dye-700 text-cloth-50"
                    : "border-dye-900/12 text-dye-800/70 hover:border-dye-700/35",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-dye-800/45">
            {styleCategories.find((c) => c.id === category)?.desc}
          </p>
        </section>

        {/* 二、款式：每个品类只摆精选；连衣裙再分长裙 / 短裙两组 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">二、选款式</p>
            <span className="text-[10.5px] text-dye-800/40">
              每类精选 {visibleStyles.length} 款
            </span>
          </div>

          {/* 连衣裙分「长裙 / 短裙」两组，其余品类不显示这一行 */}
          {category === "dress" && dressGroups.length > 1 && (
            <div className="mt-3 flex items-center gap-1.5">
              {dressGroups.map((g) => (
                <button
                  key={g.label}
                  onClick={() => {
                    setGroup(g.label);
                    if (g.items[0] && !g.items.some((s) => s.id === styleId)) {
                      chooseStyle(g.items[0].id);
                    }
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    group === g.label
                      ? "border-dye-700 bg-dye-700/10 text-dye-900"
                      : "border-dye-900/12 text-dye-800/55 hover:border-dye-700/35",
                  )}
                >
                  {g.label}
                  <span
                    className={cn(
                      "ml-1 text-[9.5px]",
                      group === g.label ? "text-dye-800/50" : "text-dye-800/35",
                    )}
                  >
                    {g.items.length}
                  </span>
                </button>
              ))}
              <span className="ml-auto text-[9.5px] tracking-[0.08em] text-dye-800/35">
                实物扫描
              </span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {visibleStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => chooseStyle(s.id)}
                className={cn(
                  "group overflow-hidden rounded-lg border text-left transition-all",
                  styleId === s.id
                    ? "border-dye-700 shadow-[0_10px_24px_-16px_rgba(16,31,47,0.9)]"
                    : "border-dye-900/10 hover:border-dye-700/35",
                )}
                title={`${s.name} · ${s.tags.join(" / ")}`}
              >
                <div className="relative aspect-[4/5] w-full bg-[#F7F6F3]">
                  <StyleSilhouette style={s} />
                  {library.favorites.includes(s.id) && (
                    <span className="absolute right-1.5 top-1.5 text-[10px] text-madder-400">★</span>
                  )}
                  <span
                    className={cn(
                      "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8.5px] transition-opacity",
                      styleId === s.id
                        ? "bg-dye-700/90 text-cloth-50"
                        : "bg-white/75 text-dye-800/50 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {styleId === s.id ? "已选" : "选这款"}
                  </span>
                </div>
                <span
                  className={cn(
                    "block border-t px-2 py-1.5",
                    styleId === s.id
                      ? "border-dye-700 bg-dye-700 text-cloth-50"
                      : "border-dye-900/10 bg-white/70 text-dye-800/75",
                  )}
                >
                  <span className="block truncate text-[11.5px]">{s.name}</span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[9px] tracking-[0.06em]",
                      styleId === s.id ? "text-cloth-100/60" : "text-dye-800/40",
                    )}
                  >
                    {s.en}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-2 text-[9.5px] leading-relaxed text-dye-800/35">
            全库 {styleDb.size} 款版型，每类只上架最适合扎染的几款：幅面完整、纹样不被结构切碎。
          </p>

          <div className="mt-3 border-t border-dye-900/10 pt-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-dye-900">{activeStyle.name}</p>
                <p className="mt-0.5 truncate text-[9.5px] tracking-[0.08em] text-dye-800/40">
                  {activeStyle.en} · {activeStyle.tags.join(" / ")}
                </p>
              </div>
              <button
                onClick={() => setLibrary(toggleFavorite(activeStyle.id))}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] transition-colors",
                  isFavorite
                    ? "border-madder-400/50 bg-madder-50 text-madder-500"
                    : "border-dye-900/12 text-dye-800/50 hover:border-dye-700/35",
                )}
              >
                {isFavorite ? "★ 已收藏" : "☆ 收藏"}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-dye-800/40">
              {carrier.spec}
            </p>
          </div>
        </section>

        {/* 三、工艺 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">三、选工艺</p>
            <span className="text-[10.5px] text-dye-800/40">
              {activeFamily.label} · {visibleTechniques.length} 种
            </span>
          </div>

          <div className="mt-3 max-h-[248px] space-y-2 overflow-y-auto pr-1">
            {visibleTechniques.map((t) => (
              <button
                key={t.id}
                onClick={() => chooseTechnique(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  base.id === t.id
                    ? "border-dye-700 bg-dye-700 text-cloth-50"
                    : "border-dye-900/12 text-dye-800/75 hover:border-dye-700/35 hover:bg-cloth-50/60",
                )}
              >
                {isEmbroidery ? (
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-[#F7F6F3]">
                    <EmbroiderySwatch
                      technique={stitchPreviews[t.id] ?? technique}
                      params={activeParams}
                      seed={`${t.id}-stitch`}
                      pattern={patternId}
                      className="h-full w-full"
                    />
                  </span>
                ) : (
                  <PatternSwatch
                    seed={`${t.id}-${dyeColor.slice(1)}`}
                    motif={t.motif}
                    palette={[baseColor, dyeColor, accentColor]}
                    className="h-9 w-9 shrink-0 rounded"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12.5px]">{t.name}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[9.5px]",
                        base.id === t.id ? "text-cloth-100/55" : "text-dye-800/35",
                      )}
                    >
                      {t.family}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <span
                        key={d}
                        className={cn(
                          "h-[3px] w-3 rounded-full",
                          d <= t.difficulty
                            ? base.id === t.id
                              ? "bg-cloth-100/80"
                              : "bg-dye-600/60"
                            : base.id === t.id
                              ? "bg-cloth-100/20"
                              : "bg-dye-900/10",
                        )}
                      />
                    ))}
                    <span
                      className={cn(
                        "ml-1 text-[9.5px]",
                        base.id === t.id ? "text-cloth-100/55" : "text-dye-800/35",
                      )}
                    >
                      {difficultyLabel[t.difficulty]}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 四、刺绣图案：针法决定怎么绣，题材决定绣什么，布局决定绣在哪 */}
        {isEmbroidery && (
          <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
                {sec.pattern}、选图案
              </p>
              <span className="truncate text-[10.5px] text-dye-800/40">
                {pattern.name} · {stitchLayout.label}
              </span>
            </div>

            <p className="mt-2 text-[10.5px] leading-relaxed text-dye-800/45">
              刺绣的针法与题材是两件事：同一手{base.name}，可以绣山茶，也可以绣蝴蝶。
              下面八张缩略图用的就是你当前选的针法。
            </p>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {embroideryPatterns.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choosePattern(p.id)}
                  title={`${p.meaning}（${p.workload}）`}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-all",
                    patternId === p.id
                      ? "border-dye-700 shadow-[0_10px_24px_-18px_rgba(16,31,47,0.9)]"
                      : "border-dye-900/10 hover:border-dye-700/35",
                  )}
                >
                  <span className="relative block aspect-square w-full bg-[#F7F6F3]">
                    <EmbroiderySwatch
                      technique={technique}
                      params={activeParams}
                      seed={`${p.id}-list`}
                      pattern={p.id}
                      className="absolute inset-0"
                    />
                  </span>
                  <span
                    className={cn(
                      "block truncate border-t px-1 py-1 text-[10px]",
                      patternId === p.id
                        ? "border-dye-700 bg-dye-700 text-cloth-50"
                        : "border-dye-900/10 bg-white/70 text-dye-800/70",
                    )}
                  >
                    {p.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] text-dye-900">施绣部位</span>
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-dye-800/35">
                  {stitchLayout.en}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {stitchLayouts.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => chooseLayout(l.id)}
                    title={l.desc}
                    className={cn(
                      "rounded-lg border px-1.5 py-1.5 text-[11px] transition-colors",
                      layout === l.id
                        ? "border-dye-700 bg-dye-700 text-cloth-50"
                        : "border-dye-900/12 text-dye-800/70 hover:border-dye-700/35",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-dye-800/45">
                {stitchLayout.desc}
              </p>
            </div>

            <div className="mt-3.5">
              <div className="flex items-baseline justify-between">
                <label className="text-[12px] text-dye-900">图案尺度</label>
                <span className="font-mono text-[11.5px] text-dye-700">
                  ×{motifScale.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.7}
                max={1.4}
                step={0.05}
                value={motifScale}
                onChange={(e) => {
                  setMotifScale(Number(e.target.value));
                }}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-dye-800/45">
                放大纹样要按比例加针，花瓣与花心的针脚密度不能简单地等比放大。
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-dye-900/10 bg-cloth-50/60 px-2.5 py-2">
              <p className="text-[11px] leading-relaxed text-dye-900/75">{pattern.meaning}</p>
              <p className="mt-1 text-[9.5px] tracking-[0.04em] text-dye-800/40">
                工量 {pattern.workload} · 常见于 {pattern.usage.join(" / ")}
              </p>
            </div>
          </section>
        )}

        {/* 四 / 五、颜色 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
              {sec.color}、定颜色
            </p>
            <span className="text-[10.5px] text-dye-800/40">
              {isEmbroidery ? "底布 + 双色丝线" : "白坯布 + 自选染料"}
            </span>
          </div>

          {/* 坯布：固定白色，解释清楚为什么 */}
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-dye-900/10 bg-white/70 px-2.5 py-2">
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-dye-900/15"
              style={{ background: baseColor }}
            />
            <div className="min-w-0">
              <p className="text-[11.5px] text-dye-900">
                {isEmbroidery ? "底布" : "坯布底"} ·{" "}
                <span className="font-mono text-[10.5px]">{baseColor}</span>
              </p>
              <p className="text-[10px] leading-relaxed text-dye-800/45">
                {isEmbroidery
                  ? "刺绣是在布上做加法，底布不动，所以先定布色再定丝线"
                  : "扎染的留白就是布本色，所以底布不参与染色"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dye-900">
                  {isEmbroidery ? "主线" : "主染"}
                </span>
                <span className="font-mono text-[11px] text-dye-700">{dyeColor}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ColorWell
                  value={dyeColor}
                  onChange={pickDye}
                  label={isEmbroidery ? "选择主丝线颜色" : "选择主染颜色"}
                />
                <div className="flex flex-wrap gap-1.5">
                  {dyeSwatches.map((s) => (
                    <Dot
                      key={s.hex}
                      hex={s.hex}
                      active={dyeColor.toUpperCase() === s.hex}
                      onClick={() => pickDye(s.hex)}
                      title={`${s.name} ${s.hex}`}
                    />
                  ))}
                </div>
              </div>
              {library.colors.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[9.5px] text-dye-800/35">最近</span>
                  {library.colors.map((c) => (
                    <Dot
                      key={c}
                      hex={c}
                      active={dyeColor.toUpperCase() === c}
                      onClick={() => pickDye(c)}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dye-900">
                  {isEmbroidery ? "辅线" : "辅染"}
                </span>
                <span className="font-mono text-[11px] text-dye-700">{accentColor}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ColorWell
                  value={accentColor}
                  onChange={pickAccent}
                  label={isEmbroidery ? "选择辅丝线颜色" : "选择辅染颜色"}
                />
                <div className="flex flex-wrap gap-1.5">
                  {accentSwatches.map((s) => (
                    <Dot
                      key={s.hex}
                      hex={s.hex}
                      active={accentColor.toUpperCase() === s.hex}
                      onClick={() => pickAccent(s.hex)}
                      title={`${s.name} ${s.hex}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-dye-800/40">
                {isEmbroidery
                  ? "主线定花瓣与主体，辅线走花心、叶脉与勾边，两色拉开层次"
                  : "辅染决定晕圈过渡与高光，主染决定成衣的主色调"}
              </p>
            </div>
          </div>

          {!isEmbroidery && (
            <div className="mt-3 border-t border-dye-900/10 pt-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] text-dye-800/45">传统草木染配方</span>
                <span className="text-[9.5px] text-dye-800/30">点选只改染料色</span>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => choosePalette(p.id)}
                    className={cn(
                      "overflow-hidden rounded-md border transition-all",
                      paletteId === p.id
                        ? "border-dye-700 ring-1 ring-dye-700/25"
                        : "border-dye-900/12 hover:border-dye-700/35",
                    )}
                    title={p.source}
                  >
                    <span className="flex h-5 w-full">
                      {p.colors.map((c) => (
                        <span key={c} style={{ background: c }} className="flex-1" />
                      ))}
                    </span>
                    <span className="block truncate px-1 py-1 text-[9px] text-dye-800/60">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEmbroidery && (
            <div className="mt-3 border-t border-dye-900/10 pt-2.5">
              <p className="text-[10px] leading-relaxed text-dye-800/40">
                丝线配色讲究「和色」：同色系分档过渡，冷暖各一支，才绣得出花瓣的转折。
                上面两组色点既是染料，也是绣线的色谱。
              </p>
            </div>
          )}
        </section>

        {/* 五 / 六、参数 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-center justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
              {sec.param}、调工艺
            </p>
            <button onClick={resetParams} className="text-[11px] text-dye-700/50 hover:text-dye-800">
              恢复默认
            </button>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-dye-800/45">
            {technique.principle}
          </p>

          <div className="mt-4 space-y-5">
            {technique.params.map((p) => {
              const v = activeParams[p.key] ?? p.default;
              return (
                <div key={p.key}>
                  <div className="flex items-baseline justify-between">
                    <label className="text-[12.5px] text-dye-900">{p.label}</label>
                    <span className="font-mono text-[12px] text-dye-700">
                      {v}
                      <span className="ml-0.5 text-[10.5px] text-dye-800/40">{p.unit}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={v}
                    onChange={(e) => setParam(p.key, Number(e.target.value))}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-dye-800/45">
                    {explainParam(p, v)}
                  </p>
                </div>
              );
            })}
          </div>

          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="题材，如「大理山茶花」"
            className="mt-4 h-9 w-full rounded-lg border border-dye-900/12 bg-cloth-50 px-3 text-[12.5px] text-dye-900 placeholder:text-dye-800/35 focus:border-dye-600/45 focus:outline-none"
          />
          {base.category === "tie" && (
            <div className="mt-3">
              <Button onClick={generatePattern} disabled={generatingPattern} size="sm">
                {generatingPattern ? "正在生成纹样…" : "生成纹样"}
              </Button>
              {generatingPattern && (
                <p role="status" className="mt-2 text-[11px] text-dye-800/50">
                  万相正在根据当前工艺参数生成图片，请稍候。
                </p>
              )}
              {patternError && (
                <p role="alert" className="mt-2 text-[11px] leading-relaxed text-madder-500">
                  {patternError}
                </p>
              )}
              {generatedPattern && (
                <>
                  <div className="mt-3 overflow-hidden rounded-lg border border-dye-900/10 bg-cloth-50/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(generatedPattern.imageUrl)}`}
                      alt={`${technique.name}生成的扎染纹样`}
                      className="max-h-80 w-full object-contain"
                    />
                    <p className="px-3 py-2 text-[10.5px] text-dye-800/55">
                      通义万相生成 · {generatedPattern.model}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={applyGeneratedPattern}
                    disabled={
                      appliedPatternUrl ===
                      `/api/image-proxy?url=${encodeURIComponent(generatedPattern.imageUrl)}`
                    }
                    size="sm"
                    className="mt-2"
                  >
                    {appliedPatternUrl ===
                    `/api/image-proxy?url=${encodeURIComponent(generatedPattern.imageUrl)}`
                      ? "已应用到 3D 预览"
                      : "应用到 3D 预览"}
                  </Button>
                </>
              )}
            </div>
          )}
        </section>
        {/* 七 / 六、AI 方案：规划、工具调用、自检与建议都留在同一栏，点完直接看结果 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
              {sec.agent}、让 Agent 出方案
            </p>
            {engine && (
              <Badge tone={engine.mode === "llm" ? "madder" : "cloth"}>{engine.label}</Badge>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Button onClick={runAgent} disabled={running} size="sm">
              {running ? "Agent 正在工作…" : advice ? "重新出方案" : "让 Agent 出方案"}
            </Button>
            <span className="max-w-[15rem] text-[10.5px] leading-relaxed text-dye-800/45">
              {engine?.mode === "llm"
                ? "模型规划 → 工具调用 → 双重自检 → 流式建议"
                : "本地规则规划 → 工具调用 → 自检 → 建议"}
            </span>
          </div>

          {asset && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-dye-900/10 bg-cloth-50/70 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt="AI 生成的纹样效果"
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="text-[11.5px] text-dye-900/80">
                  {asset.source === "model" ? "通义万相生成的效果参考" : "本地示意渲染"}
                  {asset.model ? ` · ${asset.model}` : ""}
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-dye-800/45">
                  与右侧 3D 使用同一套工艺参数；AI 生成图仅作参考，非真实成品。
                </p>
              </div>
            </div>
          )}

          {advice ? (
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.9] text-dye-900/85">
              {advice}
              {running && (
                <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse-soft bg-dye-500" />
              )}
            </p>
          ) : (
            <p className="mt-3 text-[11.5px] leading-relaxed text-dye-800/40">
              点上面的按钮，Agent 会读一遍你现在的款式、工艺与配色，再用工具核对一遍参数，
              给出下一步怎么调。
            </p>
          )}

          <div className="mt-4 border-t border-dye-900/10 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10.5px] tracking-[0.16em] text-dye-800/40">
                Agent 思考轨迹
              </span>
              <span className="text-[10px] text-dye-800/35">点任一步展开</span>
            </div>
            <div className="mt-2">
              <AgentTrace steps={steps} />
            </div>
          </div>
        </section>

        {/* 八 / 七、工艺流程 */}
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-baseline justify-between">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
              {sec.process}、{technique.name} · 工艺流程
            </p>
            <span className="text-[10.5px] text-dye-800/40">
              {technique.family} · {difficultyLabel[technique.difficulty]}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {technique.steps.map((s, i) => (
              <div key={s.title} className="flex items-start gap-2">
                <span className="mt-[3px] font-mono text-[10px] text-dye-700/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[12px] text-dye-900/85">{s.title}</span>
                  <span className="block max-w-[220px] text-[10.5px] leading-relaxed text-dye-800/45">
                    {s.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- 右：3D 成品，固定在右栏不随滚动 ----------------
          左栏自己滚动，这块占满整屏高度，转模型时选款区不会把它推走 */}
      {/* 矮窗口（页面滚动模式）下右栏 sticky 吸附：滚动选款时 3D 预览固定在屏幕上，尺寸不变 */}
      <div className="order-1 lg:order-2 lg:min-h-0 [@media(min-width:1024px)_and_(min-height:820px)]:h-full [@media(min-width:1024px)_and_(max-height:819.98px)]:sticky [@media(min-width:1024px)_and_(max-height:819.98px)]:top-[76px] [@media(min-width:1024px)_and_(max-height:819.98px)]:z-10 [@media(min-width:1024px)_and_(max-height:819.98px)]:self-start">
        <section className="flex flex-col overflow-hidden rounded-card border border-dye-900/10 bg-white/60 lg:h-full">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dye-900/10 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-dye-900">3D 成品预览</span>
              <Badge tone="cloth">{activeStyle.name}</Badge>
              <Badge tone="cloth">{carrier.name}</Badge>
              {isEmbroidery && <Badge tone="cloth">{pattern.name}</Badge>}
              {isEmbroidery && <Badge tone="cloth">{stitchLayout.label}</Badge>}
              <span className="flex items-center gap-1 rounded-full border border-dye-900/10 bg-white/70 py-0.5 pl-1 pr-2 text-[10.5px] text-dye-800/70">
                <span
                  className="h-3 w-3 rounded-full border border-dye-900/20"
                  style={{ background: dyeColor }}
                />
                <span className="font-mono text-[9.5px]">{dyeColor}</span>
              </span>
              <Badge tone="madder">程序化建模</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10.5px] text-dye-800/40 md:inline">
                {paintOn ? "按住拖动 = 在坯布上作画" : "拖动翻转 · 滚轮缩放 · 双击复位"}
              </span>
              {/* 涂抹 / 旋转：涂抹时轨道控制让位给画笔，想转模型切「旋转」 */}
              <div
                role="group"
                aria-label="交互模式"
                className="flex items-center rounded-full border border-dye-900/12 bg-white/60 p-0.5"
              >
                {[
                  { on: true, label: "涂抹", tip: "按住鼠标在坯布上画，工艺决定笔法" },
                  { on: false, label: "旋转", tip: "只转模型不落笔" },
                ].map((m) => {
                  const active = paintOn === m.on;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setPaintOn(m.on)}
                      aria-pressed={active}
                      title={m.tip}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10.5px] transition-colors",
                        active
                          ? "bg-dye-800 text-cloth-50"
                          : "text-dye-800/60 hover:text-dye-900",
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={saveWorkSnapshot}
                title="把当前设计存进「我的」页面"
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10.5px] transition-colors",
                  savedFlash
                    ? "border-woad-500/60 bg-woad-500/15 text-woad-600"
                    : "border-dye-900/15 bg-white/60 text-dye-800/60 hover:border-dye-700/40 hover:text-dye-900",
                )}
              >
                {savedFlash ? "已保存 ✓" : "保存成品"}
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-col lg:flex-1">
            <div className="relative aspect-[4/3] w-full bg-[#F5F4F0] md:aspect-[16/11] lg:aspect-[16/10]">
              {/* 画框式留白：画布四周（尤其上下）留出呼吸空间，不再顶满面板 */}
              <div className="absolute inset-0 p-3 sm:p-4 lg:p-5">
                <GarmentViewer
                  className="h-full w-full overflow-hidden rounded-xl"
                  zoom={0.72}
                  technique={displayTechnique}
                  params={activeParams}
                  seed={seed}
                  carrier={activeStyle.model}
                  style={activeStyle.shape}
                  view={view}
                  paint={paintBinding}
                  textureDensity={textureDensity}
                  patternImageUrl={appliedPatternUrl}
                  onPatternImageError={handlePatternImageError}
                  onCaptureReady={handleCaptureReady}
                  fallback={
                    <div className="relative h-full w-full">
                      {isEmbroidery ? (
                        <EmbroiderySwatch
                          technique={displayTechnique}
                          params={activeParams}
                          seed={seed}
                          pattern={patternId}
                          className="h-full w-full"
                        />
                      ) : (
                        <PatternSwatch
                          seed={seed}
                          motif={displayTechnique.motif}
                          palette={displayTechnique.palette}
                          className="h-full w-full"
                        />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-dye-950/50 px-2 py-1 text-center text-[10px] text-cloth-50">
                        当前设备不支持 WebGL，已降级为平面预览
                      </span>
                    </div>
                  }
                />
              </div>

              <label className="absolute inset-x-4 bottom-12 mx-auto flex max-w-xs items-center gap-3 rounded-full border border-dye-900/10 bg-cloth-50/90 px-4 py-2 text-[11px] text-dye-800/70 shadow-sm backdrop-blur-sm">
                <span className="shrink-0">纹理密度</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={textureDensity}
                  onChange={(event) =>
                    setTextureDensity(Number(event.target.value))
                  }
                  aria-label="纹理密度"
                  className="min-w-0 flex-1 accent-dye-700"
                />
                <span className="w-6 shrink-0 text-right font-mono">
                  {textureDensity.toFixed(1)}×
                </span>
              </label>

              {/* 机位切换 */}
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <div className="flex items-center gap-0.5 rounded-full border border-dye-900/10 bg-cloth-50/85 p-1 backdrop-blur-sm">
                  {viewLabels.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                        view === v.id
                          ? "bg-dye-700 text-cloth-50"
                          : "text-dye-800/60 hover:bg-dye-700/10",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="pointer-events-none absolute left-3 top-2.5 rounded bg-cloth-50/85 px-1.5 py-0.5 text-[10px] text-dye-800/55">
                白坯布 ·{" "}
                {activeStyle.shape.pleats ? `${activeStyle.shape.pleats} 道褶 ` : ""}
                {paintStrokes > 0 ? `已涂 ${paintStrokes} 笔` : "未落笔"}
              </span>

              {/* 落笔/换笔的即时反馈 */}
              <span
                className={cn(
                  "pointer-events-none absolute left-3 top-9 rounded bg-dye-800/85 px-2 py-0.5 text-[10px] text-cloth-50 transition-opacity duration-300",
                  tip ? "opacity-100" : "opacity-0",
                )}
              >
                {tip ?? " "}
              </span>

              {/* 涂鸦工具条：笔法跟着工艺走，也可以自己换 */}
              <div className="absolute inset-x-0 bottom-24 flex justify-center">
                <div className="flex max-w-[95%] flex-wrap items-center gap-1 rounded-full border border-dye-900/10 bg-cloth-50/90 px-1.5 py-1 backdrop-blur-sm">
                  {(
                    [
                      { id: "soft", label: "晕染", tip: "扎染的晕圈：边缘化开" },
                      { id: "flat", label: "块面", tip: "印染的块面：边界清楚" },
                      { id: "stitch", label: "针脚", tip: "刺绣的走针：一笔一针" },
                      { id: "erase", label: "洗掉", tip: "把这一块洗回坯布白" },
                    ] as { id: PaintTool; label: string; tip: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setBrushTool(t.id);
                        setPaintOn(true);
                      }}
                      title={t.tip}
                      aria-pressed={brushTool === t.id}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] transition-colors",
                        brushTool === t.id
                          ? "bg-dye-700 text-cloth-50"
                          : "text-dye-800/60 hover:bg-dye-700/10 hover:text-dye-900",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                  <span className="mx-0.5 h-4 w-px bg-dye-900/12" />
                  <label className="flex items-center gap-1 pl-1 pr-1.5">
                    <span className="text-[9px] text-dye-800/40">笔径</span>
                    <input
                      type="range"
                      min={3}
                      max={40}
                      step={1}
                      value={Math.round(brushSize * 100)}
                      onChange={(e) => setBrushSize(Number(e.target.value) / 100)}
                      aria-label="笔刷大小"
                      className="h-1 w-16 accent-dye-700"
                    />
                    <span className="w-5 font-mono text-[9px] text-dye-800/50">
                      {Math.round(brushSize * 100)}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={undoPaint}
                    disabled={paintStrokes === 0}
                    title="撤销上一笔"
                    className="rounded-full px-2 py-0.5 text-[10.5px] text-dye-800/60 transition-colors hover:bg-dye-700/10 hover:text-dye-900 disabled:opacity-35"
                  >
                    撤销
                  </button>
                  <button
                    type="button"
                    onClick={clearPaint}
                    disabled={paintStrokes === 0}
                    title="把坯布洗回纯白"
                    className="rounded-full px-2 py-0.5 text-[10.5px] text-dye-800/60 transition-colors hover:bg-dye-700/10 hover:text-dye-900 disabled:opacity-35"
                  >
                    洗净
                  </button>
                </div>
              </div>
            </div>

            {/* 实物参数：证明模型是按真实规格建的（压缩为单行，把高度让给 3D 画面） */}
            <div className="grid shrink-0 grid-cols-1 divide-y divide-dye-900/10 border-t border-dye-900/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { k: "规格", v: activeStyle.shape.glb?.info?.spec ?? carrier.spec },
                { k: "面料", v: activeStyle.shape.glb?.info?.fabric ?? carrier.fabric },
                { k: "结构", v: activeStyle.shape.glb?.info?.structure ?? carrier.structure },
              ].map((item) => (
                <div key={item.k} className="flex items-baseline gap-2 px-4 py-1.5">
                  <p className="shrink-0 text-[9px] tracking-[0.16em] text-dye-800/40">{item.k}</p>
                  <p className="truncate text-[10.5px] leading-snug text-dye-900/75">{item.v}</p>
                </div>
              ))}
            </div>

            {/* 版型参数：款式库里的数字，直接喂给放样函数 */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-dye-900/10 px-4 py-1.5">
              <span className="text-[9px] tracking-[0.16em] text-dye-800/35">版型参数</span>
              {specs.map((s) => (
                <span key={s.label} className="text-[10px] text-dye-800/55">
                  {s.label}
                  <span className="ml-1 font-mono text-dye-800/80">{s.value}</span>
                </span>
              ))}
              <span className="ml-auto font-mono text-[9px] text-dye-800/30">
                {activeStyle.id}
              </span>
            </div>

            {/* 同品类推荐：款式库的另一条查询 */}
            {related.length > 0 && (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-dye-900/10 px-4 py-1.5">
                <span className="text-[9px] tracking-[0.16em] text-dye-800/35">同类推荐</span>
                {related.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => chooseStyle(s.id)}
                    className="rounded-full border border-dye-900/10 px-2 py-0.5 text-[10.5px] text-dye-800/60 transition-colors hover:border-dye-700/40 hover:text-dye-900"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
