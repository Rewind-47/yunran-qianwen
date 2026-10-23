# 云染千纹 · 云南白族扎染非遗 AI 交互展示平台

> 传智杯 AI Web 网页开发挑战赛参赛作品 · 选题方向：**文化共创**

扎染的工艺本质是「局部防染」——扎住的地方不上色，于是有了纹样。本项目把这条工艺逻辑拆成三层：**看得懂（展馆）→ 问得到（知识库）→ 做得出（工坊）**。

---

## 一、当前进度

可运行的 Next.js 14 工程，页面、路由、状态、接口全部打通。AI 能力已按真实链路接好：配置密钥即走大模型 / 通义万相；未配置时自动降级为本地检索与程序化渲染，**演示环境不会白屏、不会报错**。

| 能力 | 状态 | 实现位置 |
|---|---|---|
| 页面与路由 | 完成 | `app/` |
| 设计系统（靛蓝 + 米白） | 完成 | `tailwind.config.ts` / `app/globals.css` |
| 纹样程序化渲染（2D） | 完成 | `components/pattern-swatch.tsx` |
| 纹样程序化渲染（Canvas / 3D 贴图） | 完成 | `lib/render/pattern-canvas.ts` |
| 工具注册表（Function Calling / MCP 结构） | 完成 | `lib/tools.ts` |
| 工艺参数 → 提示词映射 | 完成 | `lib/prompts.ts` |
| RAG 混合检索（BM25 + 向量） | 完成 | `lib/rag.ts` |
| 知识库问答（流式 / 带引用 / 拒答） | 已接大模型 + 本地兜底 | `app/api/chat/route.ts` |
| 创作 Agent（规划→工具→自检→回答） | 已接大模型 + 本地兜底 | `lib/llm/agent.ts` |
| 图像生成（通义万相） | 已接 + 本地渲染兜底 | `lib/wanx.ts` |
| 局部重绘（遮罩 / 指令 / 像素校验） | 已接万相 `description_edit_with_mask` | `app/api/inpaint/route.ts` |
| 3D 成品视图 | 完成（react-three-fiber，含 WebGL 降级） | `components/garment-viewer.tsx` |
| 款式库（6 品类 × 50 款 = 300 款，廓形参数驱动 3D） | 完成 | `lib/data/styles.ts` / `lib/db/` |
| 自选颜色（白坯布 + 取色器 + 草木染配方） | 完成 | `store/studio.ts` / `lib/data/palettes.ts` |
| 语音解说 | 浏览器原生 TTS | `components/gallery-grid.tsx` |

---

## 二、跑起来

```bash
npm install
npm run dev
# http://localhost:3000
```

无需密钥即可完整浏览与操作：问答走本地检索，Agent 走本地规则编排，出图走程序化渲染，3D 走浏览器 WebGL。

配置真实模型：

```bash
cp .env.example .env.local
```

| 变量 | 作用 | 不配时的行为 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 通义千问（对话）+ 通义万相（图像）+ text-embedding-v3（向量） | 本地检索 / 本地渲染 |
| `DEEPSEEK_API_KEY` | 备选对话模型（无 DashScope 时生效） | — |
| `LLM_MODEL` | 模型名，默认 `qwen-plus` | — |
| `LLM_BASE_URL` + `LLM_API_KEY` | 任意 OpenAI 兼容网关（vLLM / Ollama / 自建） | — |
| `ENABLE_EMBEDDING=false` | 关掉向量通道，只走词法召回 | 词法召回 |
| `ENABLE_IMAGE_API=false` | 强制使用本地程序化渲染 | — |

> 受限环境提示：若本机 `NODE_OPTIONS` 注入了批量删除守卫，Next 清理 `.next` 会被拦。用
> `NEXT_DIST_DIR=.dev-cache npm run dev` 换一个构建目录即可；普通机器直接 `npm run dev`。

---

## 三、目录结构

