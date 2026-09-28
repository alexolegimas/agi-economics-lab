#!/usr/bin/env bash
set -euo pipefail
cd /usr/local/google/home/imasa/agi-economics-lab

V=$(date +%s)
python3 -c '
import re, sys
v = sys.argv[1]
with open("index.html", "r") as f:
    html = f.read()
html = re.sub(r"(static/(?:css|js)/[a-zA-Z0-9_.-]+\.(?:css|js))(?:\?v=[0-9]+)?", rf"\1?v={v}", html)
with open("index.html", "w") as f:
    f.write(html)
' "$V"

python3 build_standalone.py
cp dist/index.html /google/data/rw/users/im/imasa/agi-economics.html 2>/dev/null || true
cp dist/index.html /google/data/rw/users/im/imasa/agi-economics/index.html 2>/dev/null || true

git add -A
git commit -m "${1:-Update AGI Economics Lab website}" || true
git push origin main
echo "Deployed to https://alexolegimas.github.io/agi-economics-lab/"
