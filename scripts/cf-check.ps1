$ErrorActionPreference = "Stop"
$toml = Get-Content "$env:APPDATA\xdg.config\.wrangler\config\default.toml" -Raw
$m = [regex]::Match($toml, 'oauth_token\s*=\s*"([^"]+)"')
if (-not $m.Success) { Write-Output "TOKEN_NOT_FOUND"; exit 1 }
$t = $m.Groups[1].Value
$h = @{ Authorization = "Bearer $t" }
$a = "82164eca9557f63e18984230deac12bc"

Write-Output "=== SUBDOMAIN ==="
try {
  $sub = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$a/workers/subdomain" -Headers $h
  $sub.result | ConvertTo-Json -Depth 3
} catch { Write-Output "ERR subdomain: $($_.Exception.Message)" }

Write-Output "=== WORKER SERVICES ==="
try {
  $svc = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$a/workers/services" -Headers $h
  if ($svc.result.Count -eq 0) { Write-Output "(none)" }
  else { $svc.result | ForEach-Object { Write-Output "service: $($_.id) | default_environment: $($_.default_environment.name)" } }
} catch { Write-Output "ERR services: $($_.Exception.Message)" }

Write-Output "=== D1 DATABASES ==="
try {
  $d1 = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$a/d1/database" -Headers $h
  if ($d1.result.Count -eq 0) { Write-Output "(none)" }
  else { $d1.result | ForEach-Object { Write-Output "d1: $($_.name) | id: $($_.uuid)" } }
} catch { Write-Output "ERR d1: $($_.Exception.Message)" }
