import { createRequire } from "node:module";
import { statSync } from "node:fs";
import { basename } from "node:path";
const req = createRequire("C:/Users/shy12/.workbuddy/binaries/node/workspace/package.json");
const { NodeIO } = req("@gltf-transform/core");

for (const src of process.argv.slice(2)) {
  console.log("==", basename(src), (statSync(src).size / 1024 / 1024).toFixed(1) + "MB");
  const doc = await new NodeIO().read(src);
  const root = doc.getRoot();
  const meshes = root.listMeshes();
  let verts = 0, tris = 0;
  const bbox = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      verts += pos.getCount();
      const idx = p.getIndices();
      tris += idx ? idx.getCount() / 3 : pos.getCount() / 3;
      if (!pos.getMin([]) || !pos.getMax([])) continue;
      const mn = pos.getMin([]), mx = pos.getMax([]);
      for (let i = 0; i < 3; i++) {
        bbox.min[i] = Math.min(bbox.min[i], mn[i]);
        bbox.max[i] = Math.max(bbox.max[i], mx[i]);
      }
    }
  }
  const nodes = root.listNodes();
  console.log("  meshes", meshes.length, "prims", meshes.map(m => m.listPrimitives().length).join(","),
    "nodes", nodes.length, "verts", verts, "tris", Math.round(tris),
    "materials", root.listMaterials().length, "textures", root.listTextures().length,
    "anims", root.listAnimations().length, "skins", root.listSkins().length);
  console.log("  nodeNames", nodes.map(n => n.getName()).slice(0, 8));
  console.log("  meshNames", meshes.map(m => m.getName()).slice(0, 8));
  console.log("  raw bbox", bbox.min.map(v => v.toFixed(2)).join(","), "->", bbox.max.map(v => v.toFixed(2)).join(","),
    "size", bbox.max.map((v, i) => (v - bbox.min[i]).toFixed(2)).join(" x "));
  const semantics = meshes[0]?.listPrimitives()[0]?.listSemantics();
  console.log("  semantics", semantics);
  const scale = nodes[0]?.getScale();
  const rot = nodes[0]?.getRotation();
  console.log("  node0 scale", scale, "rot", rot?.map(v => +v.toFixed(3)));
}
