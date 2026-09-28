#!/usr/bin/env bash
# Builds the Windows installer: frontend -> backend fat jar -> jpackage.
# Run from the repo root: bash scripts/package-windows.sh
set -euo pipefail

# Fixed across all releases so Windows Installer treats new versions as upgrades of the same
# product instead of unrelated installs (do not regenerate this per build).
UPGRADE_UUID="f699fa1c-d966-461c-8085-aba6b55fdf71"
# Same rule for the Burn bundle that wraps the MSI; must differ from the MSI's code.
BUNDLE_UPGRADE_UUID="2b6664c1-a6e7-4d1b-9077-3ce7a16218df"
# Requires a JDK 21 (jpackage needs the JDK, not just a JRE). Set JAVA_HOME to point at it, e.g.
# JAVA_HOME="D:\java\temurin-21" bash scripts/package-windows.sh -- this default is just a
# placeholder and must be adjusted per machine.
JAVA_HOME_BIN="${JAVA_HOME:-D:\\java\\temurin-21}\\bin"
WIX_BIN="/c/Program Files (x86)/WiX Toolset v3.14/bin"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=$(grep -m1 -oP '(?<=<version>)[0-9]+\.[0-9]+\.[0-9]+(?=-SNAPSHOT</version>)' "$ROOT_DIR/backend/pom.xml")

echo "Building version $VERSION"

( cd "$ROOT_DIR/frontend" && npm run build )
# Tests run as part of packaging on purpose: a release that skipped them isn't verified.
( cd "$ROOT_DIR/backend" && mvn -o -q -P package-app clean package )

# Contents, not the directories themselves — an open Explorer window holds a lock on dist/.
mkdir -p "$ROOT_DIR/dist" "$ROOT_DIR/dist-input"
rm -rf "${ROOT_DIR:?}/dist/"* "${ROOT_DIR:?}/dist-input/"*
cp "$ROOT_DIR/backend/target/disputecopilot-backend-$VERSION-SNAPSHOT.jar" "$ROOT_DIR/dist-input/"

export PATH="$PATH:$WIX_BIN"
"$JAVA_HOME_BIN\\jpackage" \
  --type msi \
  --input "$(cygpath -w "$ROOT_DIR/dist-input")" \
  --main-jar "disputecopilot-backend-$VERSION-SNAPSHOT.jar" \
  --name Proofly \
  --app-version "$VERSION" \
  --vendor "CyphronTech" \
  --dest "$(cygpath -w "$ROOT_DIR/dist-input")" \
  --win-shortcut \
  --win-menu \
  --win-menu-group "Proofly" \
  --win-upgrade-uuid "$UPGRADE_UUID" \
  --icon "$(cygpath -w "$ROOT_DIR/assets/icon.ico")" \
  --java-options "-Dspring.profiles.active=bundled" \
  --java-options "-Djava.awt.headless=false"

# The MSI is only an intermediate. Every MSI must write C:\Windows\Installer\inprogressinstallinfo.ipi,
# which needs elevation, and a double-clicked MSI does not reliably self-elevate: the verbose log
# shows "Running product ... with user privileges", then 2503/2502. The same MSI launched already
# elevated logs "with elevated privileges" and succeeds. The Burn bundle (bundle.wxs) provides
# exactly that — it relaunches itself with "runas" before running the MSI, for install and for
# uninstall from Settings > Apps. Neither --win-per-user-install nor --type exe fixes this: both
# still run msiexec unelevated.
"$WIX_BIN/candle.exe" -nologo -ext WixBalExtension \
  -dVersion="$VERSION" \
  -dUpgradeCode="$BUNDLE_UPGRADE_UUID" \
  -dMsi="$(cygpath -w "$ROOT_DIR/dist-input/Proofly-$VERSION.msi")" \
  -dIcon="$(cygpath -w "$ROOT_DIR/assets/icon.ico")" \
  -dLogo="$(cygpath -w "$ROOT_DIR/assets/logo-64.png")" \
  -out "$(cygpath -w "$ROOT_DIR/dist-input/bundle.wixobj")" \
  "$(cygpath -w "$ROOT_DIR/scripts/bundle.wxs")"
"$WIX_BIN/light.exe" -nologo -spdb -ext WixBalExtension \
  -out "$(cygpath -w "$ROOT_DIR/dist/Proofly-Setup-$VERSION.exe")" \
  "$(cygpath -w "$ROOT_DIR/dist-input/bundle.wixobj")"

echo "Built: $ROOT_DIR/dist/Proofly-Setup-$VERSION.exe"
