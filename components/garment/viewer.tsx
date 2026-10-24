"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { carrierMap, type CarrierId } from "@/lib/data/carriers";
import {
  FabricMaterial,
  PaintFabricMaterial,
  useClothTexture,
} from "@/components/garment/materials";
import type { ClothPaint } from "@/lib/render/cloth-paint";
import { models } from "@/components/garment/models";
import { SCANNED_CARRIERS, ScannedFabric } from "@/components/garment/scanned";
import { cn } from "@/lib/utils";
import type { StyleShape } from "@/lib/data/styles";
import type { Technique } from "@/lib/types";

/**
 * 3D 涂鸦绑定：由工坊把「涂鸦引擎」交给预览，
 * 预览负责把鼠标命中的衣片图层与 UV 交给它落笔。
 * 模型本体不参与——白坯布永远是同一件。
 */
export interface GarmentPaint {
  /** 涂鸦引擎（多图层布料） */
  engine: ClothPaint;
  /** 涂鸦模式（开启时轨道控制让位给画笔，拖动即在布上画） */
  active: boolean;
  begin: (layer: string) => void;
  stroke: (layer: string, u: number, v: number) => void;
  end: () => void;
  /** 命中的衣料网格 → 它的涂鸦图层 id（非涂鸦衣料返回 null） */
  layerOf: (object: THREE.Object3D) => string | null;
}

/**
 * 3D 成品预览（实物图模式）。
 *
 * 目标不是「有个 3D 转一转」，而是让预览区看起来像影棚里拍的产品图，
 * 同时用户能自己把物件翻过来看背面、看结构：
 *
 * 1. 影棚背景：径向渐变的摄影棚背景 + 暗角，画布透明叠在上面，
 *    比一整块纯色更接近真实拍摄的无缝背景纸。
 * 2. 光：环境贴图（现场烘）+ 主光/补光/轮廓光三灯，主光投软阴影；
 *    布料有绒光与织纹法线，转动时高光会走。
 * 3. 交互：拖拽自由翻转、滚轮/双指缩放、右键平移；双击复位。
 *    右上角还有一排操作键（左转/右转/翻转/俯视/复位/全屏），
 *    手机上没有滚轮也能缩放与转面。
 */

export type ViewAngle = "front" | "quarter" | "side" | "back";

const AZIMUTH: Record<ViewAngle, number> = {
  front: 0,
  quarter: Math.PI * 0.22,
  side: Math.PI * 0.5,
  back: Math.PI,
};

export const viewLabels: { id: ViewAngle; label: string }[] = [
  { id: "front", label: "正面" },
  { id: "quarter", label: "四分之三" },
  { id: "side", label: "侧面" },
  { id: "back", label: "背面" },
];

/** 暴露给浮层按钮的相机动作 */
interface ViewerApi {
  rotate: (delta: number) => void;
  zoom: (factor: number) => void;
  top: () => void;
  reset: () => void;
}

export interface GarmentViewerProps {
  technique: Technique;
  params: Record<string, number>;
  seed: string;
  carrier: CarrierId;
  /** 当前款式：驱动模型的廓形与取景范围 */
  style?: StyleShape;
  view?: ViewAngle;
  autoRotate?: boolean;
  /** 是否显示右上角操作键（首页展位、工坊都开） */
  showControls?: boolean;
  /** 取景缩放：<1 拉近模型，>1 拉远；只影响默认机位距离，不影响交互缩放范围 */
  zoom?: number;
  /** 布面涂鸦绑定；不给就是纯预览 */
  paint?: GarmentPaint | null;
  /** 同源代理后的 AI 纹样图片；应用到所有衣料贴图 */
  patternImageUrl?: string | null;
  onPatternImageError?: (message: string) => void;
  /** 布面纹样重复密度 */
  textureDensity?: number;
  className?: string;
  fallback?: ReactNode;
}

