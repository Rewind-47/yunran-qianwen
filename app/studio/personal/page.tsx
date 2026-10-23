import { redirect } from "next/navigation";

/** 个性工坊按工艺大类拆成三个页面，默认进「扎染」 */
export default function PersonalIndex() {
  redirect("/studio/personal/tie");
}
