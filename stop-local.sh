#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_RULE_COMMENT="leaf-start-local-web"
API_RULE_COMMENT="leaf-start-local-api"
OS_NAME="$(uname -s)"

print_banner() {
  cat <<'EOF'
,--,
,--.'|                           .--.,
|  | :                         ,--.'  \
:  : '                         |  | /\/
|  ' |      ,---.     ,--.--.  :  : :
'  | |     /     \   /       \ :  | |-,
|  | :    /    /  | .--.  .-. ||  : :/|
'  : |__ .    ' / |  \__\/: . .|  |  .'
|  | '.'|'   ;   /|  ," .--.; |'  : '
;  :    ;'   |  / | /  /  ,.  ||  | |
|  ,   / |   :    |;  :   .'   \  : \
 ---`-'   \   \  / |  ,     .-./  |,'
           `----'   `--`---'   `--'
EOF
}

print_status() {
  printf '[leaf] %s\n' "$1"
}

print_help() {
  cat <<EOF
Usage: ./stop-local.sh [options]

Stops the local Docker Compose stack for leaf.

Designed for macOS and Linux systems with Docker Compose available.

Options:
  --volumes        Also delete Docker volumes created by the stack. Use this
                   when you want a clean reset, including the local database.
                   Skip it if you want your current data to still be there
                   next time you start the stack.
  -h, --help       Show this help text.

This script removes only ufw rules that were tagged by ./start-local.sh.

Examples:
  ./stop-local.sh
  ./stop-local.sh --volumes
EOF
}

run_privileged() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

ufw_is_active() {
  command -v ufw >/dev/null 2>&1 && run_privileged ufw status | grep -q "^Status: active"
}

delete_ufw_rules_by_comment() {
  local comment="$1"
  local numbers=""
  local rule

  if ! ufw_is_active; then
    return 0
  fi

  numbers="$(
    run_privileged ufw status numbered | sed -n "s/^\\[ *\\([0-9][0-9]*\\)\\].*# ${comment}\$/\\1/p" | sort -rn
  )"

  if [[ -z "${numbers}" ]]; then
    return 0
  fi

  print_status "Removing tagged ufw rules for ${comment}."
  while IFS= read -r rule; do
    [[ -z "${rule}" ]] && continue
    run_privileged ufw --force delete "${rule}"
  done <<EOF
${numbers}
EOF
}

print_shutdown_summary() {
  if [[ "${REMOVE_VOLUMES}" == "true" ]]; then
    print_status "Docker containers are stopped and volumes were deleted."
    print_status "Use this when you want a clean slate; persisted data such as the local database is gone."
  else
    print_status "Docker containers are stopped and volumes were preserved."
    print_status "Use this when you want to keep your current local data for the next start."
  fi

  if command -v ufw >/dev/null 2>&1; then
    print_status "Any ufw rules tagged by ./start-local.sh were cleaned up."
  else
    if [[ "${OS_NAME}" == "Darwin" ]]; then
      print_status "No ufw cleanup was needed on macOS."
    else
      print_status "No ufw cleanup was needed on this system."
    fi
  fi
}

REMOVE_VOLUMES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --volumes)
      REMOVE_VOLUMES=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run ./stop-local.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"
print_banner
echo

compose_args=(down)
if [[ "${REMOVE_VOLUMES}" == "true" ]]; then
  compose_args+=(-v)
fi

if [[ "${REMOVE_VOLUMES}" == "true" ]]; then
  print_status "Stopping Docker Compose and deleting persisted Docker volumes."
else
  print_status "Stopping Docker Compose and leaving persisted Docker volumes intact."
fi
docker compose "${compose_args[@]}"

delete_ufw_rules_by_comment "${WEB_RULE_COMMENT}"
delete_ufw_rules_by_comment "${API_RULE_COMMENT}"

echo
print_status "leaf is down."
print_shutdown_summary
print_status "Start it again anytime with ./start-local.sh"
print_status "Use ./start-local.sh --lan if you want the stack reachable at your machine's .local hostname."
