"""把 Google Fonts 的三支字体分片下载到 public/fonts，并生成自托管 CSS。

为什么需要这个脚本：`next/font/google` 在**构建时**去 fonts.googleapis.com
拉字体，一旦构建机连不上 Google，整个 build 直接失败（本项目在国内网络下必现）。
把分片预先落到 public/ 并用普通 @font-face 声明，构建就不再依赖外网。

用法：python scripts/vendor-fonts.py
产出：public/fonts/<slug>/*.woff2 + app/fonts.css（自动 import 在 layout.tsx）
"""

import concurrent.futures
import os
import re
import subprocess
import sys

# 走 Google 官方中国镜像（fonts.googleapis.cn），它在国内可达；gstatic 本身可达
CSS_HOST = "https://fonts.googleapis.cn/css2"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# 族名 -> (public 子目录, 请求参数)
FAMILIES = [
    ("Cormorant Garamond", "cormorant-garamond", "Cormorant+Garamond:wght@300;400;500;600"),
    ("Ma Shan Zheng", "ma-shan-zheng", "Ma+Shan+Zheng"),
    ("Noto Serif SC", "noto-serif-sc", "Noto+Serif+SC:wght@300;400;600"),
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get(url: str, binary: bool = False):
    """用 curl 取，不走 urllib —— 本机 HTTPS_PROXY 指向的隧道对 Python 会 502，
    而 curl 能正常连通（已验证），所以统一交给 curl。"""
    proc = subprocess.run(
        ["curl", "-sfL", "--max-time", "40", "-A", UA, url],
        capture_output=True,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError(f"curl 退出码 {proc.returncode}: {proc.stderr[:120]!r}")
    return proc.stdout if binary else proc.stdout.decode("utf-8")


def main() -> int:
    out_css = [
        "/* 由 scripts/vendor-fonts.py 生成，请勿手改。",
        " * 字体分片来自 Google Fonts（中国镜像 fonts.googleapis.cn），",
        " * 按 unicode-range 切片，浏览器只下载页面实际用到的那几片。 */",
        "",
        ":root {",
        '  --font-brush: "Ma Shan Zheng", "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif;',
        '  --font-song: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;',
        '  --font-latin: "Cormorant Garamond", "Times New Roman", Georgia, serif;',
        "}",
        "",
    ]

    jobs = []
    for family, slug, query in FAMILIES:
        css = get(f"{CSS_HOST}?family={query}&display=swap")
        blocks = re.findall(r"@font-face\s*\{([^}]*)\}", css)
        if not blocks:
            print(f"[FAIL] {family}: CSS 里没有 @font-face", file=sys.stderr)
            return 1
        print(f"{family}: {len(blocks)} 个分片")
        outdir = os.path.join(ROOT, "public", "fonts", slug)
        os.makedirs(outdir, exist_ok=True)
        for body in blocks:
            m = re.search(r"url\((https://[^)]+)\)", body)
            if not m:
                continue
            url = m.group(1)
            base = url.rsplit("/", 1)[-1]
            jobs.append((url, os.path.join(outdir, base)))
            out_css.append("@font-face {" + body.replace(url, f"/fonts/{slug}/{base}").rstrip() + "}")
        out_css.append("")

    def fetch(job):
        url, dest = job
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            return 0
        data = get(url, binary=True)
        with open(dest, "wb") as f:
            f.write(data)
        return len(data)

    total, done, failed = 0, 0, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch, j): j for j in jobs}
        for fut in concurrent.futures.as_completed(futs):
            try:
                total += fut.result()
                done += 1
            except Exception as e:  # noqa: BLE001
                failed.append((futs[fut][0], str(e)[:100]))
            if done and done % 80 == 0:
                print(f"  {done}/{len(jobs)}  {total / 1048576:.1f} MB")

    with open(os.path.join(ROOT, "app", "fonts.css"), "w", encoding="utf-8") as f:
        f.write("\n".join(out_css) + "\n")

    print(f"下载完成 {done - len(failed)}/{len(jobs)}，新增 {total / 1048576:.2f} MB，失败 {len(failed)}")
    for u, e in failed[:5]:
        print("  FAIL", u.rsplit("/", 1)[-1], e, file=sys.stderr)
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
