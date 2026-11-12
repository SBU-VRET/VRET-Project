# One-time Windows-side setup for the LAM Audio2Expression Colab automation.
# Enables WSL2 and installs Ubuntu if either is missing, then tells you to
# run setup_wsl.sh inside it.
#
# Run this from an elevated (Run as Administrator) PowerShell window --
# enabling the WSL optional feature requires admin rights.
#
# What this CANNOT do: enable hardware virtualization in your BIOS/UEFI
# firmware. That's a firmware setting, not a Windows one, and has to be
# turned on manually (reboot into firmware setup, usually under a name
# like "Intel VT-x", "SVM Mode", or "Virtualization Technology"). If WSL
# still fails after this script with an error mentioning virtualization,
# that's the next thing to check.

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Output "This needs to run elevated. Right-click PowerShell -> Run as Administrator, then re-run this script."
    exit 1
}

Write-Output "== Checking WSL status =="
$wslWorks = $true
try {
    wsl --status | Out-Null
} catch {
    $wslWorks = $false
}

if (-not $wslWorks) {
    Write-Output "WSL isn't set up yet -- enabling it (this installs the 'Virtual Machine Platform' feature)."
    wsl --install --no-distribution
    Write-Output ""
    Write-Output "A RESTART IS LIKELY REQUIRED before continuing. Restart your computer, then re-run this script."
    exit 0
} else {
    Write-Output "WSL is already enabled."
}

Write-Output "== Checking for an installed Ubuntu distro =="
$distros = wsl --list --quiet 2>$null
$hasUbuntu = $distros -match "Ubuntu"

if (-not $hasUbuntu) {
    Write-Output "Ubuntu not found -- installing it now (this can take a few minutes)."
    wsl --install -d Ubuntu
    Write-Output ""
    Write-Output "Ubuntu is installing. It may prompt you to create a Unix username/password on first launch --"
    Write-Output "if so, open a terminal and run 'wsl -d Ubuntu' once to finish that, then continue below."
} else {
    Write-Output "Ubuntu is already installed."
}

Write-Output ""
Write-Output "== Next step =="
Write-Output "Open WSL and run the second setup script:"
Write-Output ""
Write-Output "  wsl -d Ubuntu"
Write-Output "  cd /mnt/c/Users/$env:USERNAME/Downloads/VRET/team/fahim/audio2expression"
Write-Output "  bash setup_wsl.sh"
