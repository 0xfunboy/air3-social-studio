#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v gh >/dev/null || { echo "Installare GitHub CLI e autenticarsi con gh auth login."; exit 1; }
if [[ -z "${1:-}" ]]; then echo "Uso: bash scripts/publish-repository.sh owner/repository [--public|--private]"; exit 1; fi
visibility="${2:---private}"
[[ "$visibility" == --public || "$visibility" == --private ]] || exit 1
if [[ ! -d .git ]]; then git init -b main; git add .; git commit -m "Initial AIR3 Social Studio implementation"; fi
if git ls-files | grep -E '(^|/)\.env$|(^|/)(node_modules|data|backups)/'; then echo "Rimuovere i file sensibili dall'indice prima di pubblicare."; exit 1; fi
gh repo create "$1" "$visibility" --source=. --remote=origin --push
