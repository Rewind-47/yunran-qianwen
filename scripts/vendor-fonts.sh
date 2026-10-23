#!/usr/bin/env bash
# 把 scripts/font-css/raw-<slug>.css 里引用的 woff2 全部抓到 public/fonts/<slug>/
# 网络部分只用 curl（本项目环境里 Python 子进程走不通外网），改写交给 python。
set -u
cd "$(dirname "$0")/.." || exit 1

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

for slug in cormorant-garamond ma-shan-zheng noto-serif-sc; do
  raw="scripts/font-css/raw-$slug.css"
  [ -f "$raw" ] || { echo "缺少 $raw"; exit 1; }
  mkdir -p "public/fonts/$slug"
  grep -o 'https://[^)]*\.woff2' "$raw" | sort -u > "/tmp/urls-$slug.txt"
  total=$(wc -l < "/tmp/urls-$slug.txt")
  echo "$slug: 需下载 $total 个"
  cat "/tmp/urls-$slug.txt" | xargs -P 12 -I{} sh -c \
    'f=$(basename "{}"); d="public/fonts/'"$slug"'"; [ -s "$d/$f" ] || curl -sfL --max-time 40 -A "'"$UA"'" -o "$d/$f" "{}" || echo "FAIL {}"'
  have=$(ls "public/fonts/$slug" | wc -l)
  size=$(du -sm "public/fonts/$slug" | cut -f1)
  echo "  已落 $have 个，约 ${size}MB"
done