export function GarmentViewer({
  technique,
  params,
  seed,
  carrier,
  style,
  view = "quarter",
  autoRotate = false,
  showControls = true,
  zoom = 1,
  paint = null,
  patternImageUrl = null,
  onPatternImageError,
  textureDensity = 1,
  className,
  fallback,
}: GarmentViewerProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [spin, setSpin] = useState(autoRotate);
  const [hint, setHint] = useState(true);
  const [full, setFull] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const api = useRef<ViewerApi | null>(null);
  const spec = carrierMap[carrier] ?? carrierMap.scarf;

  useEffect(() => {
    setSupported(hasWebGL());
  }, []);

  // 父级切换自转（工坊、首页）时同步内部状态；用户一上手就暂停，避免「抢方向盘」
  useEffect(() => setSpin(autoRotate), [autoRotate]);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.();
      } else if (shellRef.current?.requestFullscreen) {
        void shellRef.current.requestFullscreen().catch(() => {});
      }
    } catch {
      /* 部分浏览器/内嵌环境禁用全屏，静默降级 */
    }
  }, []);

  const grab = useCallback(() => {
    setHint(false);
    setSpin(false);
  }, []);

  if (supported === false) {
    return <div className={className}>{fallback}</div>;
  }

  if (supported === null) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center text-[11.5px] text-dye-800/40">
          正在准备 3D 视图…
        </div>
      </div>
    );
  }

  const start = AZIMUTH[view];
  const framing = frameOf(carrier, style);
  const r = framing.radius * zoom;
  /** 地面高度：扫描件自带地面就用自己的，否则沿用载体的影棚地面 */
  const ground = style?.glb?.ground ?? spec.ground;

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative overflow-hidden bg-[#F2EFE8]",
        paint?.active && "cursor-crosshair",
        className,
      )}
    >
      {/* 影棚无缝背景：上亮下暗 + 物件后方一团柔光，模拟背景纸与顶灯 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 92% at 50% 8%, #FCFBF7 0%, #F3F0E8 38%, #E2DCD0 72%, #CFC7B8 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 34% at 50% 66%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 72%)",
        }}
      />

      <WebGLBoundary fallback={fallback}>
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 2]}
          shadows="soft"
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.06,
          }}
          camera={{
            position: [
              Math.sin(start) * r,
              framing.target[1] + r * 0.1,
              Math.cos(start) * r,
            ],
            fov: 30,
            near: 0.1,
            far: 60,
          }}
          onPointerDown={grab}
          onDoubleClick={() => api.current?.reset()}
        >
          {/* 环境贴图：用 Lightformer 现场烘，不请求外部 HDR，弱网也能出图 */}
          <Environment resolution={256} frames={1}>
            <Lightformer intensity={2.6} position={[0, 7, -4]} scale={[14, 9, 1]} color="#ffffff" />
            <Lightformer intensity={1.1} position={[-7, 3.5, 4]} scale={[8, 8, 1]} color="#e2edf7" />
            <Lightformer intensity={1.3} position={[7, 2, 4]} scale={[7, 7, 1]} color="#fff3de" />
            <Lightformer intensity={0.5} position={[0, -5, 3]} scale={[10, 10, 1]} color="#cbbda5" />
            <Lightformer
              intensity={1.6}
              form="ring"
              position={[-3, 1, -6]}
              scale={3}
              color="#ffffff"
            />
          </Environment>

          <hemisphereLight args={["#ffffff", "#cfc5b4", 0.5]} />
          <ambientLight intensity={0.18} />

          {/* 主光：左上前方，软阴影，负责布面的明暗过渡 */}
          <directionalLight
            position={[3.6, 6.2, 4.6]}
            intensity={2.1}
            color="#fff7ea"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-radius={6}
          >
            <orthographicCamera attach="shadow-camera" args={[-3.4, 3.4, 3.4, -3.4, 0.5, 20]} />
          </directionalLight>
          {/* 补光：右侧偏冷，压掉阴影里的死黑 */}
          <directionalLight position={[-5.5, 2.6, 2.4]} intensity={0.55} color="#d6e6f4" />
          {/* 轮廓光：背后打亮边缘，物件才从背景里「立」起来 */}
          <directionalLight position={[0.5, 3.2, -6]} intensity={0.95} color="#ffffff" />
          <directionalLight position={[0, 0.6, 5]} intensity={0.18} color="#fff4e2" />

          <Suspense fallback={null}>
            <ModelStage
              technique={technique}
              params={params}
              seed={seed}
              carrier={carrier}
              style={style}
              view={view}
              autoRotate={spin}
              radius={r}
              target={framing.target}
              api={api}
              onInteract={grab}
              paint={paint}
              patternImageUrl={patternImageUrl}
              onPatternImageError={onPatternImageError}
              textureDensity={textureDensity}
            />
          </Suspense>

          <ContactShadows
            position={[0, ground, 0]}
            opacity={0.3}
            scale={7}
            blur={2.2}
            far={3.2}
            resolution={512}
            color="#2b4155"
          />
          {/* 承接投影的地面：没有它，物件会像浮在空中 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ground - 0.002, 0]} receiveShadow>
            <planeGeometry args={[18, 18]} />
            <shadowMaterial opacity={0.14} color="#1e3f5c" />
          </mesh>
        </Canvas>
      </WebGLBoundary>

      {/* 暗角：模拟镜头与影棚边缘的衰减，别让画面四角太「干净」 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(118% 96% at 50% 42%, rgba(0,0,0,0) 52%, rgba(28,38,50,0.12) 100%)",
        }}
      />

      {showControls && (
        <div className="pointer-events-auto absolute right-2.5 top-2.5 z-20 flex flex-col gap-0.5 rounded-2xl border border-dye-900/10 bg-white/60 p-1 shadow-[0_12px_30px_-20px_rgba(16,31,47,0.7)] backdrop-blur-md">
          <ToolButton active={spin} onClick={() => setSpin((v) => !v)} label={spin ? "暂停自转" : "自动旋转"}>
            {spin ? "暂停" : "自转"}
          </ToolButton>
          <ToolButton onClick={() => api.current?.rotate(Math.PI / 4)} label="向左转 45 度">
            ↺
          </ToolButton>
          <ToolButton onClick={() => api.current?.rotate(-Math.PI / 4)} label="向右转 45 度">
            ↻
          </ToolButton>
          <ToolButton onClick={() => api.current?.rotate(Math.PI)} label="翻到背面">
            翻转
          </ToolButton>
          <ToolButton onClick={() => api.current?.zoom(0.82)} label="放大查看">
            ＋
          </ToolButton>
          <ToolButton onClick={() => api.current?.zoom(1.22)} label="缩小">
            －
          </ToolButton>
          <ToolButton onClick={() => api.current?.top()} label="俯视查看">
            俯视
          </ToolButton>
          <ToolButton onClick={() => api.current?.reset()} label="复位视角">
            复位
          </ToolButton>
          <ToolButton onClick={toggleFull} label={full ? "退出全屏" : "全屏查看"}>
            {full ? "退出" : "全屏"}
          </ToolButton>
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-dye-950/55 px-2.5 py-1 text-[10px] tracking-wide text-cloth-50/90 backdrop-blur-sm transition-opacity duration-500",
          hint ? "opacity-100" : "opacity-0",
        )}
      >
        拖动翻转 · 滚轮缩放 · 双击复位
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-[22px] min-w-[26px] place-items-center rounded-full px-1.5 text-[10.5px] leading-none transition-colors",
        active
          ? "bg-dye-700 text-cloth-50"
          : "text-dye-800/65 hover:bg-dye-700/10 hover:text-dye-800",
      )}
    >
      {children}
    </button>
  );
}

function ModelStage({
  technique,
  params,
  seed,
  carrier,
  style,
  view,
  autoRotate,
  radius,
  target,
  api,
  onInteract,
  paint,
  patternImageUrl,
  onPatternImageError,
  textureDensity,
}: {
  technique: Technique;
  params: Record<string, number>;
  seed: string;
  carrier: CarrierId;
  style?: StyleShape;
  view: ViewAngle;
  autoRotate: boolean;
  radius: number;
  target: [number, number, number];
  api: { current: ViewerApi | null };
  onInteract: () => void;
  paint?: GarmentPaint | null;
  patternImageUrl?: string | null;
  onPatternImageError?: (message: string) => void;
  textureDensity: number;
}) {
  const spec = carrierMap[carrier] ?? carrierMap.scarf;
  // 刺绣不做满幅重复：一块布上只有一处主纹，贴图 1:1 铺一次。
  // 程序化筒身 UV 的正前方在 0.25 处，偏移 0.25 把图案挪到胸前正对镜头；
  // 扫描载体（tee/tote）的柱面 UV 正前方就在 0.5，无需偏移。
  const embroidered = technique.category === "embroider" && Boolean(technique.pattern);
  const scanned = SCANNED_CARRIERS.has(carrier);
  const tube = carrier === "dress" || carrier === "skirt" || carrier === "shirt" || carrier === "tee" || carrier === "apron";
  // 款式自带扫描件时，纹样按模型自己的展开 UV 铺满一张，不重复也不偏移
  const scannedStyle = style?.glb;
  const repeat: [number, number] = embroidered || scannedStyle ? [1, 1] : spec.repeat;
  const offset: [number, number] = scannedStyle
    ? [0, 0]
    : embroidered
      ? [tube && !scanned ? 0.25 : 0, 0]
      : [0, 0];
  const densityRepeat = useMemo<[number, number]>(
    () => [repeat[0] * textureDensity, repeat[1] * textureDensity],
    [repeat[0], repeat[1], textureDensity],
  );
  const procedural = useClothTexture(
    technique,
    params,
    seed,
    densityRepeat,
    offset,
  );
  const Model = models[carrier] ?? models.scarf;

  const group = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const { camera, gl } = useThree();

  useEffect(() => {
    if (!patternImageUrl) return;

    let cancelled = false;
    let loadedTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.load(
      patternImageUrl,
      (texture) => {
        loadedTexture = texture;
        if (cancelled) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        const root = group.current;
        if (!root) {
          onPatternImageError?.("3D 模型尚未准备完成，请稍后重试应用纹样。");
          return;
        }

        let applied = 0;
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          for (const material of materials) {
            if (!material.userData.paintLayer || !material.map) continue;
            const canvas = material.map.image as HTMLCanvasElement | undefined;
            const context = canvas?.getContext("2d");
            if (!canvas || !context) continue;

            context.save();
            context.globalCompositeOperation = "multiply";
            context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
            context.restore();
            material.map.needsUpdate = true;
            applied += 1;
          }
        });

        if (applied === 0) {
          onPatternImageError?.("没有找到可应用纹样的布料材质，请稍后重试。");
        }
      },
      undefined,
      () => {
        if (!cancelled) onPatternImageError?.("纹样图片加载失败，请重新生成后重试。");
      },
    );

    return () => {
      cancelled = true;
      loadedTexture?.dispose();
    };
  }, [patternImageUrl, onPatternImageError]);

  /** 屏幕坐标 → 命中衣片的（图层 id, UV） */
  const pick = (clientX: number, clientY: number) => {
    const root = group.current;
    if (!root) return null;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(root, true);
    for (const it of hits) {
      if (!it.uv) continue;
      const layer = paint ? paint.layerOf(it.object) : null;
      if (paint && !layer) continue;
      return { layer, uv: it.uv };
    }
    return null;
  };

  // 直接监听 WebGL 画布的指针事件：比 R3F 事件更可控，
  // 涂鸦时按下并拖动即落笔，松开或划出画布就收笔。
  // 起笔点即使稍偏（没按在布上），只要拖到布面就开始画——
  // 涂鸦模式下轨道已让位，空按一下不该让用户觉得「没反应」。
  // 拖拽状态放 ref：中途任何重渲染（比如 onInteract 关自转）都不会打断这一笔。
  const strokeState = useRef({ painting: false, began: false, layer: null as string | null });
  useEffect(() => {
    if (!paint?.active) return;
    const el = gl.domElement;

    const startStroke = (hit: { layer: string | null; uv: THREE.Vector2 }) => {
      if (!hit.layer) return;
      const s = strokeState.current;
      if (!s.began || hit.layer !== s.layer) {
        if (s.began && s.layer) paint.end();
        paint.begin(hit.layer);
        s.layer = hit.layer;
        s.began = true;
        onInteract();
      }
      paint.stroke(hit.layer, hit.uv.x, hit.uv.y);
    };

    const down = (e: PointerEvent) => {
      strokeState.current = { painting: true, began: false, layer: null };
      el.setPointerCapture?.(e.pointerId);
      const hit = pick(e.clientX, e.clientY);
      if (hit) startStroke(hit);
    };
    const move = (e: PointerEvent) => {
      if (!strokeState.current.painting) return;
      const hit = pick(e.clientX, e.clientY);
      if (hit) startStroke(hit);
    };
    const up = () => {
      const s = strokeState.current;
      if (!s.painting) return;
      s.painting = false;
      if (s.began) paint.end();
      s.began = false;
      s.layer = null;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    // pick 闭包里的 paint/brush 每次渲染都是新的，靠无依赖刷新
  });

  const fabric = paint ? (
    <PaintFabricMaterial
      engine={paint.engine}
      surface={technique.surface}
      weave={scannedStyle ? 0.22 : 1}
      repeat={densityRepeat}
    />
  ) : (
    <FabricMaterial
      texture={procedural}
      surface={technique.surface}
      weave={scannedStyle ? 0.22 : 1}
    />
  );

  return (
    <group ref={group} position={[0, 0, 0]}>
      {scannedStyle ? (
        <ScannedFabric
          src={scannedStyle.src}
          scale={scannedStyle.scale ?? 1}
          y={scannedStyle.ground ?? 0}
          fabric={fabric}
        />
      ) : (
        <Model fabric={fabric} style={style} />
      )}
      <CameraRig
        carrier={carrier}
        view={view}
        autoRotate={autoRotate}
        radius={radius}
        target={target}
        api={api}
        onInteract={onInteract}
        enabled={!paint?.active}
      />
    </group>
  );
}

function CameraRig({
  carrier,
  view,
  autoRotate,
  radius,
  target,
  api,
  onInteract,
  enabled = true,
}: {
  carrier: CarrierId;
  view: ViewAngle;
  autoRotate: boolean;
  radius: number;
  target: [number, number, number];
  api: { current: ViewerApi | null };
  onInteract: () => void;
  /** 涂鸦时关掉轨道控制，否则一拖就转模型而不是落笔 */
  enabled?: boolean;
}) {
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const targetVec = useMemo(
    () => new THREE.Vector3(target[0], target[1], target[2]),
    [target[0], target[1], target[2]],
  );
  // 当前取景放到 ref 里，复位键永远回到「这一次」的构图
  const framing = useRef({ radius, target, view });
  framing.current = { radius, target, view };

  // 换载体：重置机位与目标点，避免上一个载体的取景残留
  useEffect(() => {
    const az = AZIMUTH[view];
    camera.position.set(
      Math.sin(az) * radius,
      target[1] + radius * 0.1,
      Math.cos(az) * radius,
    );
    if (controls.current) {
      controls.current.target.set(target[0], target[1], target[2]);
      controls.current.update();
    }
    // view 的变化单独处理，这里只在换载体时跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier, radius, target[1]]);

  // 切机位：直接转到对应方位角，保留用户当前的俯仰与距离
  useEffect(() => {
    if (!controls.current) return;
    controls.current.setAzimuthalAngle(AZIMUTH[view]);
    controls.current.update();
  }, [view]);

  // 把相机动作交给浮层按钮
  useEffect(() => {
    api.current = {
      rotate(delta) {
        const c = controls.current;
        if (!c) return;
        c.setAzimuthalAngle(c.getAzimuthalAngle() + delta);
        c.update();
      },
      zoom(factor) {
        const c = controls.current;
        if (!c) return;
        const dist = camera.position.distanceTo(c.target);
        const next = THREE.MathUtils.clamp(
          dist * factor,
          c.minDistance ?? radius * 0.35,
          c.maxDistance ?? radius * 2.4,
        );
        const dir = camera.position.clone().sub(c.target).normalize();
        camera.position.copy(c.target).addScaledVector(dir, next);
        c.update();
      },
      top() {
        const c = controls.current;
        if (!c) return;
        c.setPolarAngle(0.62);
        c.setAzimuthalAngle(0.18);
        c.update();
      },
      reset() {
        const f = framing.current;
        const az = AZIMUTH[f.view];
        camera.position.set(
          Math.sin(az) * f.radius,
          f.target[1] + f.radius * 0.1,
          Math.cos(az) * f.radius,
        );
        const c = controls.current;
        if (c) {
          c.target.set(f.target[0], f.target[1], f.target[2]);
          c.update();
        }
      },
    };
    return () => {
      api.current = null;
    };
  }, [api, camera, radius]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={enabled}
      screenSpacePanning
      enableRotate={enabled}
      autoRotate={autoRotate && enabled}
      autoRotateSpeed={0.9}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.85}
      zoomSpeed={0.9}
      target={targetVec}
      minDistance={radius * 0.35}
      maxDistance={radius * 2.4}
      minPolarAngle={0.16}
      maxPolarAngle={1.78}
      onStart={onInteract}
    />
  );
}

/**
 * 取景：长裙与短裙、小包与大包不能共用同一个相机距离。
 * 这里按品类与款式长度给一个稳定的构图，换款式不会「忽远忽近」。
 */
function frameOf(carrier: CarrierId, style?: StyleShape) {
  const spec = carrierMap[carrier] ?? carrierMap.scarf;
  const len = style?.len ?? 0.5;
  const flare = style?.flare ?? 0.5;

  // 扫描件自带取景：它跟载体的尺寸没有关系，别用载体的机位去框它
  if (style?.glb) {
    return {
      radius: style.glb.radius ?? spec.radius,
      target: [spec.target[0], style.glb.targetY ?? spec.target[1], spec.target[2]] as [
        number,
        number,
        number,
      ],
    };
  }

  let scale = 1;
  let drop = 0;
  if (carrier === "dress" || carrier === "skirt") {
    // 连衣裙/裙：取景框住「肩到摆」全长，目标点落在衣身中段
    scale = 0.98 + len * 0.3;
    drop = -(0.05 + len * 0.32);
  } else if (carrier === "shirt" || carrier === "tee") {
    scale = 0.94 + len * 0.1;
  } else if (carrier === "tote" || carrier === "crossbody" || carrier === "backpack") {
    scale = 0.88 + Math.max(len, flare) * 0.26;
  } else if (carrier === "scarf" || carrier === "shawl" || carrier === "cushion") {
    scale = 0.84 + Math.max(len, flare) * 0.32;
  } else {
    scale = 0.9 + (style?.brim ?? 0.5) * 0.2;
  }

  return {
    radius: spec.radius * scale,
    target: [spec.target[0], spec.target[1] + drop, spec.target[2]] as [
      number,
      number,
      number,
    ],
  };
}

/* ---------- 降级与错误边界 ---------- */

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

class WebGLBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[3d] 渲染失败，已降级为静态预览：", error);
  }

  render() {
    if (this.state.failed) {
      return <div className="h-full w-full">{this.props.fallback}</div>;
    }
    return this.props.children;
  }
}
