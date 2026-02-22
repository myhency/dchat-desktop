#!/bin/bash
set -e

PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJ_ROOT/build/backend-node_modules"
ELECTRON_VERSION=$(node -e "console.log(require('$PROJ_ROOT/node_modules/electron/package.json').version)")

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Extract backend production dependencies only (@dchat/shared excluded — type-only)
node -e "
  const pkg = require('$PROJ_ROOT/packages/backend/package.json');
  const deps = { ...pkg.dependencies };
  delete deps['@dchat/shared'];
  const mini = { name: 'dchat-backend-deps', version: '1.0.0', dependencies: deps };
  require('fs').writeFileSync('$BUILD_DIR/package.json', JSON.stringify(mini, null, 2));
"

cd "$BUILD_DIR"
npm install --omit=dev

# Rebuild better-sqlite3 against Electron headers
npx @electron/rebuild -m "$BUILD_DIR" -v "$ELECTRON_VERSION" -t prod -o better-sqlite3

rm -f "$BUILD_DIR/package.json" "$BUILD_DIR/package-lock.json"
