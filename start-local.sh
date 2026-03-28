#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${WEB_PORT:-8080}"
API_PORT="${API_PORT:-4000}"
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

url_encode() {
  local input="$1"
  local output=""
  local i char

  for ((i = 0; i < ${#input}; i++)); do
    char="${input:i:1}"
    case "$char" in
      [a-zA-Z0-9.~_-])
        output+="$char"
        ;;
      *)
        printf -v output '%s%%%02X' "$output" "'$char"
        ;;
    esac
  done

  printf '%s' "$output"
}

print_help_examples() {
  cat <<EOF

Common flows:
  ./start-local.sh
    Start the stack for use on this machine only.

  ./start-local.sh --lan
    Start the stack, advertise it via your machine's .local hostname, and
    open tagged ufw rules when ufw is present and active.

macOS note:
  LAN mode usually works without extra firewall changes. If other devices
  cannot connect, check System Settings > Network > Firewall and any Docker
  networking prompts on this machine.

To stop the stack later:
  ./stop-local.sh

To stop it and also delete the Docker volumes:
  ./stop-local.sh --volumes
EOF
}

print_help() {
  cat <<EOF
Usage: ./start-local.sh [options]

Starts the local Docker Compose stack for leaf.

Designed for macOS and Linux systems with Docker Compose available. LAN mode
uses whatever mDNS and firewall tooling your machine already provides.

Options:
  --lan            Expose the web and API services on your local network using
                   your machine's .local hostname and open matching ufw rules.
  -h, --help       Show this help text.

Environment overrides:
  WEB_PORT                 Web port. Default: 8080
  API_PORT                 API port. Default: 4000
  HOSTNAME_LOCAL           Override the advertised .local hostname.
  LAN_SUBNET               Optional subnet to scope ufw allow rules when --lan is used.
  AUTO_BOOTSTRAP_ADMIN     Default: false
  SETUP_TOKEN              Reuse an explicit setup token instead of generating one.
  WEB_ORIGIN               Override the web origin passed to Docker Compose.
  VITE_API_URL             Override the API URL passed to Docker Compose.
  CORS_ORIGIN              Override allowed CORS origins passed to Docker Compose.

Examples:
  ./start-local.sh
  ./start-local.sh --lan
  HOSTNAME_LOCAL=leaf-box.local ./start-local.sh --lan
EOF
  print_help_examples
}

resolve_machine_name() {
  local candidate=""

  if [[ -n "${HOSTNAME_LOCAL:-}" ]]; then
    candidate="${HOSTNAME_LOCAL}"
  elif [[ -n "${HOSTNAME:-}" ]]; then
    candidate="${HOSTNAME}"
  elif command -v hostname >/dev/null 2>&1; then
    candidate="$(hostname)"
  fi

  candidate="${candidate%.local}"
  candidate="${candidate%%.*}"

  if [[ -z "${candidate}" ]]; then
    candidate="localhost"
  fi

  printf '%s.local\n' "${candidate}"
}

ufw_is_active() {
  command -v ufw >/dev/null 2>&1 && run_privileged ufw status | grep -q "^Status: active"
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

enable_mdns_if_needed() {
  if [[ "${OS_NAME}" == "Darwin" ]]; then
    print_status "mDNS is built into macOS; .local hostname should already be advertised."
    return 0
  fi

  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files avahi-daemon.service >/dev/null 2>&1; then
    print_status "Ensuring avahi-daemon is running for .local hostname discovery."
    run_privileged systemctl enable --now avahi-daemon >/dev/null
    return 0
  fi

  print_status "No Avahi/systemd integration detected; .local access depends on your system's mDNS setup."
}

ensure_ufw_rule() {
  local port="$1"
  local comment="$2"

  if ! command -v ufw >/dev/null 2>&1; then
    print_status "ufw is not installed on this system; skipping firewall changes."
    return 0
  fi

  if ! ufw_is_active; then
    print_status "ufw is not active; skipping firewall changes."
    return 0
  fi

  if run_privileged ufw status | grep -Fq "# ${comment}"; then
    return 0
  fi

  if [[ -n "${LAN_SUBNET:-}" ]]; then
    print_status "Opening tcp/${port} to ${LAN_SUBNET} in ufw."
    run_privileged ufw allow from "${LAN_SUBNET}" to any port "${port}" proto tcp comment "${comment}"
  else
    print_status "Opening tcp/${port} in ufw."
    run_privileged ufw allow in proto tcp to any port "${port}" comment "${comment}"
  fi
}

EXPOSE_LAN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lan)
      EXPOSE_LAN=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run ./start-local.sh --help for usage." >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"
print_banner
echo

AUTO_BOOTSTRAP_ADMIN="${AUTO_BOOTSTRAP_ADMIN:-false}"
SETUP_TOKEN_VALUE="${SETUP_TOKEN:-}"

if [[ "${EXPOSE_LAN}" == "true" ]]; then
  HOSTNAME_LOCAL_VALUE="$(resolve_machine_name)"
  print_status "LAN mode enabled. Preparing .local access for ${HOSTNAME_LOCAL_VALUE}."
  enable_mdns_if_needed
  ensure_ufw_rule "${WEB_PORT}" "${WEB_RULE_COMMENT}"
  ensure_ufw_rule "${API_PORT}" "${API_RULE_COMMENT}"
  if [[ "${OS_NAME}" == "Darwin" ]]; then
    print_status "If another device cannot connect, check macOS Firewall settings and any Docker network permission prompts."
  fi
  WEB_ORIGIN_DEFAULT="http://${HOSTNAME_LOCAL_VALUE}:${WEB_PORT}"
  VITE_API_URL_DEFAULT="http://${HOSTNAME_LOCAL_VALUE}:${API_PORT}"
else
  HOSTNAME_LOCAL_VALUE="localhost"
  print_status "LAN mode disabled. Services will stay local to this machine."
  WEB_ORIGIN_DEFAULT="http://localhost:${WEB_PORT}"
  VITE_API_URL_DEFAULT="http://localhost:${API_PORT}"
fi

WEB_ORIGIN_VALUE="${WEB_ORIGIN:-$WEB_ORIGIN_DEFAULT}"
VITE_API_URL_VALUE="${VITE_API_URL:-$VITE_API_URL_DEFAULT}"
CORS_ORIGIN_VALUE="${CORS_ORIGIN:-$WEB_ORIGIN_VALUE}"

if [[ "$AUTO_BOOTSTRAP_ADMIN" != "true" && -z "$SETUP_TOKEN_VALUE" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    SETUP_TOKEN_VALUE="$(openssl rand -hex 24)"
  else
    SETUP_TOKEN_VALUE="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  print_status "Generated a first-run setup token for secure admin onboarding."
fi

print_status "Starting Docker Compose. Images will rebuild if needed."
WEB_ORIGIN="$WEB_ORIGIN_VALUE" \
VITE_API_URL="$VITE_API_URL_VALUE" \
CORS_ORIGIN="$CORS_ORIGIN_VALUE" \
AUTO_BOOTSTRAP_ADMIN="$AUTO_BOOTSTRAP_ADMIN" \
SETUP_TOKEN="$SETUP_TOKEN_VALUE" \
docker compose up --build -d

echo
print_status "leaf is up."
print_status "Web: ${WEB_ORIGIN_VALUE}"
print_status "API: ${VITE_API_URL_VALUE}"
print_status "CORS origins: ${CORS_ORIGIN_VALUE}"
if [[ "${EXPOSE_LAN}" == "true" ]]; then
  print_status "LAN access is enabled via ${HOSTNAME_LOCAL_VALUE}."
else
  print_status "LAN access is off; the stack is configured for local use only."
fi
if [[ -n "$SETUP_TOKEN_VALUE" && "$AUTO_BOOTSTRAP_ADMIN" != "true" ]]; then
  print_status "Setup token: ${SETUP_TOKEN_VALUE}"
  print_status "Bootstrap link: ${WEB_ORIGIN_VALUE}/dashboard?setupToken=$(url_encode "$SETUP_TOKEN_VALUE")"
fi
print_status "When you're done, stop the stack with ./stop-local.sh"
print_status "Use ./stop-local.sh --volumes only if you want to delete the local database and other persisted Docker data."
