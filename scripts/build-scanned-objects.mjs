/**
 * 扫描件构建脚本（实物扫描 → 站点可用资产）。
 *
 * 用法：node scripts/build-scanned-objects.mjs [只构建的 key…]
 * 输入：微信目录下的用户提供 GLB（每个约 37MB、50 万面、3 张烘焙贴图）
 * 输出：public/models/<key>-scanned.glb（每个约 2~3MB、6 万面、无贴图）
 *
 * 与 build-scanned.mjs 的区别：
 *   - build-scanned.mjs 处理 T 恤/托特包两条「筒形」载体，直接把模型烘到真实尺幅；
 *   - 这里处理的是款式级扫描件（靠枕、帽子、各类裙），统一归一化成「高 1、
 *     底面 y=0、XZ 居中」，真实的尺幅交给 lib/data/styles.ts 里的 scale 决定，
 *     这样同一个模型可以按款式缩放，取景也只需要调 radius。
 *
 * 步骤（逐件）：
 *   1. meshopt 简化到目标面数；
 *   2. 手动烘焙节点世界矩阵（扫描件原始朝向是 Z 朝上的，节点上挂着 +90° 旋转）；
 *   3. 归一化：高 1、底面 y=0、XZ 居中；
 *   4. 重算平滑法线（原生法线带摄影测量噪点，简化后会放大成明暗脏斑）；
 *   5. 重算柱面 UV（正面 +Z 落在 u=0.5，接缝复制顶点藏到背面）——
 *      原生展开图是上百块不规则补丁，拿来当涂鸦画布会让每一笔在缝上断开；
 *   6. 去贴图与材质，只留一个白色占位材质（运行时换成织物 / 涂鸦材质）。
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
const SRC = "D:/Program Files (x86)/weixin/xwechat_files/wxid_jigvr4w3pbv622_62ad/msg/file/2026-10";
const OUT_DIR = resolve(ROOT, "public/models");

/** key 同时是输出文件名：<key>-scanned.glb */
const JOBS = [
  { key: "pillow", src: "pillow(1).glb", ratio: 0.18 },
  { key: "hat", src: "hat(1).glb", ratio: 0.12 },
  { key: "miniskirt", src: "short skirt(1).glb", ratio: 0.12 },
  { key: "dress", src: "dress(1).glb", ratio: 0.12 },
  { key: "mamian-1", src: "马面裙(1).glb", ratio: 0.12 },
  { key: "mamian-2", src: "马面裙2(1).glb", ratio: 0.12 },
  { key: "mamian-3", src: "马面裙3(1).glb", ratio: 0.12 },
  { key: "mamian-4", src: "马面裙4(1).glb", ratio: 0.12 },
];

await MeshoptSimplifier.ready;
const io = new NodeIO();

const only = new Set(process.argv.slice(2));
mkdirSync(OUT_DIR, { recursive: true });

