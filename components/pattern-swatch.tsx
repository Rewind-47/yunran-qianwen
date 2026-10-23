import { seededRandom, hashString } from "@/lib/utils";
import type { Motif } from "@/lib/types";

interface Props {
  /** 用于生成稳定随机序列，同一个 id 永远画同一块布 */
  seed: string;
  motif: Motif;
  palette: string[];
  className?: string;
  /** 详情页开启，边缘会有更明显的晕染扰动 */
  detailed?: boolean;
}

/** SVG 坐标统一保留两位小数：避免服务端/客户端浮点尾差触发 hydration 告警 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 程序化生成扎染纹样。
 * 不依赖任何图片素材：所有纹样都由「底色 + 晕染 + 纹样骨架」三层 SVG 叠出来，
 * 既能保证全站视觉统一，也方便后期直接替换成真实作品图。
 */
export function PatternSwatch({ seed, motif, palette, className, detailed = false }: Props) {
  const uid = `p${hashString(seed).toString(36)}`;
  const base = palette[0] ?? "#F6F1E6";
  const deep = palette[1] ?? "#1E3F5C";
  const accent = palette[2] ?? "#9FBEDA";
  const rand = seededRandom(hashString(seed));

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="扎染纹样示意图"
    >
      <defs>
        <radialGradient id={`${uid}-wash`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor={deep} stopOpacity="0.92" />
          <stop offset="55%" stopColor={deep} stopOpacity="0.55" />
          <stop offset="100%" stopColor={base} stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id={`${uid}-bleed`}>
          <stop offset="0%" stopColor={deep} stopOpacity="0.85" />
          <stop offset="70%" stopColor={deep} stopOpacity="0.35" />
          <stop offset="100%" stopColor={deep} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-wobble`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={detailed ? 4 : 2.6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id={`${uid}-weave`} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0H4M0 0V4" stroke="#101F2F" strokeOpacity="0.05" strokeWidth="0.4" />
        </pattern>
      </defs>

      <rect width="100" height="100" fill={base} />
      <g filter={`url(#${uid}-wobble)`}>{renderMotif(motif, uid, deep, accent, base, rand)}</g>
      <rect width="100" height="100" fill={`url(#${uid}-weave)`} opacity="0.6" />
    </svg>
  );
}

function renderMotif(
  motif: Motif,
  uid: string,
  deep: string,
  accent: string,
  base: string,
  rand: () => number,
) {
  switch (motif) {
    case "spiral": {
      const rings = 4 + Math.round(rand() * 4);
      return (
        <>
          <rect width="100" height="100" fill={`url(#${uid}-wash)`} />
          {Array.from({ length: rings }).map((_, i) => {
            const r = r2(8 + i * (34 / rings));
            return (
              <circle
                key={i}
                cx={50}
                cy={50}
                r={r}
                fill="none"
                stroke={i % 2 === 0 ? "#F6F1E6" : accent}
                strokeOpacity={i % 2 === 0 ? 0.55 : 0.4}
                strokeWidth={2.4 - i * 0.18}
              />
            );
          })}
          <circle cx="50" cy="50" r="4.5" fill="#F6F1E6" fillOpacity="0.8" />
          <circle cx="50" cy="50" r="9" fill="none" stroke={deep} strokeOpacity="0.5" strokeWidth="0.8" />
        </>
      );
    }
    case "cloud": {
      const blobs = Array.from({ length: 7 }).map(() => ({
        x: r2(8 + rand() * 84),
        y: r2(8 + rand() * 84),
        r: r2(14 + rand() * 26),
      }));
      return (
        <>
          <rect width="100" height="100" fill={accent} fillOpacity="0.25" />
          {blobs.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${uid}-bleed)`} />
          ))}
          <rect width="100" height="100" fill="#F6F1E6" fillOpacity="0.18" />
        </>
      );
    }
    case "web": {
      const rays = 10 + Math.round(rand() * 6);
      return (
        <>
          <rect width="100" height="100" fill={deep} fillOpacity="0.9" />
          {Array.from({ length: rays }).map((_, i) => {
            const a = (i / rays) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={50}
                y1={50}
                x2={r2(50 + Math.cos(a) * 72)}
                y2={r2(50 + Math.sin(a) * 72)}
                stroke="#F6F1E6"
                strokeOpacity="0.55"
                strokeWidth="1.6"
              />
            );
          })}
          {[16, 30, 44].map((r, i) => (
            <circle
              key={r}
              cx={50}
              cy={50}
              r={r}
              fill="none"
              stroke={accent}
              strokeOpacity={0.5 - i * 0.1}
              strokeWidth="0.9"
            />
          ))}
          <circle cx="50" cy="50" r="6" fill="#F6F1E6" fillOpacity="0.85" />
        </>
      );
    }
    case "dot": {
      const step = 11;
      const cells: { x: number; y: number; r: number }[] = [];
      for (let y = 6; y < 100; y += step) {
        for (let x = 6; x < 100; x += step) {
          cells.push({
            x: r2(x + (rand() - 0.5) * 3),
            y: r2(y + (rand() - 0.5) * 3),
            r: r2(1.4 + rand() * 1.6),
          });
        }
      }
      return (
        <>
          <rect width="100" height="100" fill={deep} fillOpacity="0.88" />
          {cells.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={c.r}
            fill="#F6F1E6"
            fillOpacity={r2(0.55 + rand() * 0.3)}
            />
          ))}
        </>
      );
    }
    case "stripe": {
      const bands = 5 + Math.round(rand() * 3);
      return (
        <>
          <rect width="100" height="100" fill={deep} />
          {Array.from({ length: bands }).map((_, i) => {
            const h = 100 / bands;
            return (
              <rect
                key={i}
                x="0"
                y={i * h + h * 0.28}
                width="100"
                height={h * 0.44}
                fill="#F6F1E6"
                fillOpacity={i % 2 === 0 ? 0.82 : 0.5}
              />
            );
          })}
          <rect x="47" y="0" width="6" height="100" fill={accent} fillOpacity="0.5" />
        </>
      );
    }
    case "crackle": {
      const lines = Array.from({ length: 16 }).map(() => {
        let x = r2(rand() * 100);
        let y = r2(rand() * 100);
        let d = `M${x} ${y}`;
        for (let i = 0; i < 3; i += 1) {
          x = r2(Math.min(100, Math.max(0, x + (rand() - 0.5) * 18)));
          y = r2(Math.min(100, Math.max(0, y + (rand() - 0.5) * 18)));
          d += `L${x} ${y}`;
        }
        return d;
      });
      return (
        <>
          <rect width="100" height="100" fill={deep} fillOpacity="0.92" />
          <ellipse cx="42" cy="44" rx="26" ry="20" fill={base} fillOpacity="0.9" />
          <ellipse cx="63" cy="62" rx="18" ry="14" fill={base} fillOpacity="0.85" />
          <ellipse cx="34" cy="70" rx="12" ry="9" fill={base} fillOpacity="0.8" />
          {lines.map((d, i) => (
            <path key={i} d={d} stroke={deep} strokeOpacity="0.55" strokeWidth="0.8" fill="none" />
          ))}
        </>
      );
    }
    case "rhombus": {
      const cols = 6;
      const cell = 100 / cols;
      const cells: { x: number; y: number }[] = [];
      for (let row = -1; row <= cols; row += 1) {
        for (let col = -1; col <= cols; col += 1) {
          cells.push({
            x: r2(col * cell + cell / 2 + (row % 2 ? cell / 2 : 0)),
            y: r2(row * cell * 0.86 + cell / 2),
          });
        }
      }
      return (
        <>
          <rect width="100" height="100" fill={deep} fillOpacity="0.9" />
          {cells.map((c, i) => (
            <rect
              key={i}
              x={r2(c.x - cell * 0.3)}
              y={r2(c.y - cell * 0.3)}
              width={cell * 0.6}
              height={cell * 0.6}
              fill={accent}
              fillOpacity="0.85"
              transform={`rotate(45 ${c.x} ${c.y})`}
            />
          ))}
        </>
      );
    }
    case "wave": {
      const rows = 7;
      return (
        <>
          <rect width="100" height="100" fill={deep} fillOpacity="0.9" />
          {Array.from({ length: rows }).map((_, i) => {
            const y = r2(8 + (i * 84) / (rows - 1));
            return (
              <path
                key={i}
                d={`M0 ${y} Q12 ${r2(y - 7)} 25 ${y} T50 ${y} T75 ${y} T100 ${y}`}
                stroke={i % 2 === 0 ? accent : base}
                strokeOpacity={0.65}
                strokeWidth="1.4"
                fill="none"
              />
            );
          })}
        </>
      );
    }
    case "peony": {
      const petals = 7;
      return (
        <>
          <rect width="100" height="100" fill={base} fillOpacity="0.9" />
          {Array.from({ length: petals }).map((_, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="33"
              rx="13"
              ry="20"
              fill={accent}
              fillOpacity={0.55 + (i % 2) * 0.2}
              stroke={deep}
              strokeOpacity="0.3"
              strokeWidth="0.5"
              transform={`rotate(${(i / petals) * 360} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="9" fill={deep} fillOpacity="0.55" />
          <circle cx="50" cy="50" r="4" fill={accent} fillOpacity="0.9" />
          <path d="M28 78 Q46 66 58 74" stroke={deep} strokeOpacity="0.45" strokeWidth="1.1" fill="none" />
        </>
      );
    }
    case "chain": {
      const rows = 5;
      const links: { x: number; y: number }[] = [];
      for (let row = 0; row < rows; row += 1) {
        const y = r2(12 + (row * 76) / (rows - 1));
        for (let x = 6; x < 100; x += 9) links.push({ x: r2(x), y });
      }
      return (
        <>
          <rect width="100" height="100" fill={base} fillOpacity="0.9" />
          {links.map((l, i) => (
            <ellipse
              key={i}
              cx={l.x}
              cy={l.y}
              rx="3.6"
              ry="2.8"
              fill="none"
              stroke={accent}
              strokeOpacity="0.9"
              strokeWidth="1.1"
            />
          ))}
        </>
      );
    }
    case "seed": {
      const cells: { x: number; y: number }[] = [];
      for (let y = 6; y < 100; y += 9) {
        for (let x = 6; x < 100; x += 9) {
          if ((x - 50) ** 2 + (y - 50) ** 2 > 40 ** 2) continue;
          cells.push({ x: r2(x + (rand() - 0.5) * 2), y: r2(y + (rand() - 0.5) * 2) });
        }
      }
      return (
        <>
          <rect width="100" height="100" fill={base} fillOpacity="0.88" />
          {cells.map((c, i) => (
            <g key={i}>
              <circle cx={r2(c.x + 0.5)} cy={r2(c.y + 0.5)} r="2.4" fill={deep} fillOpacity="0.25" />
              <circle cx={c.x} cy={c.y} r="2.4" fill={accent} fillOpacity="0.95" />
              <circle cx={r2(c.x - 0.7)} cy={r2(c.y - 0.7)} r="0.9" fill="#FFF" fillOpacity="0.6" />
            </g>
          ))}
        </>
      );
    }
    case "cross": {
      const marks: { x: number; y: number }[] = [];
      for (let y = 8; y < 100; y += 8) {
        for (let x = 8; x < 100; x += 8) {
          const d = Math.max(Math.abs(x - 50), Math.abs(y - 50));
          if (d > 40 || (d < 12 && d > 4)) continue;
          if (d < 4) continue;
          marks.push({ x, y });
        }
      }
      return (
        <>
          <rect width="100" height="100" fill={base} fillOpacity="0.9" />
          {marks.map((m, i) => (
            <g key={i} stroke={accent} strokeOpacity="0.92" strokeWidth="1.3" strokeLinecap="round">
              <line x1={r2(m.x - 2)} y1={r2(m.y - 2)} x2={r2(m.x + 2)} y2={r2(m.y + 2)} />
              <line x1={r2(m.x + 2)} y1={r2(m.y - 2)} x2={r2(m.x - 2)} y2={r2(m.y + 2)} />
            </g>
          ))}
        </>
      );
    }
    case "flower":
    default: {
      const petals = 5 + Math.round(rand() * 3);
      return (
        <>
          <rect width="100" height="100" fill={`url(#${uid}-wash)`} />
          {Array.from({ length: petals }).map((_, i) => {
            const a = (i / petals) * 360;
            return (
              <ellipse
                key={i}
                cx="50"
                cy="31"
                rx="11"
                ry="19"
                fill="#F6F1E6"
                fillOpacity="0.72"
                transform={`rotate(${a} 50 50)`}
              />
            );
          })}
          <circle cx="50" cy="50" r="10" fill={accent} fillOpacity="0.85" />
          <circle cx="50" cy="50" r="5.5" fill="#F6F1E6" fillOpacity="0.9" />
        </>
      );
    }
  }
}
