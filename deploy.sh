#!/usr/bin/env bash
set -euo pipefail
cd /usr/local/google/home/imasa/agi-economics-lab

python3 build_standalone.py
cp dist/index.html /google/data/rw/users/im/imasa/agi-economics.html 2>/dev/null || true
cp dist/index.html /google/data/rw/users/im/imasa/agi-economics/index.html 2>/dev/null || true

git add -A
git commit -m "${1:-Update AGI Economics Lab website}" || true
git push origin main
echo "Deployed to https://alexolegimas.github.io/agi-economics-lab/"
