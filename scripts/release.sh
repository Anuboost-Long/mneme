#!/bin/bash
#
# Packages the two macOS builds from `npm run build:mac` into the files the
# mneme-dist release carries: mneme-<arch>.zip for install.sh and
# mneme-<arch>.dmg for manual installs. The names never change between versions
# so releases/latest/download/<name> always resolves.
#
# Tauri leaves the bundle unsigned or only linker-signed when no signing
# identity is set, which fails `codesign --verify` in install.sh, so each app is
# signed ad-hoc here. Replace "-" with the Developer ID once there is one.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGETS="$ROOT/.chain/native/target"
ENTITLEMENTS="$ROOT/.chain/native/Entitlements.plist"
OUT="$ROOT/release"

rm -rf "$OUT"
mkdir -p "$OUT"

package() {
  local triple="$1" arch="$2"
  local built="$TARGETS/$triple/release/bundle/macos/mneme.app"
  local stage="$OUT/stage-$arch"

  if [ ! -d "$built" ]; then
    echo "ERROR: $built is missing. Run npm run build:mac first." >&2
    exit 1
  fi

  echo "==> $arch"
  mkdir -p "$stage"
  ditto "$built" "$stage/mneme.app"
  codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$stage/mneme.app"
  codesign --verify --strict "$stage/mneme.app"

  ditto -c -k --keepParent "$stage/mneme.app" "$OUT/mneme-$arch.zip"

  ln -s /Applications "$stage/Applications"
  hdiutil create -quiet -volname mneme -srcfolder "$stage" -format UDZO "$OUT/mneme-$arch.dmg"
  rm -rf "$stage"
}

package aarch64-apple-darwin arm64
package x86_64-apple-darwin x64

echo
echo "Release files in $OUT:"
ls -lh "$OUT"
