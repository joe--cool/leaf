#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [switch]$Volumes,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
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

function Show-Help {
  @"
Usage: .\stop-local.ps1 [-Volumes] [-Help]

Stops the local Docker Compose stack for leaf.

Designed for Windows with Docker Desktop or Docker Compose available.

Options:
  -Volumes        Also delete Docker volumes created by the stack. Use this
                  when you want a clean reset, including the local database.
                  Skip it if you want your current data to still be there
                  next time you start the stack.
  -Help           Show this help text.

This script removes only Windows Firewall rules that were tagged by .\start-local.ps1.

Examples:
  .\stop-local.ps1
  .\stop-local.ps1 -Volumes
"@
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Remove-FirewallRule {
  param(
    [Parameter(Mandatory = $true)][string]$RuleName
  )

  if (-not (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue)) {
    Write-Status 'Windows Firewall cmdlets are unavailable; no firewall cleanup was needed.'
    return
  }

  if (-not (Test-IsAdministrator)) {
    Write-Status 'PowerShell is not elevated; skipping firewall cleanup.'
    return
  }

  $rules = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
  if (-not $rules) {
    return
  }

  Write-Status "Removing tagged Windows Firewall rules for $RuleName."
  $rules | Remove-NetFirewallRule
}

if ($Help) {
  Show-Help
  exit 0
}

Set-Location $RootDir
Show-Banner
Write-Host

if ($Volumes) {
  Write-Status 'Stopping Docker Compose and deleting persisted Docker volumes.'
  & docker compose down -v
} else {
  Write-Status 'Stopping Docker Compose and leaving persisted Docker volumes intact.'
  & docker compose down
}

Remove-FirewallRule -RuleName $WebRuleName
Remove-FirewallRule -RuleName $ApiRuleName

Write-Host
Write-Status 'leaf is down.'
if ($Volumes) {
  Write-Status 'Docker containers are stopped and volumes were deleted.'
  Write-Status 'Use this when you want a clean slate; persisted data such as the local database is gone.'
} else {
  Write-Status 'Docker containers are stopped and volumes were preserved.'
  Write-Status 'Use this when you want to keep your current local data for the next start.'
}
Write-Status 'Any Windows Firewall rules tagged by .\start-local.ps1 were cleaned up when possible.'
Write-Status 'Start it again anytime with .\start-local.ps1'
Write-Status 'Use .\start-local.ps1 -Lan if you want the stack reachable at your machine''s .local hostname.'
