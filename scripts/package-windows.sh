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

# Contents, not the directories themselves — an open Explorer window holds a lock on dist/.
mkdir -p "$ROOT_DIR/dist" "$ROOT_DIR/dist-input"
rm -rf "${ROOT_DIR:?}/dist/"* "${ROOT_DIR:?}/dist-input/"*
cp "$ROOT_DIR/backend/target/disputecopilot-backend-$VERSION-SNAPSHOT.jar" "$ROOT_DIR/dist-input/"

export PATH="$PATH:$WIX_BIN"
"$JAVA_HOME_BIN\\jpackage" \
  --type msi \
  --input "$(cygpath -w "$ROOT_DIR/dist-input")" \
  --main-jar "disputecopilot-backend-$VERSION-SNAPSHOT.jar" \
  --name DisputeCopilot \
  --app-version "$VERSION" \
  --vendor "DisputeCopilot" \
  --dest "$(cygpath -w "$ROOT_DIR/dist")" \
  --win-shortcut \
  --win-menu \
  --win-menu-group "DisputeCopilot" \
  --win-per-user-install \
  --install-dir "DisputeCopilotApp" \
  --win-upgrade-uuid "$UPGRADE_UUID" \
  --icon "$(cygpath -w "$ROOT_DIR/assets/icon.ico")" \
  --java-options "-Dspring.profiles.active=bundled" \
  --java-options "-Djava.awt.headless=false"

# Per-user MSI, deliberately:
#   - A per-machine install needs a UAC elevation handoff. When that handoff wedges, msiexec is
#     left running with no live install session and every later attempt dies on 2502/2503 until
#     the orphans are killed. Installing under %LOCALAPPDATA% needs no elevation, so there is no
#     handoff to wedge and no admin rights to install or uninstall.
#   - --type msi, not exe: the exe is a bootstrapper that extracts to %TEMP% and re-launches
#     msiexec, which is a second way to hit the same failure.
#   - --install-dir keeps binaries in %LOCALAPPDATA%\DisputeCopilotApp, away from the database
#     in %LOCALAPPDATA%\DisputeCopilot, so an upgrade or uninstall can't take the data with it.
#     It must stay a single path segment — a nested one ("Programs\DisputeCopilot") makes WiX
#     light.exe fail with exit 204.
echo "Built: $ROOT_DIR/dist/DisputeCopilot-$VERSION.msi"
