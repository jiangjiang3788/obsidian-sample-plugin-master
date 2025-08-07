try {
  # 1) 目标目录
  $dirs = @(
    "src/features/settings/ui",
    "src/features/dashboard/ui",
    "src/shared/styles"
  )
  $dirs | ForEach-Object {
    if (!(Test-Path $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
  }

  # 2) 源-目标映射   ← 已改为 .ts / .tsx 混合真实文件名
  $map = @{
    "src/ui/SettingsTab.ts"         = "src/features/settings/ui/SettingsTab.ts";
    "src/ui/InputSettingsTable.tsx" = "src/features/settings/ui/InputSettingsTable.tsx";
    "src/ui/DashboardConfigForm.tsx"= "src/features/dashboard/ui/DashboardConfigForm.tsx";
    "src/ui/mui-theme.ts"           = "src/shared/styles/mui-theme.ts";
  }

  # 3) 循环移动
  foreach ($kv in $map.GetEnumerator()) {
    $src = $kv.Key; $dst = $kv.Value
    if (!(Test-Path $src)) { throw "找不到文件 $src" }
    $dstDir = Split-Path $dst
    if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Move-Item -Path $src -Destination $dst -Force
  }
}
catch {
  Write-Host "❌ UI 文件搬移失败：" $_.Exception.Message -ForegroundColor Red
  exit 1
}
