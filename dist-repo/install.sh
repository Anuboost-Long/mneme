#!/bin/bash
#
# Installs mneme from the latest GitHub release.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Anuboost-Long/mneme-dist/main/install.sh | bash
#
# The build is signed ad-hoc rather than with a Developer ID, so a copy that
# arrives through a browser is quarantined and macOS calls it damaged. This
# clears the quarantine flag on a copy the user asked for by name, which is the
# whole reason the install is a script rather than a download link.
#
# ZIP_URL points somewhere else when testing a build before it is released:
#   ZIP_URL="file:///path/to/mneme-arm64.zip" ./install.sh

set -euo pipefail

REPO="Anuboost-Long/mneme-dist"
APP_NAME="mneme.app"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "ERROR: mneme is a macOS app." >&2
  exit 1
fi

# uname -m answers x86_64 inside a Rosetta shell on Apple Silicon, so ask the
# hardware instead.
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
  ARCH="arm64"
else
  ARCH="x64"
fi
ZIP_URL="${ZIP_URL:-https://github.com/$REPO/releases/latest/download/mneme-$ARCH.zip}"

# /Applications is writable by admin users, but not by every account. Falling
# back keeps the install working without asking for a password.
TARGET_DIR="${INSTALL_DIR:-/Applications}"
if [ ! -w "$TARGET_DIR" ]; then
  TARGET_DIR="$HOME/Applications"
  mkdir -p "$TARGET_DIR"
  echo "==> /Applications is not writable, installing to $TARGET_DIR"
fi

TARGET="$TARGET_DIR/$APP_NAME"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Everything that can fail happens before the running copy is touched.
echo "==> Downloading mneme for $ARCH"
if ! curl -fSL --progress-bar "$ZIP_URL" -o "$WORK/mneme.zip"; then
  echo >&2
  echo "ERROR: could not download mneme." >&2
  echo "       $ZIP_URL" >&2
  echo >&2
  echo "A 404 here means no release has been published yet. Check:" >&2
  echo "       https://github.com/$REPO/releases" >&2
  exit 1
fi

# ditto, not unzip: it is the extraction that keeps the code signature intact.
echo "==> Extracting"
ditto -x -k "$WORK/mneme.zip" "$WORK/extracted"

if [ ! -d "$WORK/extracted/$APP_NAME" ]; then
  echo "ERROR: the download did not contain $APP_NAME." >&2
  exit 1
fi

# The signature is ad-hoc, so this proves only that the bytes arrived intact and
# nothing rewrote the bundle in transit. It is not a claim about who built it.
echo "==> Verifying the download"
if ! codesign --verify --strict "$WORK/extracted/$APP_NAME" 2>/dev/null; then
  echo "ERROR: the downloaded app failed signature verification." >&2
  exit 1
fi

if pgrep -x mneme >/dev/null 2>&1; then
  echo "==> Quitting the running copy"
  osascript -e 'quit app "mneme"' >/dev/null 2>&1 || true
  sleep 2
fi

echo "==> Installing to $TARGET"
rm -rf "$TARGET"
ditto "$WORK/extracted/$APP_NAME" "$TARGET"

# Downloads carry com.apple.quarantine, and an ad-hoc signature turns that into
# "damaged and can't be opened" rather than a prompt the user can dismiss.
xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true

echo
echo "Done. Installed $TARGET"
echo "Open it with:  open -a mneme"
