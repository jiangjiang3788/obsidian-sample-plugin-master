# fix-settings-imports.ps1
try {
    $target = "src/features/settings/ui/SettingsTab.tsx"
    if (-Not (Test-Path $target)) { throw "找不到 $target" }

    (Get-Content $target) `
      -replace "\.\/DashboardConfigForm", "@features/dashboard/ui" |
      Set-Content $target -NoNewline
}
catch { Write-Host "❌ 修正失败：" $_.Exception.Message -ForegroundColor Red; exit 1 }
