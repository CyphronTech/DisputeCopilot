#!/usr/bin/env bash
# Builds the Windows installer: frontend -> backend fat jar -> jpackage.
# Run from the repo root: bash scripts/package-windows.sh
set -euo pipefail

# Fixed across all releases so Windows Installer treats new versions as upgrades of the same
# product instead of unrelated installs (do not regenerate this per build).
UPGRADE_UUID="f699fa1c-d966-461c-8085-aba6b55fdf71"
JAVA_HOME_BIN="D:\\java\\temurin-21\\bin"
WIX_BIN="/c/Program Files (x86)/WiX Toolset v3.14/bin"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=$(grep -m1 -oP '(?<=<version>)[0-9]+\.[0-9]+\.[0-9]+(?=-SNAPSHOT</version>)' "$ROOT_DIR/backend/pom.xml")

echo "Building version $VERSION"

( cd "$ROOT_DIR/frontend" && npm run build )
# Tests run as part of packaging on purpose: a release that skipped them isn't verified.
( cd "$ROOT_DIR/backend" && mvn -o -q -P package-app clean package )

rm -rf "$ROOT_DIR/dist" "$ROOT_DIR/dist-input"
mkdir -p "$ROOT_DIR/dist-input"
cp "$ROOT_DIR/backend/target/disputecopilot-backend-$VERSION-SNAPSHOT.jar" "$ROOT_DIR/dist-input/"

export PATH="$PATH:$WIX_BIN"
"$JAVA_HOME_BIN\\jpackage" \
  --type exe \
  --input "$(cygpath -w "$ROOT_DIR/dist-input")" \
  --main-jar "disputecopilot-backend-$VERSION-SNAPSHOT.jar" \
  --name DisputeCopilot \
  --app-version "$VERSION" \
  --vendor "DisputeCopilot" \
  --dest "$(cygpath -w "$ROOT_DIR/dist")" \
  --win-shortcut \
  --win-menu \
  --win-dir-chooser \
  --win-upgrade-uuid "$UPGRADE_UUID" \
  --icon "$(cygpath -w "$ROOT_DIR/assets/icon.ico")" \
  --java-options "-Dspring.profiles.active=bundled" \
  --java-options "-Djava.awt.headless=false"

echo "Built: $ROOT_DIR/dist/DisputeCopilot-$VERSION.exe"
