#!/bin/sh
# Renders the still of each project poster (the cover pictures on the Work page
# and in the folder) from poster.html, using Google Chrome. Run from this folder:
#   sh render.sh                       (all four)
#   ONLY=companions sh render.sh       (just one)
# Each still is 1320 x 750 at 1.5x, saved as ../assets/img/projects/project-N.jpg.
# Chrome's window frame takes some of its height, so the page is rendered in a
# taller window and cropped back to the poster.
# After re-rendering, bump the ?v= on the project-N.jpg images in work/index.html.
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -x "$HERE/.crop" ] || swiftc -O "$HERE/crop.swift" -o "$HERE/.crop"
n=0
for p in flowledger zineps inclusivity companions; do
  n=$((n + 1))
  [ -n "$ONLY" ] && [ "$ONLY" != "$p" ] && continue
  "$CH" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$HERE/.chrome" \
    --allow-file-access-from-files --force-device-scale-factor=1.5 --window-size=1320,1000 \
    --virtual-time-budget=8000 --screenshot="$HERE/poster-$n.png" "file://$HERE/poster.html?p=$p" >/dev/null 2>&1
  "$HERE/.crop" "$HERE/poster-$n.png" "$HERE/../assets/img/projects/project-$n.jpg" 1980 1125 0.84
  rm -f "$HERE/poster-$n.png"
  echo "project-$n.jpg ($p)"
done
rm -rf "$HERE/.chrome" "$HERE/.crop"
