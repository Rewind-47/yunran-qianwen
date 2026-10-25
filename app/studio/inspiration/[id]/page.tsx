import { redirect } from "next/navigation";

export default function CommunityWorkPage({ params }: { params: { id: string } }) {
  redirect(`/inspiration/${params.id}`);
}
