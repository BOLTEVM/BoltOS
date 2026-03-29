# Boltwallet Extension Synchronization Script
# Copies build assets from apps/web/dist to apps/extension/dist

$WebDist = "../../apps/web/dist"
$ExtDist = "./dist"

Write-Host "--- Boltwallet Sync: Scaling Build Assets ---" -ForegroundColor Blue

if (!(Test-Path $WebDist)) {
    Write-Error "Web Dist not found. Run 'pnpm build' in apps/web first."
    exit 1
}

# 1. Clean and Prepare
if (!(Test-Path $ExtDist)) {
    New-Item -ItemType Directory -Path $ExtDist -Force
}

# 2. Copy core assets
Write-Host "Syncing index.html and logos..."
Copy-Item "$WebDist/index.html" "$ExtDist/index.html" -Force
Copy-Item "$WebDist/*.png" "$ExtDist/" -Force
Copy-Item "$WebDist/favicon.png" "$ExtDist/logo.png" -Force

# 3. Copy bundled assets
if (!(Test-Path "$ExtDist/assets")) {
    New-Item -ItemType Directory -Path "$ExtDist/assets" -Force
}
Write-Host "Syncing JS/CSS bundles..."
Copy-Item "$WebDist/assets/*" "$ExtDist/assets/" -Recurse -Force

Write-Host "--- Boltwallet Sync: COMPLETED ---" -ForegroundColor Green
Write-Host "The extension dist is now synchronized with current source logic."
Write-Host "ACTION REQUIRED: Reload the extension in chrome://extensions" -ForegroundColor Yellow
