import { StudioFrame } from "@/components/studio-frame";

export const metadata = { title: "创作工坊" };

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioFrame>{children}</StudioFrame>;
}
