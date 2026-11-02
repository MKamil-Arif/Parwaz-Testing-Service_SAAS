# Enables TCP/IP on port 1433 for a local SQL Server instance so Prisma/Next.js can connect.
# Usage (from the project folder, normal PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\enable-sqlserver-tcp.ps1
# Windows will show a UAC prompt; the change requires administrator rights.

param([string]$Instance = "SQLEXPRESS", [int]$Port = 1433)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Requesting administrator permission..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Instance $Instance -Port $Port"
  exit
}

$root = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server"
$id = (Get-ItemProperty "$root\Instance Names\SQL").$Instance
if (-not $id) { Write-Host "SQL Server instance '$Instance' not found." -ForegroundColor Red; exit 1 }

$tcp = "$root\$id\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty $tcp -Name Enabled -Value 1
Set-ItemProperty "$tcp\IPAll" -Name TcpPort -Value "$Port"
Set-ItemProperty "$tcp\IPAll" -Name TcpDynamicPorts -Value ""

$service = if ($Instance -eq "MSSQLSERVER") { "MSSQLSERVER" } else { "MSSQL`$$Instance" }
Write-Host "Restarting $service ..."
Restart-Service $service -Force
Start-Sleep -Seconds 5

$enabled = (Get-ItemProperty $tcp).Enabled
$listening = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
Write-Host ""
Write-Host "TCP/IP enabled: $enabled   Listening on $Port`: $listening" -ForegroundColor $(if ($listening) { "Green" } else { "Red" })
if ($listening) { Write-Host "Done. You can close this window." -ForegroundColor Green }
