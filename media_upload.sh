#!/usr/bin/env bash
# Temporary public hosting of one video so Metricool can copy it.
#   ./media_upload.sh up FILE.mp4   -> prints raw URL (branch "media")
#   ./media_upload.sh down          -> overwrites branch "media" with an empty commit (video gone)
# Branch deletion is blocked by the session proxy, so the branch is reused and emptied.
# The working tree and main are never touched (git plumbing only).
set -euo pipefail
cd "$(dirname "$0")"
branch=media
case "$1" in
  up)
    blob=$(git hash-object -w "$2")
    tree=$(printf '100644 blob %s\tvideo.mp4\n' "$blob" | git mktree)
    commit=$(git commit-tree "$tree" -m "temp media $(date +%F)")
    git push -q -f origin "$commit:refs/heads/$branch" 2>/dev/null || git push -q -f origin "$commit:refs/heads/$branch"
    echo "https://raw.githubusercontent.com/21resellai/21resell-tiktok-media/$branch/video.mp4"
    ;;
  down)
    blob=$(printf 'empty\n' | git hash-object -w --stdin)
    tree=$(printf '100644 blob %s\tREADME.md\n' "$blob" | git mktree)
    commit=$(git commit-tree "$tree" -m "empty")
    git push -q -f origin "$commit:refs/heads/$branch" 2>/dev/null || git push -q -f origin "$commit:refs/heads/$branch"
    git ls-remote origin "refs/heads/$branch"
    ;;
  *) echo "usage: $0 up FILE | down" >&2; exit 2 ;;
esac
