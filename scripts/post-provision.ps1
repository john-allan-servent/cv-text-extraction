$ErrorActionPreference = 'Stop'

$uri = azd env get-value SERVICE_API_URI 2>$null
if (-not $uri) { return }

Write-Host ''
Write-Host 'Provisioning complete. Finish the Entra ID setup (see README.md, "Entra ID app registrations"):'
Write-Host "  SPA redirect URI to add : $uri"
Write-Host "  SPA app (client) ID     : $(azd env get-value SPA_CLIENT_ID 2>$null)"
Write-Host ''
