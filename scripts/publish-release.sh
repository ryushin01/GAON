#!/usr/bin/env bash
# 검사를 통과한 설치본을 GitHub Release로 공개합니다. 파일을 모두 올린 뒤에 공개하므로
# 중간에 실패해도 초안으로 남고, 다시 실행하면 이어서 올립니다. 공개된 Release는 덮어쓰지 않습니다.
#   bash scripts/publish-release.sh v0.1.0 assets
set -euo pipefail

tag="$1"
dir="$2"
version="${tag#v}"
files=("GAON-$version-windows-x64-setup.exe" "GAON-$version-macos-arm64.dmg")

for file in "${files[@]}"; do
  if [[ ! -s "$dir/$file" ]]; then
    echo "$dir/$file 파일이 없습니다." >&2
    exit 1
  fi
done

notes="$(mktemp)"
node scripts/release-notes.mjs "$tag" > "$notes"

if ! is_draft="$(gh release view "$tag" --json isDraft --jq .isDraft 2>/dev/null)"; then
  gh release create "$tag" --draft --verify-tag --title "GAON $version" --notes-file "$notes"
elif [[ "$is_draft" != "true" ]]; then
  echo "$tag Release는 이미 공개되어 있어 덮어쓰지 않습니다." >&2
  exit 1
fi

(cd "$dir" && sha256sum "${files[@]}" > SHA256SUMS.txt)
gh release upload "$tag" --clobber "$dir/${files[0]}" "$dir/${files[1]}" "$dir/SHA256SUMS.txt"

# 1.0.0-rc.1처럼 하이픈이 있으면 시험판으로 공개하고 최신 버전으로 표시하지 않습니다.
if [[ "$version" == *-* ]]; then
  gh release edit "$tag" --draft=false --prerelease
else
  gh release edit "$tag" --draft=false --latest
fi
