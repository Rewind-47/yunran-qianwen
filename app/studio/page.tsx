import { redirect } from "next/navigation";

export const metadata = { title: "创作工坊" };

export default function StudioIndex() {
  redirect("/studio/personal/tie");
}
