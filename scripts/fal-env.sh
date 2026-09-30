#!/usr/bin/env bash
# Cursor/Dirt Cat: reuse Santa Cinema / legacy fal Keychain until a dedicated Dirt Cat slot exists.
set -euo pipefail
source "$HOME/Desktop/scripts/load-fal-keychain.sh"
export NODE_PATH="$HOME/Desktop/scripts/fal-node/node_modules${NODE_PATH:+:$NODE_PATH}"
export PATH="/opt/homebrew/bin:$PATH"
echo "fal ready for Dirt Cat via Santa Cinema/legacy Keychain (no dedicated Dirt Cat slot yet)"
echo "smoke: node $HOME/Desktop/scripts/fal-smoke.mjs"
echo "Do NOT use ~/.codex codex-fal for live Dirt Cat (ACTION_TIME_BLOCKED)."
