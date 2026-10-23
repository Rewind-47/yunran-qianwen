/**
 * 靠枕扫描件构建脚本：把用户给的 37MB 原始扫描（50 万面 + 3 张三通道烘焙贴图）
 * 转成站点可用的轻量资产。
 *
 * 用法：node scripts/build-pillow.mjs [ratio]
 * 输入：微信目录下的 pillow(1).glb（0.89 × 0.83 × 0.39 m 的方靠枕）
 * 输出：public/models/pillow-scanned.glb
 *
 * 与 build-scanned.mjs 的差别：靠枕是块面体，法线要重算（原生法线带扫描噪点），
 * 而 UV 一律重算成柱面——原生展开图是上百块不规则补丁，拿来当涂鸦画布会
 * 让每一笔都在缝上断开。
 *
 * 步骤：
 * 1. meshopt 简化到目标面数；
 * 2. 手动烘焙节点世界矩阵（把模型摆正成「立着、底面贴地」）；
 * 3. 居中 + 归一化：高 1.0、底面 y=0，运行时再按款式缩放；
 * 4. 重算平滑法线 + 柱面 UV（正面 +Z 在 u=0.5，接缝藏在背面）；
 * 5. 去贴图与材质，只留一个白色占位材质（运行时换成织物材质）。
 */
import { createRequire } from "node:module";
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const req = createRequire("C:/Users/shy12/.workbuddy/binaries/node/workspace/package.json");
const { NodeIO } = req("@gltf-transform/core");
const { simplify, prune } = req("@gltf-transform/functions");
const { MeshoptSimplifier } = req("meshoptimizer");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC =
  "D:/Program Files (x86)/weixin/xwechat_files/wxid_jigvr4w3pbv622_62ad/msg/file/2026-10/pillow(1).glb";
const OUT = resolve(ROOT, "public/models/pillow-scanned.glb");
const ratio = Number(process.argv[2] ?? 0.18);

await MeshoptSimplifier.ready;
const io = new NodeIO();
const doc = await io.read(SRC);
console.log("read", statSync(SRC).size);

// 不再锁 UV 边界：原生展开图会被丢掉，锁它只会拖累简化质量
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 }));

const mesh = doc.getRoot().listMeshes()[0];
const prim = mesh.listPrimitives()[0];
console.log("semantics", prim.listSemantics());

const posAcc = prim.getAttribute("POSITION");
const nrmAcc = prim.getAttribute("NORMAL");
const idxAcc = prim.getIndices();
let pos = Float32Array.from(posAcc.getArray());
let nrm = nrmAcc ? Float32Array.from(nrmAcc.getArray()) : null;
const idx = idxAcc ? Uint32Array.from(idxAcc.getArray()) : null;
console.log("  verts", pos.length / 3, "tris", idx ? idx.length / 3 : 0);

/* ---- 烘焙节点世界矩阵：把模型摆正（扫描件原始朝向是躺倒的） ---- */
const node = doc.getRoot().listNodes().find((n) => n.getMesh() !== null) ?? doc.getRoot().listNodes()[0];
const w = node.getWorldMatrix();
const xf = (arr, isNormal) => {
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], y = arr[i + 1], z = arr[i + 2];
    let nx = w[0] * x + w[4] * y + w[8] * z + (isNormal ? 0 : w[12]);
    let ny = w[1] * x + w[5] * y + w[9] * z + (isNormal ? 0 : w[13]);
    let nz = w[2] * x + w[6] * y + w[10] * z + (isNormal ? 0 : w[14]);
    if (isNormal) {
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
    }
    arr[i] = nx; arr[i + 1] = ny; arr[i + 2] = nz;
  }
};
xf(pos, false);
if (nrm) xf(nrm, true);
node.setTranslation([0, 0, 0]);
node.setRotation([0, 0, 0, 1]);
node.setScale([1, 1, 1]);

/* ---- 居中 + 归一化：高 1、底面 y=0 ---- */
let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
for (let i = 0; i < pos.length; i += 3) {
  minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
  minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
  minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
}
const cx = (minX + maxX) / 2;
const cz = (minZ + maxZ) / 2;
const s = 1 / (maxY - minY);
for (let i = 0; i < pos.length; i += 3) {
  pos[i] = (pos[i] - cx) * s;
  pos[i + 1] = (pos[i + 1] - minY) * s;
  pos[i + 2] = (pos[i + 2] - cz) * s;
}
console.log("  normalized", ((maxX - minX) * s).toFixed(3), "x 1.000 x", ((maxZ - minZ) * s).toFixed(3));

