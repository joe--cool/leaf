#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [switch]$Lan,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { '8080' }
$ApiPort = if ($env:API_PORT) { $env:API_PORT } else { '4000' }
$WebRuleName = 'leaf-start-local-web'
$ApiRuleName = 'leaf-start-local-api'

function Show-Banner {
  @'
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
'@
}

function Write-Status([string]$Message) {
  Write-Host "[leaf] $Message"
}

function Get-UrlEncodedValue([string]$Value) {
  return [Uri]::EscapeDataString($Value)
}

function Show-Help {
  @"
Usage: .\start-local.ps1 [-Lan] [-Help]

Starts the local Docker Compose stack for leaf.

Designed for Windows with Docker Desktop or Docker Compose available. LAN mode
uses your machine's .local hostname when your network has Bonjour/mDNS support.

Options:
  -Lan            Expose the web and API services on your local network using
                  your machine's .local hostname and open matching Windows
                  Firewall rules.
  -Help           Show this help text.

Environment overrides:
  WEB_PORT                 Web port. Default: 8080
  API_PORT                 API port. Default: 4000
  HOSTNAME_LOCAL           Override the advertised .local hostname.
  LAN_SUBNET               Optional subnet to scope firewall allow rules when -Lan is used.
  AUTO_BOOTSTRAP_ADMIN     Default: false
  SETUP_TOKEN              Reuse an explicit setup token instead of generating one.
  WEB_ORIGIN               Override the web origin passed to Docker Compose.
  VITE_API_URL             Override the API URL passed to Docker Compose.
  CORS_ORIGIN              Override allowed CORS origins passed to Docker Compose.

Examples:
  .\start-local.ps1
  .\start-local.ps1 -Lan
  `$env:HOSTNAME_LOCAL='leaf-box.local'; .\start-local.ps1 -Lan

Common flows:
  .\start-local.ps1
    Start the stack for use on this machine only.

  .\start-local.ps1 -Lan
    Start the stack, advertise it via your machine's .local hostname, and
    open tagged Windows Firewall rules if PowerShell has permission.

Windows note:
  .local access may require Bonjour or another mDNS responder on your network.
  If another device cannot connect, check Windows Defender Firewall prompts,
  Docker Desktop network access, and whether this machine advertises .local names.

To stop the stack later:
  .\stop-local.ps1

To stop it and also delete the Docker volumes:
  .\stop-local.ps1 -Volumes
"@
}

function Get-MachineLocalHostname {
  $candidate = if ($env:HOSTNAME_LOCAL) {
    $env:HOSTNAME_LOCAL
  } elseif ($env:COMPUTERNAME) {
    $env:COMPUTERNAME
  } else {
    [System.Net.Dns]::GetHostName()
  }

  $candidate = $candidate -replace '\.local$', ''
  $candidate = ($candidate -split '\.')[0]

  if ([string]::IsNullOrWhiteSpace($candidate)) {
    $candidate = 'localhost'
  }

  return "$candidate.local"
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-FirewallRule {
  param(
    [Parameter(Mandatory = $true)][string]$RuleName,
    [Parameter(Mandatory = $true)][string]$Port
  )

  if (-not (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue)) {
    Write-Status 'Windows Firewall cmdlets are unavailable; skipping firewall changes.'
    return
  }

  if (-not (Test-IsAdministrator)) {
    Write-Status 'PowerShell is not elevated; skipping firewall changes.'
    return
  }

  if (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue) {
    return
  }

  $ruleArgs = @{
    DisplayName = $RuleName
    Direction = 'Inbound'
    Action = 'Allow'
    Enabled = 'True'
    Protocol = 'TCP'
    LocalPort = $Port
    Profile = 'Private'
    Description = 'Added by start-local.ps1 for leaf LAN mode.'
  }

  if ($env:LAN_SUBNET) {
    $ruleArgs.RemoteAddress = $env:LAN_SUBNET
    Write-Status "Opening tcp/$Port to $($env:LAN_SUBNET) in Windows Firewall."
  } else {
    Write-Status "Opening tcp/$Port on Private networks in Windows Firewall."
  }

  New-NetFirewallRule @ruleArgs | Out-Null
}

function Invoke-DockerComposeUp {
  param(
    [Parameter(Mandatory = $true)][hashtable]$ComposeEnv
  )

  $originalValues = @{}
  foreach ($key in $ComposeEnv.Keys) {
    $originalValues[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $ComposeEnv[$key], 'Process')
  }

  try {
    & docker compose up --build -d
  }
  finally {
    foreach ($key in $ComposeEnv.Keys) {
      [Environment]::SetEnvironmentVariable($key, $originalValues[$key], 'Process')
    }
  }
}

if ($Help) {
  Show-Help
  exit 0
}

Set-Location $RootDir
Show-Banner
Write-Host

$autoBootstrapAdmin = if ($env:AUTO_BOOTSTRAP_ADMIN) { $env:AUTO_BOOTSTRAP_ADMIN } else { 'false' }
$setupTokenValue = if ($env:SETUP_TOKEN) { $env:SETUP_TOKEN } else { '' }

if ($Lan) {
  $hostnameLocalValue = Get-MachineLocalHostname
  Write-Status "LAN mode enabled. Preparing .local access for $hostnameLocalValue."
  Write-Status 'If another device cannot connect, check Windows Firewall prompts, Docker Desktop network access, and Bonjour/mDNS support.'
  Ensure-FirewallRule -RuleName $WebRuleName -Port $WebPort
  Ensure-FirewallRule -RuleName $ApiRuleName -Port $ApiPort
  $webOriginDefault = "http://$hostnameLocalValue:$WebPort"
  $viteApiUrlDefault = "http://$hostnameLocalValue:$ApiPort"
} else {
  $hostnameLocalValue = 'localhost'
  Write-Status 'LAN mode disabled. Services will stay local to this machine.'
  $webOriginDefault = "http://localhost:$WebPort"
  $viteApiUrlDefault = "http://localhost:$ApiPort"
}

$webOriginValue = if ($env:WEB_ORIGIN) { $env:WEB_ORIGIN } else { $webOriginDefault }
$viteApiUrlValue = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { $viteApiUrlDefault }
$corsOriginValue = if ($env:CORS_ORIGIN) { $env:CORS_ORIGIN } else { $webOriginValue }

if ($autoBootstrapAdmin -ne 'true' -and [string]::IsNullOrWhiteSpace($setupTokenValue)) {
  $setupTokenValue = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Minimum 0 -Maximum 16) })
  Write-Status 'Generated a first-run setup token for secure admin onboarding.'
}

Write-Status 'Starting Docker Compose. Images will rebuild if needed.'
Invoke-DockerComposeUp -ComposeEnv @{
  WEB_ORIGIN = $webOriginValue
  VITE_API_URL = $viteApiUrlValue
  CORS_ORIGIN = $corsOriginValue
  AUTO_BOOTSTRAP_ADMIN = $autoBootstrapAdmin
  SETUP_TOKEN = $setupTokenValue
}

Write-Host
Write-Status 'leaf is up.'
Write-Status "Web: $webOriginValue"
Write-Status "API: $viteApiUrlValue"
Write-Status "CORS origins: $corsOriginValue"
if ($Lan) {
  Write-Status "LAN access is enabled via $hostnameLocalValue."
} else {
  Write-Status 'LAN access is off; the stack is configured for local use only.'
}
if (-not [string]::IsNullOrWhiteSpace($setupTokenValue) -and $autoBootstrapAdmin -ne 'true') {
  Write-Status "Setup token: $setupTokenValue"
  Write-Status "Bootstrap link: $webOriginValue/dashboard?setupToken=$(Get-UrlEncodedValue $setupTokenValue)"
}
Write-Status 'When you are done, stop the stack with .\stop-local.ps1'
Write-Status 'Use .\stop-local.ps1 -Volumes only if you want to delete the local database and other persisted Docker data.'
