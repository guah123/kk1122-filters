#!/usr/bin/env bash
# Copy scene art from ../../../in/scenes/ (relative to site/) into site/assets/scenes/.
# Idempotent. If python3 + PIL are available, downsizes to <=1600px long edge and recompresses
# (JPG q=85; PNG sprites keep alpha, optimized). Usage: (from anywhere) bash site/tools/import_scenes.sh [src_dir]
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$SITE/../../in/scenes}"
DST="$SITE/assets/scenes"
[ -d "$SRC" ] || { echo "no source dir: $SRC" >&2; exit 1; }
mkdir -p "$DST"
shopt -s nullglob
n=0
for f in "$SRC"/*.png "$SRC"/*.jpg "$SRC"/*.jpeg "$SRC"/*.webp; do
  b="$(basename "$f")"
  if [ -f "$DST/$b" ] && [ "$DST/$b" -nt "$f" ]; then continue; fi   # already imported & newer
  if python3 -c 'import PIL' 2>/dev/null; then
    python3 - "$f" "$DST/$b" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
m = max(im.size)
if m > 1600:
    s = 1600 / m
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
low = dst.lower()
if low.endswith(('.jpg', '.jpeg')):
    im.convert('RGB').save(dst, quality=85, optimize=True, progressive=True)
elif low.endswith('.png'):
    if im.mode not in ('RGBA', 'LA', 'P'):
        im = im.convert('RGB')
    im.save(dst, optimize=True)
else:
    im.save(dst)
PY
  else
    cp -p "$f" "$DST/$b"
  fi
  echo "imported $b"; n=$((n+1))
done
echo "done: $n file(s) → $DST"