for (const job of JOBS) {
  if (only.size && !only.has(job.key)) continue;
  const src = `${SRC}/${job.src}`;
  const out = resolve(OUT_DIR, `${job.key}-scanned.glb`);
  console.log("==", job.key, (statSync(src).size / 1024 / 1024).toFixed(1) + "MB");

  const doc = await io.read(src);

  // 不再锁 UV 边界：原生展开图会被丢掉，锁它只会拖累简化质量
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: job.ratio, error: 0.001 }));

  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  let pos = Float32Array.from(prim.getAttribute("POSITION").getArray());
  const idxAcc = prim.getIndices();
  const idx = idxAcc ? Uint32Array.from(idxAcc.getArray()) : null;
  console.log("   verts", pos.length / 3, "tris", idx ? idx.length / 3 : 0);

  /* ---- 烘焙节点世界矩阵，并清空节点变换 ---- */
  const node =
    doc.getRoot().listNodes().find((n) => n.getMesh() !== null) ?? doc.getRoot().listNodes()[0];
  const w = node.getWorldMatrix();
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    pos[i] = w[0] * x + w[4] * y + w[8] * z + w[12];
    pos[i + 1] = w[1] * x + w[5] * y + w[9] * z + w[13];
    pos[i + 2] = w[2] * x + w[6] * y + w[10] * z + w[14];
  }
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
  console.log(
    "   normalized",
    ((maxX - minX) * s).toFixed(3), "x 1.000 x", ((maxZ - minZ) * s).toFixed(3),
    "| raw cm", ((maxX - minX) * 100).toFixed(0), "x", ((maxY - minY) * 100).toFixed(0), "x", ((maxZ - minZ) * 100).toFixed(0),
  );

  /* ---- 平滑法线（面积加权，逐顶点累计） ---- */
  const vCount = pos.length / 3;
  const normals = new Float32Array(pos.length);
  if (idx) {
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) {
        normals[o] += nx;
        normals[o + 1] += ny;
        normals[o + 2] += nz;
      }
    }
    for (let i = 0; i < normals.length; i += 3) {
      const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= l;
      normals[i + 1] /= l;
      normals[i + 2] /= l;
    }
  }

  /* ---- 柱面 UV：正面(+Z)在 u=0.5，接缝在背面 ---- */
  const uv = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    let u = Math.atan2(z, x) / (Math.PI * 2) + 0.25;
    u -= Math.floor(u);
    if (u >= 1) u -= 1;
    uv[i * 2] = u;
    uv[i * 2 + 1] = y;
  }

  /* ---- 接缝修复：跨 u=0/1 的三角形，低 u 的顶点复制一份 u+1 ---- */
  const dupPos = [], dupNrm = [], dupUv = [];
  const dupMap = new Map();
  let dupCount = 0;
  const outIdx = idx ? new Uint32Array(idx.length) : null;
  if (idx) {
    for (let t = 0; t < idx.length; t += 3) {
      const vs = [idx[t], idx[t + 1], idx[t + 2]];
      const us = vs.map((v) => uv[v * 2]);
      if (Math.max(...us) - Math.min(...us) > 0.5) {
        const nv = vs.map((v) => {
          if (uv[v * 2] >= 0.5) return v;
          let d = dupMap.get(v);
          if (d === undefined) {
            d = vCount + dupCount++;
            dupMap.set(v, d);
            dupPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
            dupNrm.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
            dupUv.push(uv[v * 2] + 1, uv[v * 2 + 1]);
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
  const finalNrm = new Float32Array(normals.length + dupNrm.length);
  finalNrm.set(normals, 0);
  finalNrm.set(dupNrm, normals.length);
  const finalUv = new Float32Array(uv.length + dupUv.length);
  finalUv.set(uv, 0);
  finalUv.set(dupUv, uv.length);

  const buf = doc.getRoot().listBuffers()[0];
  prim.setAttribute("POSITION", doc.createAccessor("POSITION", buf).setType("VEC3").setArray(finalPos));
  prim.setAttribute("NORMAL", doc.createAccessor("NORMAL", buf).setType("VEC3").setArray(finalNrm));
  prim.setAttribute("TEXCOORD_0", doc.createAccessor("TEXCOORD_0", buf).setType("VEC2").setArray(finalUv));
  if (outIdx) prim.setIndices(doc.createAccessor(null, buf).setType("SCALAR").setArray(outIdx));

  /* ---- 材质：白色占位，运行时换成织物 / 涂鸦材质；贴图全部丢掉 ---- */
  const mat = doc.createMaterial("scanned-cloth");
  mat.setBaseColorFactor([1, 1, 1, 1]);
  mat.setDoubleSided(true);
  mat.setRoughnessFactor(0.95);
  prim.setMaterial(mat);

  await doc.transform(prune({ keepAttributes: true }));
  for (const acc of doc.getRoot().listAccessors()) {
    if (!acc.getArray()) acc.detach();
  }

  await io.write(out, doc);
  console.log("   ->", out, (statSync(out).size / 1024 / 1024).toFixed(2) + "MB", "seam dups", dupCount);
}
console.log("done");
