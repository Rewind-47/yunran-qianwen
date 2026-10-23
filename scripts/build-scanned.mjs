/**
 * 扫描资产构建脚本：把用户提供的扫描 GLB（50 万面 + 2K 烘焙贴图）转成站点可用的轻量资产。
 *
 * 用法：node build-scanned.mjs
 * 输入：用户微信目录下的 T-shirt.glb / bag(1).glb
 * 输出：yunran-qianwen/public/models/tshirt-scanned.glb / tote-scanned.glb
 *
 * 步骤：
 * 1. flatten 把节点变换烘焙进网格；weld 合并重复顶点；
 * 2. meshopt 简化到目标面数（只看位置，质量最好）；
 * 3. 去掉烘焙贴图与原始 UV（摄影测量图集无法铺纹样）；
 * 4. 重算平滑法线；
 * 5. 烘焙变换：底面放平、居中、缩放到载体尺幅；
 * 6. 生成柱面 UV：正面(+Z)落在 u=0.5（与刺绣定位约定一致），接缝复制顶点藏到背面；
 * 7. 导出 GLB（无贴图，~2MB）。
 */
import { NodeIO } from "@gltf-transform/core";
import { flatten, weld, simplify, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { mkdirSync } from "node:fs";

const SRC_DIR = "D:/Program Files (x86)/weixin/xwechat_files/wxid_jigvr4w3pbv622_62ad/msg/file/2026-10";
const OUT_DIR = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/yunran-qianwen/public/models";

/** 每个资产的目标尺幅：height 是总高（含提手），bottom 是底面在场景里的 y */
const JOBS = [
  { src: `${SRC_DIR}/T-shirt.glb`, out: `${OUT_DIR}/tshirt-scanned.glb`, height: 1.5, bottom: -0.45, ratio: 0.14 },
  { src: `${SRC_DIR}/bag(1).glb`, out: `${OUT_DIR}/tote-scanned.glb`, height: 1.7, bottom: -0.85, ratio: 0.14 },
];

await MeshoptSimplifier.ready;

const io = new NodeIO();

for (const job of JOBS) {
  console.log("== ", job.src);
  const doc = await io.read(job.src);
  // 先丢掉贴图相关属性再 weld：没有 UV/法线的牵制，重复顶点才能完全合并
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      p.setAttribute("TEXCOORD_0", null);
      p.setAttribute("NORMAL", null);
      p.setAttribute("TEXCOORD_1", null);
      p.setAttribute("TANGENT", null);
    }
  }
  await doc.transform(flatten(), weld());
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: job.ratio, error: 0.0008 }));

  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];

  const posAcc = prim.getAttribute("POSITION");
  let pos = Float32Array.from(posAcc.getArray());
  const idxAcc = prim.getIndices();
  let idx = idxAcc ? Uint32Array.from(idxAcc.getArray()) : null;
  if (!idx) {
    idx = Uint32Array.from(pos.map((_, i) => i));
  }
  console.log("   simplified verts", pos.length / 3, "tris", idx.length / 3);

  /* ---- 手动烘焙节点世界矩阵（flatten 对该资产不生效），并清空节点变换 ---- */
  const node =
    doc.getRoot().listNodes().find((n) => n.getMesh() !== null) ??
    doc.getRoot().listNodes()[0];
  const w = node.getWorldMatrix();
  // 列主序 4x4 仿射：p' = M * p
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    pos[i] = w[0] * x + w[4] * y + w[8] * z + w[12];
    pos[i + 1] = w[1] * x + w[5] * y + w[9] * z + w[13];
    pos[i + 2] = w[2] * x + w[6] * y + w[10] * z + w[14];
  }
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  node.setScale([1, 1, 1]);

  /* ---- 烘焙变换：居中 + 放平 + 缩放 ---- */
  let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
    minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
    minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const s = job.height / (maxY - minY);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = (pos[i] - cx) * s;
    pos[i + 1] = (pos[i + 1] - minY) * s + job.bottom;
    pos[i + 2] = (pos[i + 2] - cz) * s;
  }

  /* ---- 平滑法线（面积加权，逐顶点累计） ---- */
  const vCount = pos.length / 3;
  const normals = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) {
      normals[o] += nx; normals[o + 1] += ny; normals[o + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
  }

  /* ---- 柱面 UV：正面(+Z)在 u=0.5，接缝在背面(u≈0/1) ---- */
  const uv = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    let u = Math.atan2(z, x) / (Math.PI * 2) + 0.25;
    u -= Math.floor(u);
    if (u >= 1) u -= 1;
    uv[i * 2] = u;
    uv[i * 2 + 1] = (y - job.bottom) / job.height;
  }

  /* ---- 接缝修复：跨界三角形的低 u 顶点复制一份 u+1，接缝留在背面且不拉伸 ---- */
  const dupPos = [], dupNrm = [], dupUv = [];
  const dupMap = new Map();
  let dupCount = 0;
  const outIdx = new Uint32Array(idx.length);
  for (let t = 0; t < idx.length; t += 3) {
    const vs = [idx[t], idx[t + 1], idx[t + 2]];
    const us = vs.map((v) => uv[v * 2]);
    if (Math.max(...us) - Math.min(...us) > 0.5) {
      const nv = vs.map((v) => {
        if (uv[v * 2] < 0.5) {
          let d = dupMap.get(v);
          if (d === undefined) {
            d = vCount + dupCount++;
            dupMap.set(v, d);
            dupPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
            dupNrm.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
            dupUv.push(uv[v * 2] + 1, uv[v * 2 + 1]);
          }
          return d;
        }
        return v;
      });
      outIdx[t] = nv[0]; outIdx[t + 1] = nv[1]; outIdx[t + 2] = nv[2];
    } else {
      outIdx[t] = vs[0]; outIdx[t + 1] = vs[1]; outIdx[t + 2] = vs[2];
    }
  }

  const finalPos = new Float32Array(vCount * 3 + dupPos.length);
  finalPos.set(pos, 0); finalPos.set(dupPos, pos.length);
  const finalNrm = new Float32Array(pos.length + dupNrm.length);
  finalNrm.set(normals, 0); finalNrm.set(dupNrm, normals.length);
  const finalUv = new Float32Array(vCount * 2 + dupUv.length);
  finalUv.set(uv, 0); finalUv.set(dupUv, uv.length);

  const buf = doc.getRoot().listBuffers()[0];
  prim.setAttribute("POSITION", doc.createAccessor("POSITION", buf).setArray(finalPos).setType("VEC3"));
  prim.setAttribute("NORMAL", doc.createAccessor("NORMAL", buf).setArray(finalNrm).setType("VEC3"));
  prim.setAttribute("TEXCOORD_0", doc.createAccessor("TEXCOORD_0", buf).setArray(finalUv).setType("VEC2"));
  prim.setIndices(doc.createAccessor(null, buf).setArray(outIdx).setType("SCALAR"));

  /* ---- 材质：占位素色（运行时会被 FabricMaterial 覆盖），清掉烘焙贴图 ---- */
  const mat = doc.createMaterial("cloth");
  mat.setDoubleSided(true);
  mat.setBaseColorFactor([1, 1, 1, 1]);
  prim.setMaterial(mat);
  console.log("   semantics before prune:", prim.listSemantics(), prim.getAttribute("TEXCOORD_0")?.getArray()?.length);
  await doc.transform(prune({ keepAttributes: true }));
  console.log("   semantics after prune:", prim.listSemantics());

  // 写出前清理：detach 后残留的空 accessor 会让 writer 崩溃
  for (const acc of doc.getRoot().listAccessors()) {
    if (!acc.getArray()) {
      console.log("   null-array accessor", acc.getName());
      acc.detach();
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  await io.write(job.out, doc);
  const size = (await import("node:fs")).statSync(job.out).size;
  console.log("   ->", job.out, (size / 1024 / 1024).toFixed(2) + "MB", "dups", dupCount);
}
console.log("done");
