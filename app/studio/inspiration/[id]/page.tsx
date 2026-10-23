import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WorkDetail } from "@/components/work-detail";
import {
  communityWorkMap,
  communityWorks,
} from "@/lib/data/community";
import { techniqueMap } from "@/lib/data/techniques";

export function generateStaticParams() {
  return communityWorks.map((w) => ({ id: w.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const work = communityWorkMap[params.id];
  if (!work) return { title: "作品未找到" };
  return {
    title: `${work.title} · 灵感广场`,
    description: work.note.slice(0, 80),
  };
}

export default function CommunityWorkPage({ params }: { params: { id: string } }) {
  const work = communityWorkMap[params.id];
  if (!work || !techniqueMap[work.techniqueId]) notFound();
  return <WorkDetail work={work} />;
}
