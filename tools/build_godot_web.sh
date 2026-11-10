#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
export XDG_DATA_HOME="$project_root/.toolchain/share"
export XDG_CONFIG_HOME="$project_root/.toolchain/config"
export XDG_CACHE_HOME="$project_root/.toolchain/cache"
mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" godot/build/web
touch godot/build/.gdignore
if [[ "$(godot --version)" != 4.6.3.* ]]; then
  echo "Use Godot 4.6.3 para este export Web." >&2
  exit 1
fi
if [[ ! -f "$XDG_DATA_HOME/godot/export_templates/4.6.3.stable/web_nothreads_release.zip" ]]; then
  python3 tools/setup_godot_web.py
fi
# Atlases and catalogs are committed. Regenerate only after changing source assets:
# python3 tools/export_godot_assets.py
godot --headless --path godot --editor --import
godot --headless --path godot --export-release Web build/web/index.html
echo "Web pronta: npm start e http://localhost:3000/godot/"