/* ---- 重算柱面 UV ----
 * 原始扫描件带的是摄影测量的「补丁展开图」：整块布被切成上百个不规则小块，
 * 拿它当涂鸦画布的话，鼠标每划过一道缝 UV 就跳到图谱另一处，一笔会断成好几截。
 * 所以丢掉原生 UV，按更接近「一块包着它的布」的方式重算：
 * 绕竖轴展开（正面 +Z 落在 u=0.5，与 T 恤/托特包的约定一致），v 取高度。
 * 接缝留在背面，跨界三角形复制顶点错开 u，缝上不会被拉出长条。
 */
const vCount = pos.length / 3;
const cylUv = new Float32Array(vCount * 2);
for (let i = 0; i < vCount; i++) {
  const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
  let u = Math.atan2(z, x) / (Math.PI * 2) + 0.25;
  u -= Math.floor(u);
  if (u >= 1) u -= 1;
  cylUv[i * 2] = u;
  cylUv[i * 2 + 1] = y;
}

/* ---- 重算平滑法线 ----
 * 扫描件原生的法线带着摄影测量的噪点，简化后噪点被放大成一块块明暗斑，
 * 布面看着像脏了。这里按三角面积加权重算一遍，褶皱的起伏靠几何本身表达。
 */
if (idx) {
  const smooth = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) {
      smooth[o] += nx;
      smooth[o + 1] += ny;
      smooth[o + 2] += nz;
    }
  }
  for (let i = 0; i < smooth.length; i += 3) {
    const l = Math.hypot(smooth[i], smooth[i + 1], smooth[i + 2]) || 1;
    smooth[i] /= l;
    smooth[i + 1] /= l;
    smooth[i + 2] /= l;
  }
  nrm = smooth;
}

/* ---- 接缝修复：跨 u=0/1 的三角形，低 u 的顶点复制一份 u+1，缝不被拉长 ---- */
const dupPos = [], dupNrm = [], dupUv = [];
const dupMap = new Map();
let dupCount = 0;
const outIdx = idx ? new Uint32Array(idx.length) : null;
if (idx) {
  for (let t = 0; t < idx.length; t += 3) {
    const vs = [idx[t], idx[t + 1], idx[t + 2]];
    const us = vs.map((v) => cylUv[v * 2]);
    if (Math.max(...us) - Math.min(...us) > 0.5) {
      const nv = vs.map((v) => {
        if (cylUv[v * 2] >= 0.5) return v;
        let d = dupMap.get(v);
        if (d === undefined) {
          d = vCount + dupCount++;
          dupMap.set(v, d);
          dupPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
          if (nrm) dupNrm.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
          dupUv.push(cylUv[v * 2] + 1, cylUv[v * 2 + 1]);
        }
        return d;
      });
      outIdx[t] = nv[0]; outIdx[t + 1] = nv[1]; outIdx[t + 2] = nv[2];
    } else {
      outIdx[t] = vs[0]; outIdx[t + 1] = vs[1]; outIdx[t + 2] = vs[2];
    }
  }
}

const finalPos = new Float32Array(pos.length + dupPos.length);
finalPos.set(pos, 0);
finalPos.set(dupPos, pos.length);
const finalUv = new Float32Array(cylUv.length + dupUv.length);
finalUv.set(cylUv, 0);
finalUv.set(dupUv, cylUv.length);
let finalNrm = null;
if (nrm) {
  finalNrm = new Float32Array(nrm.length + dupNrm.length);
  finalNrm.set(nrm, 0);
  finalNrm.set(dupNrm, nrm.length);
}

const buf = doc.getRoot().listBuffers()[0];
prim.setAttribute("POSITION", doc.createAccessor("POSITION", buf).setType("VEC3").setArray(finalPos));
if (finalNrm) prim.setAttribute("NORMAL", doc.createAccessor("NORMAL", buf).setType("VEC3").setArray(finalNrm));
prim.setAttribute("TEXCOORD_0", doc.createAccessor("TEXCOORD_0", buf).setType("VEC2").setArray(finalUv));
if (outIdx) prim.setIndices(doc.createAccessor(null, buf).setType("SCALAR").setArray(outIdx));
console.log("  cylinder uv, seam dups", dupCount);

/* ---- 材质：白色占位，运行时换成织物 / 涂鸦材质；贴图全部丢掉 ---- */
const mat = doc.createMaterial("pillow-cloth");
mat.setBaseColorFactor([1, 1, 1, 1]);
mat.setDoubleSided(true);
mat.setRoughnessFactor(0.95);
prim.setMaterial(mat);

await doc.transform(prune({ keepAttributes: true }));

for (const acc of doc.getRoot().listAccessors()) {
  if (!acc.getArray()) acc.detach();
}

mkdirSync(dirname(OUT), { recursive: true });
await io.write(OUT, doc);
console.log("->", OUT, (statSync(OUT).size / 1024 / 1024).toFixed(2) + "MB");
