import type { ReactNode } from "react";
import type { Style } from "@/lib/data/styles";
import type { CarrierId } from "@/lib/data/carriers";

function silhouetteFor(style: Style): CarrierId {
  return style.shape.glb?.shot ?? (style.shape.glb ? "cushion" : style.model);
}

export function StyleSilhouette({ style }: { style: Style }) {
  const model = silhouetteFor(style);
  const flare = style.shape.flare ?? 0.5;
  const skirtWidth = 27 + flare * 10;
  const hemY = 91 + (style.shape.len ?? 0.55) * 12;

  let shape: ReactNode;
  switch (model) {
    case "dress":
      shape = (
        <>
          <path
            d={`M39 20 Q50 24 61 20 L68 40 L61 49 L${skirtWidth + 50} 100 Q50 106 ${50 - skirtWidth} 100 L39 49 L32 40 Z`}
          />
          <path d="M41 22 Q50 28 59 22 M40 48 Q50 51 60 48" />
          <path d="M50 51 L50 99" />
        </>
      );
      break;
    case "skirt":
      shape = (
        <>
          <path d={`M36 29 Q50 33 64 29 L${50 + skirtWidth} ${hemY} Q50 ${hemY + 5} ${50 - skirtWidth} ${hemY} Z`} />
          <path d="M37 35 Q50 39 63 35 M43 38 L40 88 M50 39 L50 92 M57 38 L60 88" />
        </>
      );
      break;
    case "shirt":
    case "tee":
      shape = (
        <>
          <path d="M37 22 L27 26 L17 43 L27 49 L33 41 L33 91 Q50 96 67 91 L67 41 L73 49 L83 43 L73 26 L63 22 Q50 30 37 22 Z" />
          <path d={model === "shirt" ? "M43 24 L50 35 L57 24 M50 35 L50 91 M46 43 L46 45 M46 54 L46 56 M46 65 L46 67" : "M42 24 Q50 31 58 24"} />
        </>
      );
      break;
    case "apron":
      shape = (
        <>
          <path d="M40 25 Q50 31 60 25 L64 43 L73 94 Q50 101 27 94 L36 43 Z" />
          <path d="M42 28 Q50 45 58 28 M36 56 L25 54 M64 56 L75 54 M38 72 Q50 75 62 72 L60 86 Q50 89 40 86 Z" />
        </>
      );
      break;
    case "bucketHat":
      shape = (
        <>
          <path d="M34 50 Q36 25 50 24 Q64 25 66 50 L73 61 Q50 69 27 61 Z" />
          <path d="M35 49 Q50 55 65 49 M29 60 Q50 66 71 60" />
        </>
      );
      break;
    case "cap":
      shape = (
        <>
          <path d="M29 52 Q30 27 50 25 Q69 27 71 52 Q53 58 29 52 Z" />
          <path d="M50 26 L50 52 M70 48 Q83 49 88 57 Q71 62 52 55" />
        </>
      );
      break;
    case "beret":
      shape = (
        <>
          <path d="M22 56 Q25 34 44 30 Q65 25 78 48 Q69 59 49 59 Q33 61 22 56 Z" />
          <path d="M26 57 Q49 63 74 54 M50 29 L51 24" />
        </>
      );
      break;
    case "headband":
      shape = (
        <>
          <path d="M24 64 Q27 34 50 34 Q73 34 76 64 L67 68 Q64 47 50 47 Q36 47 33 68 Z" />
          <path d="M40 37 Q50 43 60 37" />
        </>
      );
      break;
    case "tote":
      shape = (
        <>
          <path d="M30 43 L70 43 L76 94 Q50 101 24 94 Z" />
          <path d="M39 45 L39 35 Q39 22 50 22 Q61 22 61 35 L61 45 M37 59 L63 59" />
        </>
      );
      break;
    case "crossbody":
      shape = (
        <>
          <path d="M34 48 L68 48 L72 88 Q51 94 30 88 Z" />
          <path d="M39 48 Q40 29 50 26 Q61 30 64 48 M28 39 L72 85 M33 62 L67 62" />
        </>
      );
      break;
    case "backpack":
      shape = (
        <>
          <path d="M33 42 Q34 30 50 29 Q66 30 67 42 L73 88 Q72 98 50 98 Q28 98 27 88 Z" />
          <path d="M40 36 Q40 24 50 24 Q60 24 60 36 M36 62 Q50 58 64 62 L66 84 Q50 89 34 84 Z M27 52 Q20 58 23 78 M73 52 Q80 58 77 78" />
        </>
      );
      break;
    case "scarf":
    case "shawl":
      shape = (
        <>
          <path d="M29 26 Q50 22 71 26 L66 84 L59 100 L50 90 L41 101 L34 84 Z" />
          <path d="M34 37 Q50 42 68 37 M33 54 Q50 59 67 54 M32 72 Q50 77 66 72" />
        </>
      );
      break;
    case "cushion":
    default:
      shape = (
        <>
          <path d="M29 34 Q50 28 71 34 L74 83 Q50 91 26 83 Z" />
          <path d="M34 40 Q50 36 66 40 L68 77 Q50 83 32 77 Z M39 43 L61 76 M61 43 L39 76" />
        </>
      );
  }

  return (
    <svg
      aria-label={`${style.name}白模轮廓`}
      role="img"
      viewBox="0 0 100 120"
      className="absolute inset-0 h-full w-full p-4"
      fill="#fff"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      <g className="text-[#d5d3cc]">{shape}</g>
    </svg>
  );
}
