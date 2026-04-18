#!/usr/bin/env bash
# ============================================================
# VoyageAI — Mac/Linux Launch Script
# ============================================================

set -e
cd "$(dirname "$0")"

PORT=8080
URL="http://localhost:$PORT"

echo ""
echo "  ==================================================="
echo "    VoyageAI - Starting Local Server"
echo "  ==================================================="
echo ""

# Cross-platform open command
open_browser() {
  if command -v open >/dev/null 2>&1; then
    (sleep 1 && open "$URL") &
  elif command -v xdg-open >/dev/null 2>&1; then
    (sleep 1 && xdg-open "$URL") &
  fi
}

if command -v python3 >/dev/null 2>&1; then
  echo "✓ Python 3 found — starting server on $URL"
  echo ""
  echo "  Open $URL in your browser"
  echo "  Press Ctrl+C to stop"
  echo ""
  open_browser
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  echo "✓ Python found — starting server on $URL"
  open_browser
  python -m http.server "$PORT"
elif command -v node >/dev/null 2>&1; then
  echo "✓ Node.js found — starting server with npx"
  open_browser
  npx serve -p "$PORT" .
else
  echo "❌ Neither Python nor Node.js is installed."
  echo ""
  echo "Please install one of:"
  echo "  - Python 3: https://www.python.org/downloads/"
  echo "  - Node.js:  https://nodejs.org/"
  echo ""
  echo "Or just open index.html directly in your browser."
  exit 1
fi
