import type { Pattern } from "@/lib/types";
import { patternMap } from "@/lib/data/patterns";

const galleryPatternSources: {
  sourceId: string;
  id: string;
  name: string;
  techniqueId: string;
  photo: string;
  meaning?: string;
  narration?: string;
}[] = [
  {
    sourceId: "web-ice",
    id: "ice-crackle",
    name: "冰裂纹",
    techniqueId: "wax",
    photo: "/images/patterns/bingliewen.png",
    meaning: "蜡层受折后形成纵横交错的细密裂纹，深浅蓝白相映，呈现冰面开片般的肌理。",
    narration:
      "冰裂纹常见于蜡染防染效果。蜡层开裂后，染液沿裂隙渗入，脱蜡后留下自然交错的纹理。",
  },
  {
    sourceId: "phoenix",
    id: "bee-feather",
    name: "蜂羽纹",
    techniqueId: "spiral",
    photo: "/images/patterns/fengyuwen.jpg",
    meaning: "以图片所示的细密、层叠纹理为特色；具体寓意和技法可能因地域与传承而异。",
    narration:
      "蜂羽纹的图案呈现细密层叠的视觉效果。其具体寓意与制作技法，请以图片来源和当地传承记录为准。",
  },
  {
    sourceId: "butterfly",
    id: "butterfly",
    name: "蝴蝶纹",
    techniqueId: "bean",
    photo: "/images/patterns/hudiewen.jpg",
  },
  {
    sourceId: "clamp-geometry",
    id: "clamp-geometry",
    name: "夹板回纹",
    techniqueId: "clamp",
    photo: "/images/patterns/jiabanhuiwen.jpg",
  },
  {
    sourceId: "camelia",
    id: "camelia",
    name: "山茶花纹",
    techniqueId: "bean",
    photo: "/images/patterns/shanchahuawen.jpg",
  },
  {
    sourceId: "pomegranate",
    id: "pomegranate",
    name: "石榴纹",
    techniqueId: "bean",
    photo: "/images/patterns/shiliuwen.jpg",
  },
  {
    sourceId: "fish",
    id: "fish",
    name: "双鱼纹",
    techniqueId: "web",
    photo: "/images/patterns/shuangyuwen.jpg",
  },
  {
    sourceId: "spiral-sun",
    id: "sun",
    name: "太阳纹",
    techniqueId: "spiral",
    photo: "/images/patterns/taiyangwen.jpg",
  },
  {
    sourceId: "fish-roe",
    id: "fish-roe",
    name: "鱼子纹",
    techniqueId: "dot",
    photo: "/images/patterns/yuziwen.jpg",
  },
  {
    sourceId: "bamboo",
    id: "bamboo",
    name: "竹节纹",
    techniqueId: "clamp",
    photo: "/images/patterns/zhujiewen.jpg",
  },
];

export const galleryPatterns: Pattern[] = galleryPatternSources.map(
  ({ sourceId, ...overrides }) => {
    const source = patternMap[sourceId];
    if (!source) {
      throw new Error(`图鉴纹样缺少源数据: ${sourceId}`);
    }
    return { ...source, ...overrides };
  },
);
