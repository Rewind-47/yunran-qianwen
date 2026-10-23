import { styleCategories, stylesByCategory, featuredByCategory, styles } from "../lib/data/styles.ts";
console.log("total", styles.length);
for (const c of styleCategories) {
  const f = featuredByCategory[c.id];
  console.log(c.id, c.label, "all:", stylesByCategory[c.id].length, "featured:", f.length, f.map((s) => `${s.id}:${s.name}/${s.model}`).join(" | "));
}
