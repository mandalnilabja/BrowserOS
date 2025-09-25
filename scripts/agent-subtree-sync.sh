
# ------------------ Explanation ------------------
# This is a bash script called `agent-subtree-sync.sh` that synchronizes updates from a "Nemo-agent" repository into the current repository using Git subtrees. Here's what it does:

# ## Main Purpose
# The script pulls updates from the Nemo-agent repository into the current repository while preserving the full commit history (no squashing). It appears to be part of a project called "Nemo" that includes the Nemo-agent as a subtree.

# ## Key Functions

# 1. **Remote Management**: Ensures a git remote exists pointing to the Nemo-agent repository
# 2. **Fetching Updates**: Fetches the specified branch/tag and tags from the remote
# 3. **Subtree Synchronization**: Uses `git subtree pull` to merge updates into a specified directory (default: `./agent`)
# 4. **Commit Tracking**: Creates commits with markers to track what was last synced
# 5. **Changelog Generation**: Shows a concise changelog of changes since the last sync

# ## Usage
# ```bash
# ./agent-subtree-sync.sh [REF] [PREFIX] [REMOTE_NAME]
# ```

# - **REF**: Branch or tag to sync (default: `main`)
# - **PREFIX**: Directory to sync into (default: `agent`)
# - **REMOTE_NAME**: Name of the git remote (default: `agent`)

# ## Additional Features
# - The script includes environment variable support (`AGENT_REMOTE_URL`) for custom remote URLs
# - It tracks the last synced commit and can show incremental changes
# - There's commented-out initialization code at the bottom for setting up the subtree initially

# This is essentially a utility script for keeping a submodule-like dependency (Nemo-agent) synchronized within the main Nemo project while maintaining full history for better traceability.




#!/usr/bin/env bash
set -euo pipefail

# Sync updates from Nemo-agent into Nemo via git subtree (no --squash).
#
# This script:
#   1) fetches the agent remote
#   2) pulls a branch or tag into ./agent (or custom prefix)
#   3) commits with a message containing the upstream SHA
#   4) prints a concise changelog range (based on last sync marker)
#
# Usage:
#   ./agent-subtree-sync.sh [REF] [PREFIX] [REMOTE_NAME]
# Examples:
#   ./agent-subtree-sync.sh main
#   ./agent-subtree-sync.sh v0.23.0 agent agent
#
# Tip: Set defaults via env:
#   AGENT_REMOTE_URL=git@github.com:Nemo-ai/Nemo-agent.git ./agent-subtree-sync.sh main

REF="${1:-main}"
PREFIX="${2:-agent}"
REMOTE_NAME="${3:-agent}"
REMOTE_URL="${AGENT_REMOTE_URL:-https://github.com/Nemo-ai/Nemo-agent.git}"

# Ensure remote exists & points to REMOTE_URL
echo ">>> Ensuring remote '$REMOTE_NAME' -> $REMOTE_URL"
git remote add "$REMOTE_NAME" "$REMOTE_URL" 2>/dev/null || true
git remote set-url "$REMOTE_NAME" "$REMOTE_URL"

# Fetch branch/tag & tags for changelog
echo ">>> Fetching $REMOTE_NAME $REF"
git fetch "$REMOTE_NAME" "$REF" --tags

# Resolve upstream SHA we’re syncing to
UPSTREAM_REF="$REMOTE_NAME/$REF"
UPSTREAM_SHA="$(git rev-parse "$UPSTREAM_REF")"
echo ">>> Upstream target: $UPSTREAM_REF @ $UPSTREAM_SHA"

# Find the last upstream SHA we synced (from commit messages we write below)
# Falls back to none (full log) if not found.
LAST_MARK="$(git log -n 1 --grep="subtree(sync): $PREFIX ->" --pretty=format:%s -- 2>/dev/null || true)"
PREV_SHA=""
if [[ -n "${LAST_MARK}" ]]; then
  # message format: "subtree(sync): agent -> <sha>"
  PREV_SHA="$(sed -E 's/.* -> ([0-9a-f]{7,40}).*/\1/' <<<"$LAST_MARK" || true)"
fi

# Do the subtree pull (NO --squash)
echo ">>> Pulling subtree into '$PREFIX' from $UPSTREAM_REF (full history)"
git subtree pull --prefix="$PREFIX" "$REMOTE_NAME" "$REF" -m "Update Nemo-agent: $PREFIX -> $UPSTREAM_SHA"

# Show a concise changelog range if we have a previous SHA
echo ">>> Changelog upstream ($([[ -n "$PREV_SHA" ]] && echo "$PREV_SHA.." )$UPSTREAM_SHA):"
if [[ -n "$PREV_SHA" ]]; then
  # Print upstream commits between PREV_SHA and UPSTREAM_SHA
  git log --no-merges --pretty="* %h %s" "$PREV_SHA..$UPSTREAM_SHA" --first-parent "$UPSTREAM_REF" || true
else
  # First sync: just show the last 30 upstream commits for context
  git log --no-merges --pretty="* %h %s" "$UPSTREAM_REF" -n 30 || true
fi

echo ">>> Done. Commit created with upstream marker."

# -----------------------------------------
# Below is the code for init subtree
# -----------------------------------------

# #!/usr/bin/env bash
# set -euo pipefail

# # One-time initialization: add Nemo-agent as a subtree under ./agent (default)
# # Usage:
# #   ./agent-subtree-init.sh [REMOTE_URL] [REF] [PREFIX]
# # Example:
# #   ./agent-subtree-init.sh https://github.com/Nemo-ai/Nemo-agent.git main agent

# REMOTE_URL="${1:-https://github.com/Nemo-ai/Nemo-agent.git}"
# REF="${2:-main}"
# PREFIX="${3:-agent}"
# REMOTE_NAME="agent"

# echo ">>> Ensuring remote '$REMOTE_NAME' -> $REMOTE_URL"
# git remote add "$REMOTE_NAME" "$REMOTE_URL" 2>/dev/null || true
# git remote set-url "$REMOTE_NAME" "$REMOTE_URL"

# echo ">>> Fetching $REMOTE_NAME $REF"
# git fetch "$REMOTE_NAME" "$REF" --tags

# # IMPORTANT: no --squash (we keep full upstream history in Nemo)
# echo ">>> Adding subtree into '$PREFIX' from $REMOTE_NAME/$REF"
# git subtree add --prefix="$PREFIX" "$REMOTE_NAME" "$REF" -m "subtree(init): add $PREFIX from $REMOTE_NAME/$REF (full history)"
# echo ">>> Done."