```
app/
  page.tsx                  门户首页：官网风格（轮播 Banner / 资讯中心 / 快速通道 / 影像志）
  gallery/                  非遗图鉴（纹样图鉴 + 语音解说）
  knowledge/                智能知识库（RAG 问答 + 语料/状态面板）
  studio/
    page.tsx                工坊总览：个性工坊 / 灵感广场 / 局部重绘 三大入口
    personal/[family]/      个性工坊按工艺分三页：tie 扎染 / print 印染 / embroider 刺绣
    inspiration/            灵感广场：作品流 + AI 参谋
    inpaint/                局部重绘：遮罩 + 指令 + 前后对比 + 像素校验
  api/
    chat/route.ts           RAG 问答（NDJSON 流式，带引用）
    agent/route.ts          创作 Agent 事件流
    inpaint/route.ts        局部重绘（万相异步任务）
    image-proxy/route.ts    生成图同源代理（解决 CORS 与画布污染）
    status/route.ts         模型/检索/工具运行状态
components/
  hero-banner.tsx           门户首页轮播（自动轮播 + 指示器）
  pattern-swatch.tsx        纹样程序化生成（SVG，无图片资源依赖）
  garment/                  3D 服装系统（按品类拆分建模，零外部模型文件）
    geometry.ts             放样 / 布料垂坠 / 圆管 / 扇形板 等造型工具
    materials.tsx           面料材质（按工艺表面质感区分粗糙度与绒光）
    apparel.tsx             连衣裙 / 半身裙 / 衬衫 / T 恤 / 围裙
    headwear.tsx            渔夫帽 / 棒球帽 / 贝雷帽 / 宽发带
    bags.tsx                托特包 / 斜挎包 / 双肩包
    textile.tsx             方巾 / 披巾 / 靠枕
    viewer.tsx              画布 / 环境光照 / 四机位相机 / 降级边界
  agent-trace.tsx           Agent 思考轨迹可视化
  chat-panel.tsx            知识库对话
  inpaint-studio.tsx        局部重绘画布与合成
  personal-workshop.tsx     个性工坊
lib/
  fonts.ts                  大标题艺术字（马善政毛笔楷书，next/font 自托管）
  llm/provider.ts           OpenAI 兼容协议封装（流式 + 工具调用 + JSON 输出）
  llm/agent.ts              Agent 编排：规划 → 工具执行 → 自检 → 回答
  rag.ts                    两路召回 + 重排 + 引用
  wanx.ts                   万相文生图 / 局部重绘（异步任务轮询）
  render/pattern-canvas.ts  Canvas 绘制（2D 底图 / 3D 贴图共用）
  tools.ts                  工具注册表 + JSON Schema
  prompts.ts                工艺参数→提示词、域限定、Agent 各阶段提示词
  data/styles.ts            款式库种子数据：6 品类 × 50 款 = 300 款，每款带廓形参数
  db/style-db.ts            款式库查询层：品类/版型/标签/关键词四张索引 + query/related
  db/user-library.ts        本地用户库：收藏、最近使用、取色历史（localStorage）
  data/                     工艺库（扎染/印染/刺绣 15 种）、载体库（15 种）、配色、纹样、非遗语料
store/
  studio.ts                 工坊状态（Zustand，跨页面共享「同一件作品」）
public/
  images/*.webp             门户配图（8 张主题图，PNG 原图一并保留）
```

---

## 四、AI 链路怎么走

### 1. 知识库问答

```
问题 → 词法召回（bigram + IDF/BM25）+ 向量召回（text-embedding-v3）
     → 标签/标题重排 → Top-3 片段拼进系统提示词
     → 模型流式作答（要求按 [1][2] 标注出处）→ 返回引用列表
```

- 系统提示词限定「只答云南白族扎染」，检索为空时必须说「资料未涉及」；
- 域外问题（编程、股票、政治等）在检索为空时直接拒答，不消耗模型；
- 向量通道失败自动退回词法通道，外部接口抖动不会把问答打挂。

### 2. 创作 Agent

```
规划（LLM 输出结构化计划：题材 / 载体 / 技法 / 工具序列）
  → 执行（真实调用工具注册表，记录入参、耗时、返回摘要）
  → 参数翻译（工艺滑块 → 纹样描述 → 图像提示词）
  → 自检（本地工艺规则 + 模型复核，冲突可指出具体参数后果）
  → 回答（流式生成工艺建议）
```

工具：`search_heritage_kb` / `get_technique_detail` / `explain_pattern` / `generate_tie_dye_image` / `inpaint_region`，每个都有 JSON Schema，可直接导出为 OpenAI `tools` 或映射到 MCP Server。

### 3. 局部重绘

```
底图(dataURL) + 黑底白区 mask(dataURL) → /api/inpaint
  → 万相 description_edit_with_mask（异步任务，提交后轮询）
  → 结果图经同源代理取回 → Canvas 用同一 mask 做 destination-in 合成
  → 逐像素校验遮罩外改动数（应恒为 0）
```

生成模型一定会重画整张图，靠 prompt 说「别改其他区域」不可控，所以**约束放在合成阶段**，并把校验结果直接显示在界面上。

---

## 五、几个设计决定

