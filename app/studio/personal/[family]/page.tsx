import { notFound } from "next/navigation";
import { PersonalWorkshop } from "@/components/personal-workshop";
import { techniqueCategories } from "@/lib/data/techniques";
import type { TechniqueCategory } from "@/lib/types";

const families = techniqueCategories.map((c) => c.id);

export function generateStaticParams() {
  return families.map((family) => ({ family }));
}

export function generateMetadata({ params }: { params: { family: string } }) {
  const hit = techniqueCategories.find((c) => c.id === params.family);
  return { title: hit ? `个性工坊 · ${hit.label}` : "个性工坊" };
}

export default function PersonalFamilyPage({
  params,
}: {
  params: { family: string };
}) {
  const hit = techniqueCategories.find((c) => c.id === params.family);
  if (!hit) notFound();

  return <PersonalWorkshop family={hit.id as TechniqueCategory} />;
}