**1. 为什么纹样全部程序化生成？**
骨架阶段没有素材版权，程序化生成能保证全站视觉统一、加载零成本。Canvas 版本同时供 2D 底图、3D 贴图、离线兜底使用，一处改动三处生效；后期换真实作品图只改 `lib/render/pattern-canvas.ts`。

**2. 为什么参数是「工艺动作」而不是「风格标签」？**
风格标签（"水墨风""复古"）是抽卡，工艺动作（"扎点密度 80 个/dm²"）有因果。用户调完能听懂为什么纹样变了，这才是非遗科普，也才拿得到「技术方案创新」的分。

**3. 为什么 Agent 要把轨迹画出来？**
链式调用 API 不叫 Agent。把「规划了什么、调了哪个工具、自检发现什么冲突」摊开给用户（和评委）看，才是可验证的自主决策。

**4. 3D 为什么不用 .glb 模型？**
15 种载体（连衣裙 / 半身裙 / 衬衫 / T 恤 / 围裙 / 4 种帽饰 / 3 种箱包 / 方巾 / 披巾 / 靠枕）全部按实物结构程序化生成：水平截面放样出衣身（肩宽/收腰/摆围逐层给值），Lathe 旋转成形帽壳，极坐标扇形板做帽檐与遮阳板，顶点位移做布料垂坠，配皮提手、铆钉、明线、吸汗带、流苏等结构件。首屏没有模型下载等待，也不会有资源 404；纹样以 CanvasTexture 实时映射，滑块一动贴图就变，正面/侧面/背面机位一键切换。

渲染走「实物图」路线：影棚径向渐变背景 + 暗角，三灯布光（主光软阴影 / 冷补光 / 背面轮廓光）配现场烘焙的环境贴图，ACES 电影级色调映射；布料带程序化生成的斜纹法线与粗糙度贴图，转动时高光沿织纹走。交互上用户可自由翻看：拖拽翻转、滚轮/双指缩放、右键平移、双击复位，右上角还有自转/左转/右转/翻面/俯视/放大/缩小/复位/全屏一排操作键，触屏也能完整操作。

**5. 款式库为什么是「数据 + 索引」而不是 300 个模型文件？**
工坊的款式库有 6 品类 × 50 款（半身裙 / 连衣裙 / 上装 / 帽饰 / 箱包 / 布艺，市面常见版型：短裙长裙百褶裙、马面裙、法棍包、贝雷帽……）。每款存的是一组归一化廓形参数（len / flare / waist / pleats / sleeve / neck / loose / brim / crown / depth），3D 放样函数直接读这些数值重建截面——所以换款式是真的换版型，而不是换一张贴图。数据层拆成「种子数据（`lib/data/styles.ts`）+ 查询层（`lib/db/style-db.ts`）+ 本地用户库（`lib/db/user-library.ts`，收藏/最近/取色历史存 localStorage）」，查询接口与真实数据库同形（query/get/sort/limit），以后接 SQLite/Supabase 只替换 `db/` 这一层。

**6. 为什么模型底色固定为白色？**
真实扎染是白布下缸：扎住的地方不上色，留白就是坯布本色。工坊因此把坯布固定为 `#FFFFFF`，用户挑的每一个颜色（取色器 + 12 种草木染主染 + 6 种辅染 + 7 组传统配方）都只落到「染料」这一层——看到什么色，就是什么色，白底也保证了屏幕显色不被米黄底布带偏。局部重绘与 3D 预览共用这组颜色，工坊调好的颜色到重绘页不丢。

**7. 局部重绘为什么同时支持手绘和语言指令？**
手绘精确但动手成本高；指令省事但定位可能偏差。两条路都落到同一个 mask 上，用户可以先用语言框个大概，再拿笔刷修边界。

---

## 六、下一步 TODO

- [ ] 知识库语料替换为真实非遗文献分片，保留来源与页码
- [ ] 建立 20–30 条评测集，跑 RAG 命中率 / 引用正确率 / 拒答率
- [ ] 工具层对接到真实 MCP Server（当前为进程内注册表，接口形状已对齐）
- [ ] 生成图落 OSS，编辑链路（底图/mask/参数/seed）入库，支持回放与撤销
- [ ] 区域定位换成视觉模型（Qwen-VL），支持「袖口那圈花纹」这类指代
- [ ] 移动端适配走查，Lighthouse 性能优化

---

## 七、数据说明

`lib/data/` 中的技法流程、纹样寓意、非遗语料均为示意内容，参考白族扎染通行说法整理。**正式提交前必须对照《大理白族扎染技艺》等非遗文献与传承人访谈校核**，避免以讹传讹——这类项目最怕的就是科普内容本身失真。
